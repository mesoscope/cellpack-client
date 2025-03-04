import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    query,
    getDocs,
    where,
    documentId,
} from "firebase/firestore";
import {
    FIREBASE_CONFIG,
    FIRESTORE_COLLECTIONS,
    FIRESTORE_FIELDS,
} from "./constants/firebaseConstants";
import {
    Dictionary,
    FirebaseComposition,
    FirebaseDict,
    FirestoreDoc,
    FirebaseGradient,
    FirebaseObject,
    FirebaseRecipe
} from "./types";
import { resolveRefs, isFirebaseRef } from "./recipeLoader";


const firebaseConfig = {
    apiKey: import.meta.env.API_KEY,
    authDomain: FIREBASE_CONFIG.AUTH_DOMAIN,
    projectId: FIREBASE_CONFIG.PROJECT_ID,
    storageBucket: FIREBASE_CONFIG.STORAGE_BUCKET,
    messagingSenderId: import.meta.env.MESSAGING_SENDER_ID,
    appId: import.meta.env.APP_ID,
    measurementId: import.meta.env.MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const queryFirebase = async (jobId: string) => {
    const q = query(
        collection(db, FIRESTORE_COLLECTIONS.RESULTS),
        where(FIRESTORE_FIELDS.BATCH_JOB_ID, "==", jobId)
    );
    const querySnapshot = await getDocs(q);
    let resultUrl = "";
    querySnapshot.forEach((doc) => {
    // we'll only ever expect one doc to show up here
        resultUrl = doc.data().url;
    });
    return resultUrl;
};

const getAllDocsFromCollection = async (collectionName: string) => {
    const q = query(collection(db, collectionName));
    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as FirestoreDoc[];
    return docs;
}

const getLocationDict = async (collectionName: string) => {
    const docs = await getAllDocsFromCollection(collectionName);
    // docs is an array of objects, each with an id, a name, and other fields
    // we want to create a dictionary with the name as the key and the original_location as the value
    // `reduce` is a method that takes an array and reduces it to a single value
    const locationDict = docs.reduce((locationDict: FirebaseDict, doc: FirestoreDoc) => {
        const name = doc[FIRESTORE_FIELDS.NAME];
        const originalLocation = doc[FIRESTORE_FIELDS.ORIGINAL_LOCATION] ?? doc[FIRESTORE_FIELDS.RECIPE_PATH] ?? "";
        const id = doc.id;
        if (name) {
            locationDict[name] = {
                "path": originalLocation,
                "firebaseId": id,
            };
        } 
        return locationDict;
    }, {} as FirebaseDict);
    return locationDict;
}

const getDocById = async (coll: string, id: string) => {
    const docs = await getAllDocsFromCollection(coll);
    const doc = docs.find(d => d.id === id);
    return JSON.stringify(doc, null, 2);
}

const getRecipeDoc = async (id: string): Promise<FirebaseRecipe> => {
    const q = query(
        collection(db, FIRESTORE_COLLECTIONS.RECIPES),
        where(documentId(), "==", id)
    );
    const querySnapshot = await getDocs(q);
    const docs: Array<FirebaseRecipe> = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
    return docs[0];
};

const getDocsByIds = async (coll: string, ids: string[]) => {
    const q = query(
        collection(db, coll),
        where(documentId(), "in", ids)
    );
    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
    return docs;
}

const searchForRefs = async (
    refs: string[],
    refsToJson: Dictionary<FirebaseGradient | FirebaseComposition | FirebaseRecipe | FirebaseObject> = {}
): Promise<Dictionary<FirebaseRecipe | FirebaseGradient | FirebaseComposition | FirebaseObject>> => {
    // split up the refs we're searching for by collection, so we can
    // handle searching with one query per collection
    const refsByCollection: Dictionary<Array<string>> = {};
    refs.forEach((ref) => {
    // if we don't already have the JSON for this reference
        if (!(ref in refsToJson)) {
            // firebase:collection/doc -> [firebase, collection, doc]
            const splitRef: string[] = ref.split((/:|\//));
            const collectionName = splitRef[1];

            if (!(collectionName in refsByCollection)) {
                refsByCollection[collectionName] = [];
            }
            if (!(splitRef[2] in refsByCollection[collectionName])) {
                // Only need to search for each ref once
                refsByCollection[collectionName].push(splitRef[2]);
            }
        }
    });

    for (const coll in refsByCollection) {
        const results = await getDocsByIds(coll, refsByCollection[coll]);
        results.forEach((result) => {
            const refName = "firebase:" + coll + "/" + result.id;
            refsToJson[refName] = result;
        });
    }
    return refsToJson
}

const unpackReferences = async (doc: FirebaseRecipe): Promise<string> => {
    // Step through the recipe, and search Firebase for the referenced paths

    // First, walk through the compositions, and retrieve references from those
    let refsToGet: string[] = [];
    if (doc.composition) {
        const compositions: Dictionary<FirebaseComposition> = doc.composition;
        for (const ref of Object.values(compositions)) {
            if (isFirebaseRef(ref.inherit) && typeof ref.inherit == 'string') {
                refsToGet.push(ref.inherit);
            }
        }
    }
    let refsDict: Dictionary<FirebaseObject | FirebaseComposition | FirebaseGradient | FirebaseRecipe> = await searchForRefs(refsToGet);

    // Go through references received above. May be compositions or object
    refsToGet = [];
    for (const ref in refsDict) {
        for (const field in refsDict[ref]) {
            if (field === FIRESTORE_FIELDS.OBJECT) {
                const fieldValue = refsDict[ref][field];
                if (isFirebaseRef(fieldValue)) {
                    refsToGet.push(fieldValue);
                }
            } else if (field === FIRESTORE_FIELDS.REGIONS) {
                const regions = refsDict[ref][field];
                for (const region_type in regions) {
                    const region_data: Array<string|{count: number, object: string}> = regions[region_type];
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

    // Go through references received above. May be gradients or objects
    refsToGet = [];
    for (const ref in refsDict) {
        for (const field in refsDict[ref]) {
            if (
                field === FIRESTORE_FIELDS.OBJECT ||
        field === FIRESTORE_FIELDS.GRADIENT ||
        field === FIRESTORE_FIELDS.INHERIT
            ) {
                const refPath = refsDict[ref][field];
                if (isFirebaseRef(refPath) && typeof refPath == "string" && !(refPath in refsDict)) {
                    refsToGet.push(refPath);
                }
            }
        }
    }
    refsDict = await searchForRefs(refsToGet, refsDict);

    // Resolve references in doc using refsDict
    const resolvedDoc = resolveRefs(doc, refsDict);
    return JSON.stringify(resolvedDoc, null, 2);
}

const getFirebaseRecipe = async (name: string): Promise<string> => {
    const recipe: FirebaseRecipe = await getRecipeDoc(name);
    const unpackedRecipe: string = await unpackReferences(recipe);
    return unpackedRecipe;
}

export { db, queryFirebase, getLocationDict, getDocById, getFirebaseRecipe };