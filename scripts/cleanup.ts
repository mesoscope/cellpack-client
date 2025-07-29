#!/usr/bin/env node

import { initializeApp } from 'firebase/app';
import { getFirestore, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS, RETENTION_POLICY, FIREBASE_CONFIG } from '../src/constants/firebaseConstants.ts';

const firebaseConfig = {
    apiKey: process.env.API_KEY,
    authDomain: FIREBASE_CONFIG.AUTH_DOMAIN,
    projectId: FIREBASE_CONFIG.PROJECT_ID,
    storageBucket: FIREBASE_CONFIG.STORAGE_BUCKET,
    messagingSenderId: process.env.MESSAGING_SENDER_ID,
    appId: process.env.APP_ID,
    measurementId: process.env.MEASUREMENT_ID,
};

// Create our own queryDocumentsByTime for the cleanup script since we can't import from firebase.ts due to environment differences
const queryDocumentsByTime = async (db: any, collectionName: string, field: string, operator: "<" | "<=" | "==" | "!=" | ">=" | ">", value: Timestamp) => {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const q = query(
        collection(db, collectionName),
        where(field, operator, value)
    );
    return await getDocs(q);
};

async function cleanupOldDocuments() {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const now = Date.now();
    
    const collectionsToClean = [
        { name: FIRESTORE_COLLECTIONS.EDITED_RECIPES, retention: RETENTION_POLICY.RETENTION_PERIODS.RECIPES_EDITED },
        { name: FIRESTORE_COLLECTIONS.JOB_STATUS, retention: RETENTION_POLICY.RETENTION_PERIODS.JOB_STATUS }
    ];

    for (const collectionConfig of collectionsToClean) {
        const cutoffTime = Timestamp.fromMillis(now - collectionConfig.retention);
        const querySnapshot = await queryDocumentsByTime(
            db,
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

async function main() {
    try {
        console.log("Starting Firebase cleanup...");
        await cleanupOldDocuments();
        console.log("Cleanup completed successfully");
        process.exit(0);
    } catch (error) {
        console.error("Cleanup failed:", error);
        process.exit(1);
    }
}

main(); 