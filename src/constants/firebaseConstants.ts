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
} as const;