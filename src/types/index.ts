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

export type FirebaseDict = {
    [key: string]: Dictionary<string>;
};

export interface Dictionary<T> {
    [Key: string]: T;
}

export interface RefsByCollection {
    recipes: Dictionary<FirebaseRecipe>;
    composition: Dictionary<FirebaseComposition>;
    objects: Dictionary<FirebaseObject>;
    gradients: Dictionary<FirebaseGradient>;
}

export interface FirebaseObject {
    name: string;
    id: string;
    dedup_hash: string;
    type?: string;
    color?: Array<number>;
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
    name: string;
    id: string;
    dedup_hash: string;
    description?: string;
    mode?: string;
    mode_settings?: object;
    weight_mode?: string;
    weight_mode_settings?: object;
    pick_mode?: string;
    reversed?: boolean;
    invert?: string;
}

export type RegionObject = {
    count: number;
    object: string;
}

export interface FirebaseComposition {
    name: string;
    id: string;
    dedup_hash: string;
    count?: number;
    molarity?: number;
    object?: string;
    inherit?: string;
    regions?: {
        interior?: Array<string|RegionObject>;
        surface?: Array<string|RegionObject>;
        outer_leaflet?: Array<string|RegionObject>;
        inner_leaflet?: Array<string|RegionObject>;
    }
};

export interface FirebaseRecipe {
    name: string;
    id: string;
    dedup_hash: string;
    version?: string;
    format_version?: string;
    bounding_box?: [][] | object;
    recipe_path?: string;
    composition?: Dictionary<FirebaseComposition>;
    objects?: Dictionary<FirebaseObject>;
    gradients?: Dictionary<FirebaseGradient>;
};

export type ViewableComposition = Omit<FirebaseComposition, "name" | "id" | "dedup_hash">
export type ViewableObject = Omit<FirebaseObject, "name" | "id" | "dedup_hash">
export type ViewableGradient = Omit<FirebaseGradient, "name" | "id" | "dedup_hash">

export type ViewableRecipe = {
    version?: string;
    format_version?: string;
    bounding_box?: [][] | object;
    recipe_path?: string;
    composition?: Dictionary<ViewableComposition>;
    objects?: Dictionary<ViewableObject>;
    gradients?: Dictionary<ViewableGradient>;
}