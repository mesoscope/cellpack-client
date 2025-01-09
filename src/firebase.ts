import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    query,
    getDocs,
    where,
} from "firebase/firestore";
import { StringDict, FirestoreDoc } from "./types";


const firebaseConfig = {
    apiKey: import.meta.env.API_KEY,
    authDomain: "cell-pack-database.firebaseapp.com",
    projectId: "cell-pack-database",
    storageBucket: "cell-pack-database.firebasestorage.app",
    messagingSenderId: import.meta.env.MESSAGING_SENDER_ID,
    appId: import.meta.env.APP_ID,
    measurementId: import.meta.env.MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const queryFirebase = async (jobId: string) => {
    const q = query(
        collection(db, "results"),
        where("batch_job_id", "==", jobId)
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
    const locationDict = docs.reduce((locationDict: StringDict, doc: FirestoreDoc) => {
        if (doc.name && doc.original_location) {
            locationDict[doc.name] = doc.original_location;
        }
        return locationDict;
    }, {} as StringDict);
    return locationDict;
}

export { db, queryFirebase, getLocationDict };