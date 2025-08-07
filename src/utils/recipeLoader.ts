import { FIRESTORE_COLLECTIONS, FIRESTORE_FIELDS } from "../constants/firebase";
import {
    Dictionary,
    FirebaseComposition,
    FirebaseGradient,
    FirebaseObject,
    FirebaseRecipe,
    RegionObject,
    RefsByCollection,
    ViewableRecipe,
} from "../types";
import { queryDocumentById, getDocsByIds } from "./firebase";

const isFirebaseRef = (x: string | null | undefined) => {
    return x !== null && x !== undefined && typeof x == "string" && x.startsWith("firebase");
}

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
}

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
}

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
}

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
    if (doc.bounding_box && isDbDict(doc.bounding_box)) {
        const unpackedDict: [][] = [[]]
        for (const [k, v] of Object.entries(doc.bounding_box)) {
            unpackedDict[Number(k)] = v;
        }
        doc.bounding_box = unpackedDict;
    }
    const viewable: ViewableRecipe = recipeToViewable(doc);
    return viewable;
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
        const collectionName = splitRef[1];
        // Only need to search if we don't already have the object for this reference
        if (!isInRefsByCollection(ref, collectionName, refsToObj)) {
            // firebase:collection/doc -> [firebase, collection, doc]
            if (!(collectionName in refsToGetByCollection)) {
                refsToGetByCollection[collectionName] = [];
            }
            if (!(splitRef[2] in refsToGetByCollection[collectionName])) {
                // Only need to search for each ref once
                refsToGetByCollection[collectionName].push(splitRef[2]);
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

const unpackReferences = async (doc: FirebaseRecipe): Promise<string> => {
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
    return JSON.stringify(resolvedDoc, null, 2);
}

const getFirebaseRecipe = async (name: string): Promise<string> => {
    const recipe: FirebaseRecipe = await getRecipeDoc(name);
    const unpackedRecipe: string = await unpackReferences(recipe);
    return unpackedRecipe;
}


export { getFirebaseRecipe };