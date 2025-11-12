import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { isEmpty, isEqual, get as lodashGet } from "lodash-es";
import { PackingResult, RecipeData, RecipeMetadata } from "../types";
import { jsonToString } from "../utils/recipeLoader";
import { getRecipeDataFromFirebase, getRecipeMetadataFromFirebase } from "../utils/firebase";
import { EMPTY_PACKING_RESULT } from "./constants";
import { buildRecipeObject } from "./utils";

export interface RecipeState {
    selectedRecipeId: string;
    inputOptions: Record<string, RecipeMetadata>;
    recipes: Record<string, RecipeData>;
    packingResults: Record<string, PackingResult>;
}

export interface UIState {
    isPacking: boolean;
}

type Actions = {
    loadInputOptions: () => Promise<void>;
    loadRecipe: (recipeId: string) => Promise<void>;
    loadAllRecipes: () => Promise<void>;
    selectRecipe: (recipeId: string) => Promise<void>;
    editRecipe: (recipeID: string, path: string, value: string | number) => void;
    restoreRecipeDefault: (recipeId: string) => void;
    getCurrentValue: (path: string) => string | number | undefined;
    getOriginalValue: (path: string) => string | number | undefined;
    startPacking: (
        callback: (
            recipeId: string,
            configId: string,
            recipeString: string
        ) => Promise<void>
    ) => Promise<void>;
    setPackingResults: (results: PackingResult) => void;
    setJobLogs: (logs: string) => void;
    setJobId: (jobId: string) => void;
};

export type RecipeStore = RecipeState & UIState & Actions;

const INITIAL_RECIPE_ID = "peroxisome_v_gradient_packing";

const initialState: RecipeState & UIState = {
    selectedRecipeId: INITIAL_RECIPE_ID,
    inputOptions: {},
    recipes: {},
    isPacking: false,
    packingResults: { [INITIAL_RECIPE_ID]: EMPTY_PACKING_RESULT },
};

export const useRecipeStore = create<RecipeStore>()(
    subscribeWithSelector((set, get) => ({
        ...initialState,

        loadInputOptions: async () => {
            // Early return to prevent re-querying after options have loaded
            if (!isEmpty(get().inputOptions)) return;
            const inputOptions = await getRecipeMetadataFromFirebase();
            set({ inputOptions });
        },

        loadRecipe: async (recipeId) => {
            const { recipes, inputOptions } = get();
            if (recipes[recipeId]) return;
            const editableFieldIds = inputOptions[recipeId].editableFieldIds;
            const rec = await getRecipeDataFromFirebase(recipeId, editableFieldIds);
            set((s) => ({
                recipes: {
                    ...s.recipes,
                    [recipeId]: rec
                },
            }));
        },

        loadAllRecipes: async () => {
            const { inputOptions, loadRecipe } = get();

            const optionList = Object.values(inputOptions || {});
            if (optionList.length === 0) return;

            const recipeIds = optionList
                .map(o => o?.recipeId)
                .filter(id => id && !get().recipes[id]);
            
            // Make sure our default initial is in the options we queried
            const initialIdToLoad =
                recipeIds.includes(INITIAL_RECIPE_ID) ? INITIAL_RECIPE_ID : recipeIds[0];

            // Ensure the bootstrap recipe is loaded & selected
            await loadRecipe(initialIdToLoad);

            // Load remaining recipes in the background (don’t block)
            const remainingRecipesToLoad = recipeIds.filter(
                id => id !== initialIdToLoad
            );
            Promise.all(remainingRecipesToLoad.map((id) => loadRecipe(id)));
        },

        selectRecipe: async (recipeId) => {
            const sel = get().inputOptions[recipeId];
            if (!sel) return;

            set({
                selectedRecipeId: recipeId,
            });

            if (sel.recipeId && !get().recipes[sel.recipeId]) {
                await get().loadRecipe(sel.recipeId);
            }
        },

        setPackingResults: (results: PackingResult) => {
            const currentRecipeId = get().selectedRecipeId;
            set({
                packingResults: {
                    ...get().packingResults,
                    [currentRecipeId]: results,
                },
            });
        },

        setJobLogs: (logs: string) => {
            const currentRecipeId = get().selectedRecipeId;
            set({
                packingResults: {
                    ...get().packingResults,
                    [currentRecipeId]: {
                        ...get().packingResults[currentRecipeId],
                        jobLogs: logs,
                    },
                },
            });
        },

        setJobId: (jobId: string) => {
            const currentRecipeId = get().selectedRecipeId;
            set({
                packingResults: {
                    ...get().packingResults,
                    [currentRecipeId]: {
                        ...get().packingResults[currentRecipeId],
                        jobId: jobId,
                    },
                },
            });
        },

        editRecipe: (recipeId, path, value) => {
            const rec = get().recipes[recipeId];
            if (!rec) return;

            const newEdits = { ...rec.edits };

            const defaultValue = lodashGet(rec.defaultRecipeData, path);
            if (isEqual(defaultValue, value)) {
                delete newEdits[path]; // no longer different from default
            } else {
                newEdits[path] = value;
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

        startPacking: async (callback) => {
            const s = get();
            const input = s.inputOptions[s.selectedRecipeId];
            const configId = input?.configId ?? "";
            const recipeObject = buildRecipeObject(s.recipes[s.selectedRecipeId]);
            if (!recipeObject) return;
            const recipeString = jsonToString(recipeObject);
            set({ isPacking: true });
            try {
                await callback(s.selectedRecipeId, configId, recipeString);
            } finally {
                set({ isPacking: false });
            }
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

    }))
);


// Basic selectors
export const useSelectedRecipeId = () => useRecipeStore(s => s.selectedRecipeId);
export const useInputOptions = () => useRecipeStore((s) => s.inputOptions);
export const useIsPacking = () => useRecipeStore(s => s.isPacking);
export const useFieldsToDisplay = () =>
    useRecipeStore((s) => s.recipes[s.selectedRecipeId]?.editableFields);
export const useRecipes = () => useRecipeStore(s => s.recipes)
export const usePackingResults = () => useRecipeStore(s => s.packingResults);

export const useCurrentRecipeObject = () => {
    const recipe = useCurrentRecipeData();
    return recipe ? buildRecipeObject(recipe) : undefined;
}

const useCurrentRecipeMetadata = () => {
    const selectedRecipeId = useSelectedRecipeId();
    const inputOptions = useInputOptions();
    if (!selectedRecipeId) return undefined;
    return inputOptions[selectedRecipeId];
};

export const useCurrentRecipeData = () => {
    const selectedRecipeId = useSelectedRecipeId();
    const recipes = useRecipes();
    return recipes[selectedRecipeId] || undefined;
}

export const useCurrentPackingResult = () => {
    const selectedRecipeId = useSelectedRecipeId();
    const packingResults = usePackingResults();
    return (
        packingResults[selectedRecipeId] || EMPTY_PACKING_RESULT
    );
};

export const useDefaultResultPath = () => {
    const manifest = useCurrentRecipeMetadata();
    // the default URL is stored in the metadata which loads before
    // the recipe is queried, using both data here prevents the viewer
    // loading ahead of the recipe
    const recipe = useCurrentRecipeData();
    return (recipe && manifest?.defaultResultPath) || "";
};

export const useRunTime = () => {
    const results = useCurrentPackingResult();
    return results.runTime;
};

export const useJobLogs = () => {
    const results = useCurrentPackingResult();
    return results.jobLogs;
};

export const useJobId = () => {
    const results = useCurrentPackingResult();
    return results.jobId;
};

export const useOutputsDirectory = () => {
    const results = useCurrentPackingResult();
    return results.outputDir;
};

export const useResultUrl = () => {
    const results = useCurrentPackingResult();
    const currentRecipeId = useSelectedRecipeId();
    const defaultResultPath = useDefaultResultPath();
    let path = "";
    if (results.resultUrl) {
        path = results.resultUrl;
    } else if (currentRecipeId) {
        path = defaultResultPath;
    }
    return path;
};

export const useIsModified = () => {
    const recipe = useCurrentRecipeData();
    return (recipe && !isEmpty(recipe.edits));
}

// Action selectors
export const useLoadInputOptions = () =>
    useRecipeStore((s) => s.loadInputOptions);
export const useLoadAllRecipes = () => useRecipeStore((s) => s.loadAllRecipes);
export const useSelectRecipe = () => useRecipeStore((s) => s.selectRecipe);
export const useEditRecipe = () => useRecipeStore(s => s.editRecipe);
export const useRestoreRecipeDefault = () =>
    useRecipeStore((s) => s.restoreRecipeDefault);
export const useStartPacking = () => useRecipeStore((s) => s.startPacking);
export const useGetCurrentValue = () =>
    useRecipeStore((s) => s.getCurrentValue);
export const useGetOriginalValue = () =>
    useRecipeStore((s) => s.getOriginalValue);
export const useSetPackingResults = () =>
    useRecipeStore((s) => s.setPackingResults);
export const useSetJobLogs = () => useRecipeStore((s) => s.setJobLogs);
export const useSetJobId = () => useRecipeStore((s) => s.setJobId);
