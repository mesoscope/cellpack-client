import { afterEach, describe, expect, it, vi } from "vitest";
import { useRecipeStore } from "../state/store";
import { EditableField, ViewableRecipe } from "../types";
import { JOB_STATUS } from "../constants/aws";

/* ---------- Test data ---------- */

export const editableFieldPeroxisomeRadius: EditableField = {
    id: "ef-peroxisome-radius",
    name: "Peroxisome radius",
    data_type: "number",
    input_type: "slider",
    description: "Radius of peroxisome (single_sphere)",
    path: "objects.peroxisome.radius",
    min: 0.1,
    max: 10,
};

export const editableFieldPeroxisomeCount: EditableField = {
    id: "ef-peroxisome-count",
    name: "Peroxisome count",
    data_type: "number",
    input_type: "slider",
    description: "Number of peroxisomes inside the membrane",
    path: "composition.membrane.regions.interior[2].count",
    min: 0,
    max: 1000,
};

export const viewableRecipeR1: ViewableRecipe = {
    name: "Recipe R1",
    version: "1.0",
    format_version: "1.1.0",
    bounding_box: [
        [0, 0, 0],
        [100, 100, 100],
    ],
    objects: {
        nucleus: { name: "nucleus", type: "sphere", radius: 10 },
        peroxisome: {
            name: "peroxisome",
            packing_mode: "gradient",
            partners: { all_partners: [] },
            type: "single_sphere",
            gradient: "struct_gradient",
            radius: 2.37,
            jitter_attempts: 300,
            color: [0, 1, 0],
        },
        membrane_mesh: { name: "membrane_mesh", type: "mesh" },
    },
    composition: {
        comp1: { name: "base", count: 1, object: "nucleus" },
        membrane: {
            name: "membrane",
            count: 1,
            object: "membrane_mesh",
            regions: {
                interior: [
                    "nucleus",
                    "struct",
                    { count: 121, object: "peroxisome" },
                ],
            },
        },
    },
    gradients: {
        grad1: { name: "dna-gradient", description: "Test gradient" },
        struct_gradient: {
            name: "struct_gradient",
            description: "Structural gradient for peroxisome packing",
        },
    },
};

export const viewableRecipeR2: ViewableRecipe = {
    name: "Recipe R2",
    objects: { membrane: { name: "membrane", type: "sphere", radius: 50 } },
    composition: { comp1: { name: "base", count: 2, object: "membrane" } },
    gradients: {},
};

/* ---------- Mocks ---------- */

vi.mock("../utils/recipeLoader", () => ({
    getFirebaseRecipe: vi.fn(async (name: string) => {
        if (name === "r1") return viewableRecipeR1;
        if (name === "r2") return viewableRecipeR2;
        return { name };
    }),
    jsonToString: (obj: unknown) => JSON.stringify(obj, null, 2),
}));

vi.mock("../utils/packingService", () => ({
    submitJob: vi.fn(async () => ({ response: { ok: true }, data: { jobId: "job-xyz" } })),
    pollForJobStatus: vi.fn(async (_jobId: string, onStatus?: (s: string) => void) => {
        if (onStatus) {
            onStatus("RUNNING");
            onStatus("DONE");
        }
        return { status: "DONE", error_message: "", outputs_directory: "", result_path: "" };
    }),
    buildResultUrl: vi.fn(async () => "https://test.com/result/path.sim"),
}));

vi.mock("../utils/firebase", () => ({
    getRecipesFromFirebase: vi.fn(async () => ({
        r1: { recipeId: "r1", configId: "config-123", defaultRecipeData: viewableRecipeR1, edits: {}, editableFields: [] },
        r2: { recipeId: "r2", configId: "config-456", defaultRecipeData: viewableRecipeR2, edits: {}, editableFields: [] },
    })),
    getOutputsDirectory: vi.fn(async () => "outputs/job-xyz"),
}));

const { getRecipesFromFirebase } = await import("../utils/firebase");
const { submitJob, pollForJobStatus, buildResultUrl } = await import("../utils/packingService");

/* ---------- Tests ---------- */

describe("recipe store", () => {
    afterEach(() => {
        useRecipeStore.getState().reset();
        vi.clearAllMocks();
    });

    describe("loading", () => {
        it("loadAllRecipes populates recipes and selects first recipe", async () => {
            const { loadAllRecipes, getOriginalValue } = useRecipeStore.getState();
            await loadAllRecipes();

            const state = useRecipeStore.getState();
            expect(getRecipesFromFirebase).toHaveBeenCalledTimes(1);
            expect(Object.keys(state.recipes)).toEqual(["r1", "r2"]);
            expect(state.selectedRecipeId).toBe("r1");
            expect(getOriginalValue("objects.nucleus.radius")).toBe(10);
        });
    });

    describe("selection", () => {
        it("selectRecipe updates selectedRecipeId", async () => {
            const { loadAllRecipes, selectRecipe } = useRecipeStore.getState();
            await loadAllRecipes();
            await selectRecipe("r2");
            expect(useRecipeStore.getState().selectedRecipeId).toBe("r2");
            await selectRecipe("r1");
            expect(useRecipeStore.getState().selectedRecipeId).toBe("r1");
        });
    });

    describe("edits & restore", () => {
        it("editRecipe writes edits and getCurrentValue reflects them", async () => {
            const { loadAllRecipes, selectRecipe, editRecipe, getCurrentValue } =
                useRecipeStore.getState();

            await loadAllRecipes();
            await selectRecipe("r1");

            expect(getCurrentValue("objects.nucleus.radius")).toBe(10);

            editRecipe("r1", {
                "objects.nucleus.radius": 42,
                "composition.comp1.name": "base-updated",
            });

            expect(getCurrentValue("objects.nucleus.radius")).toBe(42);
            expect(getCurrentValue("composition.comp1.name")).toBe("base-updated");

            const r1 = useRecipeStore.getState().recipes["r1"];
            expect(r1.edits["objects.nucleus.radius"]).toBe(42);
        });

        it("restoreRecipeDefault clears edits and falls back to defaults", async () => {
            const {
                loadAllRecipes,
                selectRecipe,
                editRecipe,
                restoreRecipeDefault,
                getCurrentValue,
            } = useRecipeStore.getState();

            await loadAllRecipes();
            await selectRecipe("r1");

            editRecipe("r1", { "objects.nucleus.radius": 99 });
            expect(getCurrentValue("objects.nucleus.radius")).toBe(99);

            restoreRecipeDefault("r1");
            expect(getCurrentValue("objects.nucleus.radius")).toBe(10);
            expect(Object.keys(useRecipeStore.getState().recipes["r1"].edits)).toHaveLength(0);
        });
    });

    describe("getters", () => {
        it("getCurrentValue and getOriginalValue", async () => {
            const {
                loadAllRecipes,
                selectRecipe,
                editRecipe,
                getCurrentValue,
                getOriginalValue,
            } = useRecipeStore.getState();

            await loadAllRecipes();
            await selectRecipe("r1");

            expect(getOriginalValue("objects.nucleus.radius")).toBe(10);
            expect(getOriginalValue("objects.peroxisome.radius")).toBe(2.37);
            expect(getOriginalValue("composition.membrane.regions.interior[2].count")).toBe(121);

            editRecipe("r1", {
                "objects.peroxisome.radius": 3.1,
                "composition.membrane.regions.interior[2].count": 150,
            });

            expect(getCurrentValue("objects.peroxisome.radius")).toBe(3.1);
            expect(getCurrentValue("composition.membrane.regions.interior[2].count")).toBe(150);
            expect(getCurrentValue("missing.path")).toBeUndefined();
        });

        describe("store: startPacking flow", () => {
            it("loadAllRecipes selects first; startPacking success populates jobId/resultUrl and clears isPacking", async () => {
                const store = useRecipeStore.getState();

                await store.loadAllRecipes();
                expect(getRecipesFromFirebase).toHaveBeenCalledTimes(1);
                expect(useRecipeStore.getState().selectedRecipeId).toBe("r1");

                await useRecipeStore.getState().startPacking();

                const s = useRecipeStore.getState();
                expect(submitJob).toHaveBeenCalledWith("r1", expect.any(String), "config-123");
                expect(pollForJobStatus).toHaveBeenCalledWith("job-xyz", expect.any(Function));
                expect(buildResultUrl).toHaveBeenCalledWith("job-xyz");
                expect(s.packingData.jobId).toBe("job-xyz");
                expect(s.packingData.resultUrl).toBe("https://test.com/result/path.sim");
                expect(s.isPacking).toBe(false);
                expect(typeof s.packingData.runTime).toBe("number");
            });

            it("FAILED terminal status stores logs, leaves resultUrl empty", async () => {
                vi.mocked(pollForJobStatus).mockResolvedValueOnce({ status: "FAILED", error_message: "LOGS-FAIL", outputs_directory: "", result_path: "" });

                await useRecipeStore.getState().loadAllRecipes();
                await useRecipeStore.getState().startPacking();

                const s = useRecipeStore.getState();
                expect(s.packingData.jobStatus).toBe(JOB_STATUS.FAILED);
                expect(s.packingData.jobLogs).toBe("LOGS-FAIL");
                expect(s.packingData.resultUrl).toBe("");
                expect(s.isPacking).toBe(false);
            });

            it("non-ok submit sets FAILED and stores error payload", async () => {
                vi.mocked(submitJob).mockResolvedValueOnce({
                    response: { ok: false, status: 400 } as Response,
                    data: { message: "bad request" },
                });

                await useRecipeStore.getState().loadAllRecipes();
                await useRecipeStore.getState().startPacking();

                const s = useRecipeStore.getState();
                expect(s.packingData.jobStatus).toBe(JOB_STATUS.FAILED);
                expect(s.packingData.jobLogs).toContain("bad request");
                expect(s.isPacking).toBe(false);
            });
        });

    })
});