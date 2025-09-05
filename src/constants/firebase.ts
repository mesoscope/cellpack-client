//firebase configs
export const FIREBASE_CONFIG = {
    AUTH_DOMAIN: "cell-pack-database.firebaseapp.com",
    PROJECT_ID: "cell-pack-database",
    STORAGE_BUCKET: "cell-pack-database.firebasestorage.app"
};

//firestore collection names
export const FIRESTORE_COLLECTIONS = {
    RESULTS: "results",
    RECIPES: "recipes",
    CONFIGS: "configs",
    OBJECTS: "objects",
    GRADIENTS: "gradients",
    COMPOSITION: "composition",
    EXAMPLE_RECIPES: "example_recipes",
    EDITED_RECIPES: "recipes_edited",
    JOB_STATUS: "job_status",
    PACKING_INPUTS: "example_packings",
    EDITABLE_FIELDS: "editable_fields",
};

//firestore field names
export const FIRESTORE_FIELDS = {
    NAME: "name",
    BATCH_JOB_ID: "batch_job_id",
    ORIGINAL_LOCATION: "original_location",
    RECIPE_PATH: "recipe_path",
    INHERIT: "inherit",
    COMPOSITION: "composition",
    OBJECT: "object",
    REGIONS: "regions",
    INTERIOR: "interior",
    GRADIENT: "gradient",
    FIREBASE_ID: "firebaseId",
    URL: "url",
    STATUS: "status",
    TIMESTAMP: "timestamp",
    RECIPE: "recipe",
    CONFIG: "config",
    EDITABLE_FIELDS: "editable_fields",
} as const;

export const RETENTION_POLICY = {
    RETENTION_PERIODS: {
        RECIPES_EDITED: 24 * 60 * 60 * 1000, // 24 hours
        JOB_STATUS: 24 * 60 * 60 * 1000, // 24 hours
    },

    TIMESTAMP_FIELD: "timestamp",
} as const;
