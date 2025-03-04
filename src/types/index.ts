export interface Document {
    name?: string;
    original_location?: string;
    recipe_path?: string;
}

export type FirestoreDoc = Document & {
    id: string;
};

export interface AWSBatchJobsResponse {
    jobs: Array<{
        status: string;
        container: {
            logStreamName: string;
        };
    }>;
}

export interface CloudWatchLogsResponse {
    events: Array<{
        message: string;
    }>;
}

export type StringDict = {
    [key: string]: string;
};

export type FirebaseDict = {
    [key: string]: StringDict;
};

export interface Dictionary<T> {
    [Key: string]: T;
}

export interface FirebaseObject {
    name?: string;
    type: string;
    color: Array<number>;
    id?: string;
    dedup_hash?: string;
    packing_mode?: string;
    place_method?: string;
    radius?: number;
    inherit?: string;
    gradient?: string;
    partners?: object | [];
    representations?: {
        active?: string;
        atomic?: object;
        mesh?: object;
        packing?: object;
    };
    jitter_attempts?: number;
    max_jitter?: Array<number>;
    available_regions?: {
        interior?: object;
        surface?: object;
        outer_leaflet?: object;
        inner_leaflet?: object;
    };
    cutoff_boundary?: number;
    cutoff_surface?: number;
    orient_bias_range?: Array<number>;
    principal_vector?: Array<number>;
    perturb_axis_amplitude?: number;
    rejection_threshold?: number;
    rotation_axis?: Array<number>;
    rotation_range?: number;
}

export interface FirebaseGradient {
    name?: string;
    id?: string;
    dedup_hash?: string;
    description?: string;
    mode: string;
    mode_settings: object;
    weight_mode: string;
    weight_mode_settings?: object;
    pick_mode: string;
    reversed: boolean;
    invert?: string;
}

export interface FirebaseComposition {
    name?: string;
    id?: string;
    count?: number;
    dedup_hash?: string;
    molarity?: number;
    object?: string;
    inherit?: string;
    regions?: {
        interior?: Array<string|{count: number, object: string}>;
        surface?: Array<string|{count: number, object: string}>;
        outer_leaflet?: Array<string|{count: number, object: string}>;
        inner_leaflet?: Array<string|{count: number, object: string}>;
    }
};

export interface FirebaseRecipe {
    name?: string;
    dedup_hash?: string;
    bounding_box?: [][] | object;
    format_version?: string;
    recipe_path?: string;
    version?: string;
    id?: string;
    composition?: Dictionary<FirebaseComposition>;
    objects?: Dictionary<FirebaseObject>;
    gradients?: Dictionary<FirebaseGradient>;
};