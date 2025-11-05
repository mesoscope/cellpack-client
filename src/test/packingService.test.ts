import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
    recipeHasChanged,
    recipeToFirebase,
    submitJob,
    pollForJobStatus,
    buildResultUrl,
} from "../utils/packingService";
import { JOB_STATUS } from "../constants/aws";
import { FIRESTORE_FIELDS } from "../constants/firebase";

vi.mock("../utils/firebase", () => ({
    addRecipe: vi.fn(async () => { }),
    getDocById: vi.fn(async () => "LOGS-123"),
    getJobStatus: vi.fn(async () => ({ status: "STARTING", error_message: "", outputs_directory: "", result_path: "" })),
    getResultPath: vi.fn(async () => "/result/path.sim"),
}));

vi.mock("../utils/recipeLoader", () => ({
    getFirebaseRecipe: vi.fn(async () => ({ name: "name" })),
    jsonToString: (obj: unknown) => JSON.stringify(obj),
}));

vi.mock("uuid", () => ({ v4: () => "uuid-123" }));

const { addRecipe, getJobStatus, getResultPath } = await import("../utils/firebase");
const { getFirebaseRecipe } = await import("../utils/recipeLoader");

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("packingService utils", () => {
    test("recipeHasChanged: false when equal, true when different", async () => {
        // equal
        vi.mocked(getFirebaseRecipe).mockResolvedValueOnce({ name: "name" });
        expect(await recipeHasChanged("r1", JSON.stringify({ name: "name" }))).toBe(false);
        // different
        vi.mocked(getFirebaseRecipe).mockResolvedValueOnce({ name: "name" });
        expect(await recipeHasChanged("r1", JSON.stringify({ name: "name2" }))).toBe(true);
    });

    test("recipeToFirebase flattens bounding_box and sets fields", () => {
        const input = {
            bounding_box: [
                [0, 0, 0],
                [1, 1, 1],
            ],
            foo: "bar",
        };
        const result = recipeToFirebase(
            JSON.stringify(input),
            "firebase:recipes_edited/uuid-123",
            "uuid-123"
        ) as Record<string, unknown>;

        expect(Array.isArray(result.bounding_box)).toBe(false);
        expect(
            (result)[FIRESTORE_FIELDS.RECIPE_PATH]
        ).toBe("firebase:recipes_edited/uuid-123");
        expect(
            (result)[FIRESTORE_FIELDS.NAME]
        ).toBe("uuid-123");
        expect(result.foo).toBe("bar");
    });

    test("submitJob: unchanged recipe → no addRecipe, still POST submit", async () => {
        vi.mocked(getFirebaseRecipe).mockResolvedValueOnce({
            name: "one_sphere",
            version: "1.0.0",
        });

        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            json: async () => ({ jobId: "job-2" }),
        })));

        const recipeString = JSON.stringify({ name: "one_sphere", version: "1.0.0" });
        const { response, data } = await submitJob("r1", recipeString);

        expect(addRecipe).not.toHaveBeenCalled();
        expect((response).ok).toBe(true);
        expect(data.jobId).toBe("job-2");
    });

    test("submitJob: changed recipe → addRecipe and POST edited path", async () => {
        vi.mocked(getFirebaseRecipe).mockResolvedValueOnce({
            name: "one_sphere",
            version: "1.0.0",
        });

        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            json: async () => ({ jobId: "job-1" }),
        })));

        const recipeString = JSON.stringify({ name: "one_sphere", version: "1.0.1" });
        const { response, data } = await submitJob("r1", recipeString, "cfg-1");

        expect(addRecipe).toHaveBeenCalledTimes(1);
        expect((response).ok).toBe(true);
        expect(data.jobId).toBe("job-1");
    });

    test("pollForJobStatus loops and returns terminal status, calling onStatus", async () => {
        const sequence = [
            { status: JOB_STATUS.STARTING, error_message: "", outputs_directory: "", result_path: "" },
            { status: JOB_STATUS.RUNNING, error_message: "", outputs_directory: "", result_path: "" },
            { status: JOB_STATUS.DONE, error_message: "", outputs_directory: "", result_path: "" }
        ];
        let i = 0;
        vi.mocked(getJobStatus).mockImplementation(async () => sequence[Math.min(i++, sequence.length - 1)]);

        // make polling instant
        const mod = await import("../utils/packingService");
        vi.spyOn(mod, "sleep").mockResolvedValue(undefined);

        const onStatus = vi.fn();
        const final = await pollForJobStatus("job-xyz", onStatus);

        expect(final.status).toBe(JOB_STATUS.DONE);
        expect(onStatus).toHaveBeenCalledWith(JOB_STATUS.RUNNING);
        expect(onStatus).toHaveBeenCalledWith(JOB_STATUS.DONE);
    });

    test("buildResultUrl prefixes with viewer URL", async () => {
        const url = await buildResultUrl("job-9");
        expect(getResultPath).toHaveBeenCalledWith("job-9");
        expect(url.endsWith("/result/path.sim")).toBe(true);
    });
});
