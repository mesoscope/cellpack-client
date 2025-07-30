import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    query,
    getDocs,
    where,
    documentId,
    QuerySnapshot,
    DocumentData,
    setDoc,
    doc,
    Timestamp,
    deleteDoc,
} from "firebase/firestore";
import {
    FIREBASE_CONFIG,
    FIRESTORE_COLLECTIONS,
    FIRESTORE_FIELDS,
    RETENTION_POLICY,
} from "./constants/firebaseConstants";
import {
    Dictionary,
    FirebaseComposition,
    FirebaseDict,
    FirestoreDoc,
    FirebaseGradient,
    FirebaseObject,
    FirebaseRecipe,
    RefsByCollection,
    RegionObject,
    ViewableRecipe,
} from "./types";
import { resolveRefs, isFirebaseRef, isInRefsByCollection, addRef } from "./recipeLoader";

const getEnvVar = (key: string): string => {
    // check if we're in a browser environment (Vite)
    if (typeof window !== "undefined" && import.meta.env) {
        return import.meta.env[key] || "";
    }
    // check if we're in Node.js environment (GitHub Actions)
    if (typeof process !== "undefined" && process.env) {
        return process.env[key] || "";
    }
    return "";
};

const firebaseConfig = {
    apiKey: getEnvVar("API_KEY"),
    authDomain: FIREBASE_CONFIG.AUTH_DOMAIN,
    projectId: FIREBASE_CONFIG.PROJECT_ID,
    storageBucket: FIREBASE_CONFIG.STORAGE_BUCKET,
    messagingSenderId: getEnvVar("MESSAGING_SENDER_ID"),
    appId: getEnvVar("APP_ID"),
    measurementId: getEnvVar("MEASUREMENT_ID"),
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Generic firestore query functions
const queryDocumentById = async (collectionName: string, id: string) => {
    const q = query(
        collection(db, collectionName),
        where(documentId(), "==", id)
    );
    return await getDocs(q);
};

const queryDocumentsByIds = async (collectionName: string, ids: string[]) => {
    const q = query(
        collection(db, collectionName),
        where(documentId(), "in", ids)
    );
    return await getDocs(q);
};

const queryDocumentsByField = async (collectionName: string, field: string, value: string | number | boolean) => {
    const q = query(
        collection(db, collectionName),
        where(field, "==", value)
    );
    return await getDocs(q);
};

const queryAllDocuments = async (collectionName: string) => {
    const q = query(collection(db, collectionName));
    return await getDocs(q);
};

const queryDocumentsByTime = async (collectionName: string, field: string, operator: "<" | "<=" | "==" | "!=" | ">=" | ">" , value: Timestamp) => {
    const q = query(
        collection(db, collectionName),
        where(field, operator, value)
    );
    return await getDocs(q);
};

const mapQuerySnapshotToDocs = (querySnapshot: QuerySnapshot<DocumentData>) => {
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as FirestoreDoc[];
};

const extractSingleDocumentData = (querySnapshot: QuerySnapshot<DocumentData>, field?: string) => {
    let result = "";
    querySnapshot.forEach((doc) => {
        result = field ? doc.data()[field] : doc.data();
    });
    return result;
};

// Query functions for our use case using generic functions
const getResultPath = async (jobId: string) => {
    const querySnapshot = await queryDocumentsByField(FIRESTORE_COLLECTIONS.RESULTS, FIRESTORE_FIELDS.BATCH_JOB_ID, jobId);
    return extractSingleDocumentData(querySnapshot, "url");
};

const getJobStatus = async (jobId: string) => {
    const querySnapshot = await queryDocumentById(FIRESTORE_COLLECTIONS.JOB_STATUS, jobId);
    return extractSingleDocumentData(querySnapshot, "status");
}

const getAllDocsFromCollection = async (collectionName: string) => {
    const querySnapshot = await queryAllDocuments(collectionName);
    return mapQuerySnapshotToDocs(querySnapshot);
};

const getLocationDict = async (collectionName: string) => {
    const docs = await getAllDocsFromCollection(collectionName);
    // docs is an array of objects, each with an id, a name, and other fields
    // we want to create a dictionary with the name as the key and the original_location as the value
    // `reduce` is a method that takes an array and reduces it to a single value
    const locationDict = docs.reduce((locationDict: FirebaseDict, doc: FirestoreDoc) => {
        const name = doc[FIRESTORE_FIELDS.NAME];
        const id = doc.id;
        if (name) {
            locationDict[name] = {
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

const getDocsByIds = async (coll: string, ids: string[]) => {
    const querySnapshot = await queryDocumentsByIds(coll, ids);
    const docs = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        dedup_hash: doc.data().dedup_hash,
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

const updateRecipe = async (id: string, data: object) => {
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.EDITED_RECIPES, id), data);
}

const docCleanup = async () => {
    const now = Date.now();
    const collectionsToClean = [
        { name: FIRESTORE_COLLECTIONS.EDITED_RECIPES, retention: RETENTION_POLICY.RETENTION_PERIODS.RECIPES_EDITED },
        { name: FIRESTORE_COLLECTIONS.JOB_STATUS, retention: RETENTION_POLICY.RETENTION_PERIODS.JOB_STATUS }
    ];

    for (const collectionConfig of collectionsToClean) {
        const cutoffTime = Timestamp.fromMillis(now - collectionConfig.retention);
        const querySnapshot = await queryDocumentsByTime(
            collectionConfig.name,
            RETENTION_POLICY.TIMESTAMP_FIELD,
            "<",
            cutoffTime
        );
        
        const deletePromises: Promise<void>[] = [];
        
        querySnapshot.forEach((document) => {
            deletePromises.push(deleteDoc(doc(db, collectionConfig.name, document.id)));
        });
        
        await Promise.all(deletePromises);
        console.log(`Cleaned up ${deletePromises.length} documents from ${collectionConfig.name}`);
    }
}
export { db, getLocationDict, getDocById, getFirebaseRecipe, getJobStatus, getResultPath, updateRecipe, docCleanup };
