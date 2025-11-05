import { EditableField, PackingManifest } from "../types";

// stable/frozen empty array to prevent re-renders
export const EMPTY_FIELDS: readonly EditableField[] = Object.freeze([]);
export const EMPTY_PACKING_DATA: PackingManifest = Object.freeze({
    jobId: "",
    jobStatus: "",
    jobLogs: "",
    resultUrl: "",
    runTime: -1,
    outputDir: "",
})