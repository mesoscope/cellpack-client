import {
    Dictionary,
    FirebaseComposition,
    FirebaseGradient,
    FirebaseObject,
    FirebaseRecipe,
    RegionObject
} from "./types";

const isFirebaseRef = (x: string | null | undefined) => {
    return x !== null && x !== undefined && typeof x == "string" && x.startsWith("firebase");
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
    refsDict: Dictionary<FirebaseComposition | FirebaseObject | FirebaseGradient>,
    fullDoc: FirebaseRecipe
) => {
    if (isFirebaseRef(obj.gradient)) {
        const gradientObj: FirebaseGradient = refsDict[obj.gradient!];
        obj.gradient = gradientObj.name;
        fullDoc.gradients ??= {};
        // remove fields that shouldn't be displayed on the UI
        delete gradientObj.id;
        delete gradientObj.dedup_hash;
        fullDoc.gradients[gradientObj.name] = gradientObj;
    }

    if (isFirebaseRef(obj.inherit)) {
        const objectObj: FirebaseObject = refsDict[obj.inherit!];
        obj.inherit = objectObj.name;
        fullDoc.objects ??= {};
        fullDoc.objects[objectObj.name] = resolveRefsInObject(objectObj, refsDict, fullDoc);
    }

    // remove fields that shouldn't be displayed on the UI
    delete obj.id;
    delete obj.dedup_hash;

    return obj;
};

const resolveRefsInComposition = (
    compObj: FirebaseComposition,
    refsDict: Dictionary<FirebaseComposition | FirebaseObject | FirebaseGradient>,
    fullDoc: FirebaseRecipe
) => {
    if (isFirebaseRef(compObj.object)) {
        const objectObj: FirebaseObject = refsDict[compObj.object!];
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
                    const inheritCompObj = refsDict[regionObj];
                    regionData[i] = inheritCompObj.name;
                }
                else if (regionObj instanceof Object && isFirebaseRef(regionObj.object)) {
                    const obj: FirebaseObject = refsDict[regionObj.object];
                    fullDoc.objects ??= {};
                    regionObj.object = obj.name;
                    fullDoc.objects[obj.name] = resolveRefsInObject(obj, refsDict, fullDoc);
                }
            }
        }
    }

    // remove fields that shouldn't be displayed on the UI
    delete compObj.id;
    delete compObj.dedup_hash;

    return compObj;
}

const resolveRefs = (
    doc: FirebaseRecipe,
    refsDict: Dictionary<FirebaseComposition | FirebaseObject | FirebaseGradient | FirebaseRecipe>
) => {
    // Handle Compositions
    for (const compName in doc.composition) {
        const ref = doc.composition[compName].inherit;
        if (isFirebaseRef(ref)) {
            const compositionObj: FirebaseComposition = refsDict[ref!];
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

    // remove fields that shouldn't be displayed on the UI
    delete doc.recipe_path;
    delete doc.id;
    delete doc.dedup_hash;

    return doc;
}

export { isFirebaseRef, resolveRefs };