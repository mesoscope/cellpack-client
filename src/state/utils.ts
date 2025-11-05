import { RecipeManifest } from "../types";
import { set } from "lodash-es";

/**
 * Build a recipe from a default and a set of edits.
 */
export const buildCurrentRecipeObject = (recipe: RecipeManifest) => {
    const clone = structuredClone(recipe.defaultRecipeData);
    for (const [path, value] of Object.entries(recipe.edits)) {
        set(clone, path, value);
    }
    return clone;
};
