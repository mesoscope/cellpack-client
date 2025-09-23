import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { PackingInputs } from "../types";
import { getFirebaseRecipe, jsonToString } from "../utils/recipeLoader";
import { getPackingInputsDict } from "../utils/firebase";
import { JSONValue, setAtPath, getAtPath } from "../utils/jsonPath";

export interface RecipeData {
    id: string;
    originalString: string;
    currentString: string;
    isModified: boolean;
}

export interface RecipeState {
    selectedInputName: string;
    selectedRecipeId: string;
    inputOptions: Record<string, PackingInputs>;
    recipes: Record<string, RecipeData>;
}

export interface UIState {
    isLoading: boolean;
    isPacking: boolean;
}

type Actions = {
    loadInputOptions: () => Promise<void>;
    loadAllRecipes: () => Promise<void>;
    selectInput: (inputName: string) => Promise<void>;
    loadRecipe: (recipeId: string) => Promise<void>;
    updateRecipeString: (recipeId: string, newString: string) => void;
    updateRecipeObj: (recipeId: string, updates: Record<string, string | number>) => void;
    restoreRecipeDefault: (recipeId: string) => void;
    getCurrentValue: (path: string) => string | number | undefined; // STABLE
    getOriginalValue: (path: string) => string | number | undefined;
    startPacking: (
        callback: (recipeId: string, configId: string, recipeString: string) => Promise<void>
    ) => Promise<void>;
};

export type RecipeStore = RecipeState & UIState & Actions;

const initialState: RecipeState & UIState = {
    selectedInputName: "",
    selectedRecipeId: "",
    inputOptions: {},
    recipes: {},
    isLoading: false,
    isPacking: false,
};

export const useRecipeStore = create<RecipeStore>()(
    subscribeWithSelector((set, get) => ({
        ...initialState,

        loadInputOptions: async () => {
            set({ isLoading: true });
            try {
                const inputOptions = await getPackingInputsDict();
                set({ inputOptions });
            } finally {
                set({ isLoading: false });
            }
        },


        loadRecipe: async (recipeId) => {
            if (get().recipes[recipeId]) return;
            const recJson = await getFirebaseRecipe(recipeId);
            const recStr = jsonToString(recJson);
            set(s => ({
                recipes: {
                    ...s.recipes,
                    [recipeId]: {
                        id: recipeId,
                        originalString: recStr,
                        currentString: recStr,
                        isModified: false,
                    },
                },
            }));

        },

        loadAllRecipes: async () => {
            const { inputOptions, recipes, loadRecipe } = get();

            const ids = new Set<string>();
            Object.values(inputOptions).forEach(opt => { if (opt?.recipe) ids.add(opt.recipe); });
            const missing = [...ids].filter(id => !recipes[id]);
            if (!missing.length) return;

            set({ isLoading: true });
            try {
                await Promise.all(missing.map(id => loadRecipe(id)));
            } finally {
                set({ isLoading: false });
            }
        },

        selectInput: async (inputName) => {
            const sel = get().inputOptions[inputName];
            if (!sel) return;

            set({
                selectedInputName: inputName,
                selectedRecipeId: sel.recipe ?? "",
            });

            if (sel.recipe && !get().recipes[sel.recipe]) {
                await get().loadRecipe(sel.recipe);
            }
        },


        updateRecipeString: (recipeId, newString) => {
            set(s => {
                const rec = s.recipes[recipeId];
                if (!rec) return s;
                return {
                    recipes: {
                        ...s.recipes,
                        [recipeId]: {
                            ...rec,
                            currentString: newString,
                            isModified: newString !== rec.originalString,
                        },
                    },
                };
            });
        },

        updateRecipeObj: (recipeId, updates) => {
            const rec = get().recipes[recipeId];
            if (!rec) return;

            try {
                const obj: JSONValue = JSON.parse(rec.currentString);
                let mutated = false;

                for (const [path, value] of Object.entries(updates)) {
                    mutated = setAtPath(obj, path, value as JSONValue) || mutated;
                }

                if (mutated) {
                    get().updateRecipeString(recipeId, JSON.stringify(obj, null, 2));
                }
            } catch {
                /* ignore */
            }
        },

        restoreRecipeDefault: (recipeId) => {
            const rec = get().recipes[recipeId];
            if (rec) get().updateRecipeString(recipeId, rec.originalString);
        },


        getCurrentValue: (path) => {
            const { selectedRecipeId, recipes } = get();
            const str = recipes[selectedRecipeId]?.currentString;
            if (!str) return undefined;
            try {
                const obj: JSONValue = JSON.parse(str);
                const v = getAtPath(obj, path);
                return typeof v === "string" || typeof v === "number" ? v : undefined;
            } catch {
                return undefined;
            }
        },



        startPacking: async (callback) => {
            const s = get();
            const input = s.inputOptions[s.selectedInputName];
            const configId = input?.config ?? "";
            const recipeString = s.recipes[s.selectedRecipeId]?.currentString ?? "";
            set({ isPacking: true });
            try {
                await callback(s.selectedRecipeId, configId, recipeString);
            } finally {
                set({ isPacking: false });
            }
        },

        getOriginalValue: (path) => {
            const { selectedRecipeId, recipes } = get();
            const str = recipes[selectedRecipeId]?.originalString;
            if (!str) return undefined;
            try {
                const obj: JSONValue = JSON.parse(str);
                const v = getAtPath(obj, path);
                return typeof v === "string" || typeof v === "number" ? v : undefined;
            } catch {
                return undefined;
            }
        },

    })),


);

// tiny helpers/selectors (all derived — not stored)
export const useSelectedRecipeId = () => useRecipeStore(s => s.selectedRecipeId);
export const useCurrentRecipeString = () =>
    useRecipeStore(s => s.recipes[s.selectedRecipeId]?.currentString ?? "");
export const useInputOptions = () => useRecipeStore(s => s.inputOptions);
export const useIsLoading = () => useRecipeStore(s => s.isLoading);
export const useIsPacking = () => useRecipeStore(s => s.isPacking);
export const useFieldsToDisplay = () =>
    useRecipeStore(s => s.inputOptions[s.selectedInputName]?.editable_fields);
export const useIsCurrentRecipeModified = () =>
    useRecipeStore(s => s.recipes[s.selectedRecipeId]?.isModified ?? false);
export const useGetOriginalValue = () => useRecipeStore(s => s.getOriginalValue);

// action selectors (stable identities)
export const useLoadInputOptions = () => useRecipeStore(s => s.loadInputOptions);
export const useLoadAllRecipes = () => useRecipeStore(s => s.loadAllRecipes);
export const useSelectInput = () => useRecipeStore(s => s.selectInput);
export const useUpdateRecipeObj = () => useRecipeStore(s => s.updateRecipeObj);
export const useUpdateRecipeString = () => useRecipeStore(s => s.updateRecipeString);
export const useRestoreRecipeDefault = () => useRecipeStore(s => s.restoreRecipeDefault);
export const useStartPacking = () => useRecipeStore(s => s.startPacking);
export const useGetCurrentValue = () => useRecipeStore(s => s.getCurrentValue);