export interface Document {
    name?: string;
    original_location?: string;
    recipe_path?: string;
    recipe?: string;
    config?: string;
    editable_fields?: string[];
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

export type PackingInputs = {
    config: string;
    recipe: string;
    editable_fields?: EditableField[];
}

export type EditableField = {
    id: string;
    name: string;
    data_type: string;
    input_type: string;
    description: string;
    path: string;
    min?: number;
    max?: number;
    options?: string[];
    gradient_options?: GradientOption[];
    conversion_factor?: number;
    unit?: string;
}

export type GradientOption = {
    display_name: string;
    value: string;
    path: string;
    strength_path?: string;
    strength_default?: number;
    strength_min?: number;
    strength_max?: number;
    packing_mode?: string;
    packing_mode_path?: string;
    strength_description?: string;
    strength_display_name?: string;
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
    grid_file_path?: string;
    recipe_path?: string;
    composition?: Dictionary<FirebaseComposition>;
    objects?: Dictionary<FirebaseObject>;
    gradients?: Dictionary<FirebaseGradient>;
    optional_gradients?: string[];
};

export type Viewable<T extends { id: string; dedup_hash: string }> = Omit<T, "id" | "dedup_hash">;

export type ViewableComposition = Viewable<FirebaseComposition>;
export type ViewableObject = Viewable<FirebaseObject>;
export type ViewableGradient = Viewable<FirebaseGradient>;

export type ViewableRecipe = {
    name: string;
    version?: string;
    format_version?: string;
    bounding_box?: [][] | object;
    grid_file_path?: string;
    composition?: Dictionary<ViewableComposition>;
    objects?: Dictionary<ViewableObject>;
    gradients?: Dictionary<ViewableGradient>;
}