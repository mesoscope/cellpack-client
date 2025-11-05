import { getSubmitPackingUrl, JOB_STATUS } from "../constants/aws";
import { v4 as uuidv4 } from 'uuid';
import { FIRESTORE_FIELDS } from "../constants/firebase";
import { addRecipe, getJobStatus, getResultPath } from "./firebase";
import { getFirebaseRecipe, jsonToString } from "./recipeLoader";
import { SIMULARIUM_EMBED_URL } from "../constants/urls";
import { JobStatusObject } from "../types";

export async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export const recipeHasChanged = async (recipeId: string, recipeString: string): Promise<boolean> => {
    const originalRecipe = await getFirebaseRecipe(recipeId);
    return !(jsonToString(originalRecipe) == recipeString);
}

export const recipeToFirebase = (recipe: string, path: string, id: string): object => {
    const recipeJson = JSON.parse(recipe);
    if (recipeJson.bounding_box) {
        const flattened_array = Object.assign({}, recipeJson.bounding_box);
        recipeJson.bounding_box = flattened_array;
    }
    recipeJson[FIRESTORE_FIELDS.RECIPE_PATH] = path;
    recipeJson[FIRESTORE_FIELDS.NAME] = id;
    return recipeJson;
}

export const submitJob = async (
    selectedRecipeId: string,
    recipeString: string,
    configId?: string
) => {
    let firebaseRecipe = "firebase:recipes/" + selectedRecipeId;
    const firebaseConfig = configId ? "firebase:configs/" + configId : undefined;

    if (await recipeHasChanged(selectedRecipeId, recipeString)) {
        const newId = uuidv4();
        firebaseRecipe = "firebase:recipes_edited/" + newId;
        const recipeJson = recipeToFirebase(recipeString, firebaseRecipe, newId);
        await addRecipe(newId, recipeJson);
    }

    const url = getSubmitPackingUrl(firebaseRecipe, firebaseConfig);
    const response = await fetch(new Request(url, { method: "POST" }));
    const data = await response.json();
    return { response, data };
};

export const pollForJobStatus = async (
    jobId: string,
    onStatus?: (s: string) => void
): Promise<JobStatusObject> => {
    let localJobStatus = await getJobStatus(jobId);
    while (localJobStatus?.status !== JOB_STATUS.DONE && localJobStatus?.status !== JOB_STATUS.FAILED) {
        await sleep(500);
        const newJobStatus = await getJobStatus(jobId);
        if (newJobStatus && newJobStatus !== localJobStatus) {
            if (onStatus) onStatus(newJobStatus.status);
        }
        localJobStatus = newJobStatus ?? localJobStatus
    }
    return localJobStatus;
};

export const buildResultUrl = async (jobId: string): Promise<string> => {
    const rel = await getResultPath(jobId);
    return SIMULARIUM_EMBED_URL + rel;
};