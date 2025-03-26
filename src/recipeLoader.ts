import { FIRESTORE_COLLECTIONS } from "./constants/firebaseConstants";
import {
    FirebaseComposition,
    FirebaseGradient,
    FirebaseObject,
    FirebaseRecipe,
    RegionObject,
    RefsByCollection
} from "./types";

const isFirebaseRef = (x: string | null | undefined) => {
    return x !== null && x !== undefined && typeof x == "string" && x.startsWith("firebase");
}

const isInRefsByCollection = (ref: string, coll: string, refsByColl: RefsByCollection): Boolean => {
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

    // remove fields that shouldn't be displayed on the UI
    // delete compObj.id;
    // delete compObj.dedup_hash;

    return compObj;
}

const resolveRefs = (
    doc: FirebaseRecipe,
    refsDict: RefsByCollection
) => {
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

    return doc;
}

export { isFirebaseRef, resolveRefs, isInRefsByCollection, addRef };