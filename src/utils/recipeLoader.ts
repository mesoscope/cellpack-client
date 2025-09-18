import { FIRESTORE_COLLECTIONS, FIRESTORE_FIELDS } from "../constants/firebase";
import {
    Dictionary,
    EditableField,
    FirebaseComposition,
    FirebaseGradient,
    FirebaseObject,
    FirebaseRecipe,
    PackingInputs,
    RegionObject,
    RefsByCollection,
    ViewableRecipe,
} from "../types";
import { queryDocumentById, getDocsByIds, queryDocumentsByIds, getAllDocsFromCollection } from "./firebase";

const isFirebaseRef = (x: string | null | undefined) => {
    return x !== null && x !== undefined && typeof x == "string" && x.startsWith("firebase");
};

const isInRefsByCollection = (ref: string, coll: string, refsByColl: RefsByCollection): boolean => {
    let refsForColl = {};
    if (coll === FIRESTORE_COLLECTIONS.RECIPES) {
        refsForColl = refsByColl.recipes;
    } else if (coll === FIRESTORE_COLLECTIONS.COMPOSITION) {
        refsForColl = refsByColl.composition;
    } else if (coll === FIRESTORE_COLLECTIONS.OBJECTS) {
        refsForColl = refsByColl.objects;
    } else if (coll === FIRESTORE_COLLECTIONS.GRADIENTS) {
        refsForColl = refsByColl.gradients;
    } else {
        return false;
    }
    return ref in refsForColl;
};

const addRef = (
    ref: string,
    coll: string,
    obj: FirebaseRecipe | FirebaseComposition | FirebaseObject | FirebaseGradient,
    refsByColl: RefsByCollection
): RefsByCollection => {
    if (coll === FIRESTORE_COLLECTIONS.RECIPES) {
        refsByColl.recipes[ref] = obj;
    } else if (coll === FIRESTORE_COLLECTIONS.COMPOSITION) {
        refsByColl.composition[ref] = obj;
    } else if (coll === FIRESTORE_COLLECTIONS.OBJECTS) {
        refsByColl.objects[ref] = obj;
    } else if (coll === FIRESTORE_COLLECTIONS.GRADIENTS) {
        refsByColl.gradients[ref] = obj;
    }
    return refsByColl;
};

const isDbDict = (x: object) => {
    if (typeof x == "object" && Object.keys(x).length > 0) {
        for (const [key, value] of Object.entries(x)) {
            if (isNaN(Number(key)) || !Array.isArray(value)) {
                return false;
            }
        }
        return true;
    }
    return false;
};

const firebaseBoundingBoxToArray = (bounding_box: object): [][] => {
    const unpackedDict: [][] = [[]]
    for (const [k, v] of Object.entries(bounding_box)) {
        unpackedDict[Number(k)] = v;
    }
    return unpackedDict;
};

const resolveRefsInObject = (
    obj: FirebaseObject,
    refsDict: RefsByCollection,
    fullDoc: FirebaseRecipe
) => {
    if (isFirebaseRef(obj.gradient)) {
        const gradientObj: FirebaseGradient = refsDict.gradients[obj.gradient!];
        obj.gradient = gradientObj.name;
        fullDoc.gradients ??= {};
        fullDoc.gradients[gradientObj.name] = gradientObj;
    }

    if (isFirebaseRef(obj.inherit)) {
        const objectObj: FirebaseObject = refsDict.objects[obj.inherit!];
        obj.inherit = objectObj.name;
        fullDoc.objects ??= {};
        fullDoc.objects[objectObj.name] = resolveRefsInObject(objectObj, refsDict, fullDoc);
    }

    return obj;
};

const resolveRefsInComposition = (
    compObj: FirebaseComposition,
    refsDict: RefsByCollection,
    fullDoc: FirebaseRecipe
) => {
    if (isFirebaseRef(compObj.object)) {
        const objectObj: FirebaseObject = refsDict.objects[compObj.object!];
        compObj.object = objectObj.name;
        fullDoc.objects ??= {};
        fullDoc.objects[objectObj.name] = resolveRefsInObject(objectObj, refsDict, fullDoc);
    }
    if (compObj.regions) {
        for (const regionData of Object.values(compObj.regions)) {
            for (let i = 0; i < regionData.length; i++) {
                const regionObj: string | RegionObject = regionData[i];
                if (typeof regionObj === 'string' && isFirebaseRef(regionObj)) {
                    // This reference is to another composition object
                    const inheritCompObj = refsDict.composition[regionObj];
                    regionData[i] = inheritCompObj.name;
                }
                else if (regionObj instanceof Object && isFirebaseRef(regionObj.object)) {
                    const obj: FirebaseObject = refsDict.objects[regionObj.object];
                    fullDoc.objects ??= {};
                    regionObj.object = obj.name;
                    fullDoc.objects[obj.name] = resolveRefsInObject(obj, refsDict, fullDoc);
                }
            }
        }
    }
    return compObj;
}


const stripFirebaseFields = <T extends { name: string; id: string; dedup_hash: string }>(
    obj: T
): Omit<T, "id" | "dedup_hash"> => {
    const { id, dedup_hash, ...viewable } = obj;
    void id; void dedup_hash; // Tell linter these are intentionally unused, we are "using" them by excluding them
    return viewable as Omit<T, "id" | "dedup_hash">;
};

// reusable function for converting a collection of Firebase objects to a viewable format)
const convertCollectionToViewable = <T extends { name: string; id: string; dedup_hash: string }>(
    collection: Dictionary<T> | undefined
): Dictionary<Omit<T, "id" | "dedup_hash">> => {
    if (!collection) return {};

    const viewableCollection: Dictionary<Omit<T, "id" | "dedup_hash">> = {};
    for (const key in collection) {
        viewableCollection[key] = stripFirebaseFields(collection[key]);
    }
    return viewableCollection;
};

const recipeToViewable = (recipe: FirebaseRecipe): ViewableRecipe => {
    if (recipe.bounding_box && isDbDict(recipe.bounding_box)) {
        recipe.bounding_box = firebaseBoundingBoxToArray(recipe.bounding_box);
    }
    const viewableRecipe: ViewableRecipe = {
        name: recipe.name,
        version: recipe.version,
        format_version: recipe.format_version,
        bounding_box: recipe.bounding_box,
        grid_file_path: recipe.grid_file_path,
        composition: convertCollectionToViewable(recipe.composition),
        objects: convertCollectionToViewable(recipe.objects),
        gradients: convertCollectionToViewable(recipe.gradients),
    };
    return viewableRecipe;
}

const resolveRefs = (
    doc: FirebaseRecipe,
    refsDict: RefsByCollection
): ViewableRecipe => {
    // Handle Compositions
    for (const compName in doc.composition) {
        const ref = doc.composition[compName].inherit;
        if (isFirebaseRef(ref)) {
            const compositionObj: FirebaseComposition = refsDict.composition[ref!];
            doc.composition[compName] = resolveRefsInComposition(compositionObj, refsDict, doc);
        }
    }
    // Handle Optional Gradients
    if (doc.optional_gradients) {
        for (const gradient of doc.optional_gradients) {
            if (isFirebaseRef(gradient)) {
                const gradientObj: FirebaseGradient = refsDict.gradients[gradient];
                doc.gradients ??= {};
                doc.gradients[gradientObj.name] = gradientObj;
            }
        }
    }
    return recipeToViewable(doc);
}

const getRecipeDoc = async (id: string): Promise<FirebaseRecipe> => {
    const querySnapshot = await queryDocumentById(FIRESTORE_COLLECTIONS.RECIPES, id);
    const docs: Array<FirebaseRecipe> = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        dedup_hash: doc.data().dedup_hash,
        ...doc.data(),
    }));
    if (docs.length === 0) {
        throw new Error(`Recipe with ID ${id} not found`);
    }
    return docs[0];
};

const searchForRefs = async (
    refs: string[],
    refsToObj: RefsByCollection
): Promise<RefsByCollection> => {
    // split up the refs we're searching for by collection, so we can
    // handle searching with one query per collection
    const refsToGetByCollection: Dictionary<Array<string>> = {};
    refs.forEach((ref) => {
        const splitRef: string[] = ref.split((/:|\//));
        // firebase:collection/doc -> [firebase, collection, doc]
        const collectionName = splitRef[1];
        const docId = splitRef[2];
        // Only need to search if we don't already have the object for this reference
        if (!isInRefsByCollection(ref, collectionName, refsToObj)) {
            if (!(collectionName in refsToGetByCollection)) {
                refsToGetByCollection[collectionName] = [];
            }
            if (!refsToGetByCollection[collectionName].includes(docId)) {
                // Only need to search for each ref once
                refsToGetByCollection[collectionName].push(docId);
            }
        }
    });

    for (const coll in refsToGetByCollection) {
        const results: FirebaseRecipe[] | FirebaseComposition[] | FirebaseObject[] | FirebaseGradient[] = await getDocsByIds(coll, refsToGetByCollection[coll]);
        results.forEach((result) => {
            const refName = "firebase:" + coll + "/" + result.id;
            refsToObj = addRef(refName, coll, result, refsToObj);
        });
    }
    return refsToObj
}

const unpackReferences = async (doc: FirebaseRecipe): Promise<ViewableRecipe> => {
    // Step through the recipe, and search Firebase for the referenced paths

    // First, walk through the recipe's compositions, and resolve their references
    let refsToGet: string[] = [];
    if (doc.composition) {
        const compositions: Dictionary<FirebaseComposition> = doc.composition;
        for (const ref of Object.values(compositions)) {
            if (isFirebaseRef(ref.inherit) && typeof ref.inherit == 'string') {
                refsToGet.push(ref.inherit);
            }
        }
    }
    if (doc.optional_gradients) {
        const gradients: string[] = doc.optional_gradients;
        for (const ref of gradients) {
            if (isFirebaseRef(ref) && typeof ref == 'string') {
                refsToGet.push(ref);
            }
        }
    }
    let refsDict: RefsByCollection = {recipes: {}, composition: {}, gradients: {}, objects: {}};
    refsDict = await searchForRefs(refsToGet, refsDict);

    // Second, step through the resolved compositions from above and resolve references to other
    // compositions or objects referenced there
    refsToGet = [];
    for (const ref in refsDict.composition) {
        for (const [field, fieldValue] of Object.entries(refsDict.composition[ref])) {
            if (field === FIRESTORE_FIELDS.OBJECT) {
                if (isFirebaseRef(fieldValue)) {
                    refsToGet.push(fieldValue);
                }
            } else if (field === FIRESTORE_FIELDS.REGIONS) {
                for (const region_type in fieldValue) {
                    const region_data: Array<string|RegionObject> = fieldValue[region_type];
                    if (region_data) {
                        region_data.forEach((obj) => {
                            if (typeof obj === "string" && isFirebaseRef(obj)) {
                                refsToGet.push(obj);
                            }
                            else if (obj instanceof Object && isFirebaseRef(obj[FIRESTORE_FIELDS.OBJECT])) {
                                refsToGet.push(obj[FIRESTORE_FIELDS.OBJECT]);
                            }
                        });
                    }
                }
            }
        }
    }
    refsDict = await searchForRefs(refsToGet, refsDict);

    // Third, go through references in compositions or objects received above. References may be to gradients or objects
    refsToGet = [];
    for (const ref in refsDict.composition) {
        for (const [field, fieldValue] of Object.entries(refsDict.composition[ref])) {
            if (
                field === FIRESTORE_FIELDS.OBJECT
                || field === FIRESTORE_FIELDS.INHERIT
            ) {
                if (isFirebaseRef(fieldValue) && !(fieldValue in refsDict.composition)) {
                    refsToGet.push(fieldValue);
                }
            }
        }
    }
    for (const ref in refsDict.objects) {
        for (const [field, fieldValue] of Object.entries(refsDict.objects[ref])) {
            if (
                field === FIRESTORE_FIELDS.GRADIENT
                || field === FIRESTORE_FIELDS.INHERIT
            ) {
                if (isFirebaseRef(fieldValue) && !(fieldValue in refsDict.objects)) {
                    refsToGet.push(fieldValue);
                }
            }
        }
    }
    refsDict = await searchForRefs(refsToGet, refsDict);

    // Resolve references in doc using refsDict
    const resolvedDoc: ViewableRecipe = resolveRefs(doc, refsDict);
    return resolvedDoc;
}

const getFirebaseRecipe = async (name: string): Promise<ViewableRecipe> => {
    const recipe: FirebaseRecipe = await getRecipeDoc(name);
    const unpackedRecipe: ViewableRecipe = await unpackReferences(recipe);
    return unpackedRecipe;
}

const jsonToString = (json: ViewableRecipe): string => {
    return JSON.stringify(json, null, 2);
}

const getEditableFieldsList = async (editable_field_ids: string[]): Promise<EditableField[]|undefined> => {
    if (editable_field_ids.length === 0) {
        return undefined;
    }
    const querySnapshot = await queryDocumentsByIds(FIRESTORE_COLLECTIONS.EDITABLE_FIELDS, editable_field_ids);
    const docs = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        data_type: doc.data().data_type,
        input_type: doc.data().input_type,
        description: doc.data().description,
        default: doc.data().default,
        min: doc.data().min,
        max: doc.data().max,
        options: doc.data().options,
        gradient_options: doc.data().gradient_options,
        path: doc.data().path,
    }));
    return docs;
};

const getPackingInputsDict = async (): Promise<Dictionary<PackingInputs>> => {
    const docs = await getAllDocsFromCollection(FIRESTORE_COLLECTIONS.PACKING_INPUTS);
    const inputsDict: Dictionary<PackingInputs> = {};
    for (const doc of docs) {
        const name = doc[FIRESTORE_FIELDS.NAME];
        const config = doc[FIRESTORE_FIELDS.CONFIG];
        const recipe = doc[FIRESTORE_FIELDS.RECIPE];
        const editableFields = await getEditableFieldsList(doc[FIRESTORE_FIELDS.EDITABLE_FIELDS] || []);
        if (name && config && recipe) {
            const initialRecipeObj = await getFirebaseRecipe(recipe);
            inputsDict[name] = {
                configId: config,
                recipeId: recipe,
                initialRecipeObj: initialRecipeObj,
                currentRecipeObj: JSON.parse(JSON.stringify(initialRecipeObj)),
                editableFields: editableFields
            };
        }
    }
    return inputsDict;
}


export { getFirebaseRecipe, isFirebaseRef, jsonToString, getPackingInputsDict };