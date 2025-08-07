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
} from "../constants/firebase";
import {
    FirebaseDict,
    FirestoreDoc,
} from "../types";

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

const addRecipe = async (id: string, data: object) => {
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
export { db, queryDocumentById, getLocationDict, getDocById, getDocsByIds, getJobStatus, getResultPath, addRecipe, docCleanup };
