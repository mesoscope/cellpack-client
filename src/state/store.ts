import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { get as lodashGet, isEqual } from 'lodash-es';
import { getOutputsDirectory, getRecipesFromFirebase } from "../utils/firebase";
import { buildResultUrl, pollForJobStatus, submitJob } from "../utils/packingService";
import { JOB_STATUS } from "../constants/aws";
import { jsonToString } from "../utils/recipeLoader";
import { PackingManifest, RecipeManifest } from "../types";
import { buildCurrentRecipeObject } from "./utils";
import { EMPTY_FIELDS, EMPTY_PACKING_DATA } from "./constants";

export interface RecipeState {
    selectedRecipeId: string;
    recipes: Record<string, RecipeManifest>;
    packingData: PackingManifest;
}

export interface UIState {
    isLoading: boolean;
    isPacking: boolean;
}

type Actions = {
    loadAllRecipes: () => void;
    selectRecipe: (recipeId: string) => Promise<void>;
    editRecipe: (recipeId: string, updates: Record<string, string | number>) => void;
    restoreRecipeDefault: (recipeId: string) => void;
    getCurrentValue: (path: string) => string | number | undefined;
    getOriginalValue: (path: string) => string | number | undefined;
    startPacking: () => Promise<void>;
    reset: () => void;
};

export type RecipeStore = RecipeState & UIState & Actions;

const initialState: RecipeState & UIState = {
    selectedRecipeId: "",
    recipes: {},
    isLoading: false,
    isPacking: false,
    packingData: EMPTY_PACKING_DATA,
};

export const useRecipeStore = create<RecipeStore>()(
    subscribeWithSelector((set, get) => ({
        ...initialState,

        loadAllRecipes: async () => {
            set({ isLoading: true });
            try {
                const recipes = await getRecipesFromFirebase();
                set({ recipes });
                // make an intial selection
                const firstId = Object.keys(recipes)[0];
                set(s => (!s.selectedRecipeId && firstId ? { selectedRecipeId: firstId } : {}));
            } finally {
                set({ isLoading: false });
            }
        },

        selectRecipe: async (recipeId) => {
            const rec = get().recipes[recipeId];
            // TODO: fails silently? error handling here?
            if (!rec) return;

            set(s => (s.selectedRecipeId === rec.recipeId ? {} : { selectedRecipeId: rec.recipeId }));
        },

        editRecipe: (recipeId, updates) => {
            const rec = get().recipes[recipeId];
            if (!rec) return;

            const newEdits = { ...rec.edits };

            for (const [path, value] of Object.entries(updates)) {
                const defaultValue = lodashGet(rec.defaultRecipeData, path);
                if (isEqual(defaultValue, value)) {
                    delete newEdits[path]; // no longer different from default
                } else {
                    newEdits[path] = value;
                }
            }

            set((state) => ({
                recipes: {
                    ...state.recipes,
                    [recipeId]: {
                        ...rec,
                        edits: newEdits
                    },
                },
            }));
        },

        restoreRecipeDefault: (recipeId) => {
            set(state => {
                const rec = state.recipes[recipeId];
                if (!rec) return {};
                return {
                    recipes: {
                        ...state.recipes,
                        [recipeId]: {
                            ...rec,
                            edits: {},
                        },
                    },
                };
            });
        },


        getCurrentValue: (path) => {
            const { selectedRecipeId, recipes } = get();
            const rec = recipes[selectedRecipeId];
            if (!rec) return undefined;

            // First check if an edited value exists at this path
            const editedValue = lodashGet(rec.edits, path);
            if (editedValue !== undefined) {
                if (typeof editedValue === "string" || typeof editedValue === "number") {
                    return editedValue;
                }
                return undefined;
            }

            // Otherwise, fall back to the default recipe
            const defaultValue = lodashGet(rec.defaultRecipeData, path);
            if (typeof defaultValue === "string" || typeof defaultValue === "number") {
                return defaultValue;
            }

            return undefined;
        },

        getOriginalValue: (path) => {
            const { selectedRecipeId, recipes } = get();
            const rec = recipes[selectedRecipeId]?.defaultRecipeData;
            if (!rec) return undefined;
            const v = lodashGet(rec, path);
            return (typeof v === "string" || typeof v === "number") ? v : undefined;
        },

        startPacking: async () => {
            const { selectedRecipeId, recipes } = get();
            const rec = recipes[selectedRecipeId];
            if (!rec) return;

            const recipeString = jsonToString(buildCurrentRecipeObject(rec))

            set({ isPacking: true, packingData: EMPTY_PACKING_DATA });

            const startedAtMs = Date.now();

            try {
                const { response, data } = await submitJob(selectedRecipeId, recipeString, rec.configId);
                set((state) => ({ packingData: { ...state.packingData, jobStatus: JOB_STATUS.SUBMITTED } }));

                if (!response.ok) {
                    set((state) => ({ packingData: { ...state.packingData, jobStatus: JOB_STATUS.FAILED, jobLogs: JSON.stringify(data) } }));
                    return;
                }

                const newJobId: string = data.jobId;
                set(state => ({
                    packingData: {
                        ...state.packingData,
                        jobId: newJobId,
                        jobStatus: JOB_STATUS.STARTING,
                    }
                }));

                const finalStatus = await pollForJobStatus(newJobId, (next) =>
                    set(state => ({ packingData: { ...state.packingData, jobStatus: next } }))
                );

                const runTime = (Date.now() - startedAtMs) / 1000;

                if (finalStatus.status === JOB_STATUS.DONE) {
                    const url = await buildResultUrl(newJobId);
                    const outputDir = await getOutputsDirectory(newJobId);
                    set(state => ({
                        packingData: {
                            ...state.packingData,
                            jobStatus: JOB_STATUS.DONE,
                            resultUrl: url,
                            outputDir,
                            runTime,
                        }
                    }));
                } else {
                    const logs = finalStatus.error_message;
                    set(state => ({
                        packingData: {
                            ...state.packingData,
                            jobStatus: JOB_STATUS.FAILED,
                            jobLogs: logs,
                            runTime,
                        }
                    }));
                }
            } finally {
                set({ isPacking: false });
            }
        },

        reset: () => set(() => ({ ...initialState })),

    })),
);

// Basic selectors
export const useSelectedRecipeId = () => useRecipeStore(s => s.selectedRecipeId);
export const useRecipes = () => useRecipeStore(s => s.recipes)
export const usePackingData = () => useRecipeStore(s => s.packingData);
export const useIsLoading = () => useRecipeStore(s => s.isLoading);
export const useIsPacking = () => useRecipeStore(s => s.isPacking);

// Derived selectors
export const useEditableFields = () =>
    useRecipeStore(s => {
        const id = s.selectedRecipeId;
        return (id && s.recipes[id]?.editableFields) ?? EMPTY_FIELDS;
    });

// Action selectors
export const useLoadAllRecipes = () => useRecipeStore(s => s.loadAllRecipes);
export const useSelectRecipe = () => useRecipeStore(s => s.selectRecipe);
export const useEditRecipe = () => useRecipeStore(s => s.editRecipe);
export const useRestoreRecipeDefault = () => useRecipeStore(s => s.restoreRecipeDefault); // not implemented, but in design
export const useGetCurrentValue = () => useRecipeStore(s => s.getCurrentValue);
export const useGetOriginalValue = () => useRecipeStore(s => s.getOriginalValue); // not implemented, but in design
export const useStartPacking = () => useRecipeStore(s => s.startPacking);
export const useResetRecipeStore = () => useRecipeStore(s => s.reset);