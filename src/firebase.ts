import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    query,
    getDocs,
    where,
    documentId,
    addDoc,
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
    FirebaseRecipe,
    RefsByCollection,
    RegionObject,
    ViewableRecipe,
} from "./types";
import { resolveRefs, isFirebaseRef, isInRefsByCollection, addRef } from "./recipeLoader";

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
    const q = query(
        collection(db, coll),
        where(documentId(), "==", id)
    );
    const querySnapshot = await getDocs(q);
    const doc = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
    }));
    return doc[0];
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
        const results = await getDocsByIds(coll, refsToGetByCollection[coll]);
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

const updateConfig = async (data) => {
    try {
        const docRef = await addDoc(collection(db, FIRESTORE_COLLECTIONS.CONFIGS), data);
        return docRef.id;
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

export { db, queryFirebase, getLocationDict, getDocById, getFirebaseRecipe, updateConfig };