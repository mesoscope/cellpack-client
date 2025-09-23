import { GradientOption } from "../types";

interface GradientStrength {
    displayName: string;
    description: string;
    path: string;
    uiValue: number; // current slider value in UI domain
    min: number;
    max: number;
};

// Helpers: store <-> UI mapping
// Store: "smaller = stronger" (e.g., decay length). UI: "bigger = stronger" (0..1).
export const toUi = (storeVal: number) => Number((1 - storeVal).toFixed(2));
export const toStore = (uiVal: number) => Number((1 - uiVal).toFixed(2));
export const round2 = (n: number) => Number(n.toFixed(2));


/**
 * Derive the currently-selected gradient option from the store.
 *
 * Why this exists:
 * - All gradient options share the same recipe path (selectorPath).
 * - The recipe JSON in the store is the source of truth, so we must read
 *   the *current* value at that path every render (not just defaultValue).
 * - We then match that value against gradientOptions to get the full
 *   option object, which contains strength settings, etc.
 *
 * This replaces the old local-state approach, ensuring that Restore /
 * navigation stay in sync with the store.
 */
export function getSelectedGradient(
    gradientOptions: GradientOption[],
    defaultValue: string,
    getCurrentValue: (path: string) => unknown
): {

    currentGradient: string;
    selectedOption: GradientOption;
} {
    if (!gradientOptions.length) {
        return { currentGradient: defaultValue, selectedOption: { value: defaultValue, display_name: defaultValue, path: "" } as GradientOption };
    }

    // 2) Shared selector path (all options for this control share it)
    const selectorPath = gradientOptions[0].path ?? "";

    // 3) Current gradient string from store, or fallback to default
    const raw = selectorPath ? getCurrentValue(selectorPath) : undefined;
    const currentGradient = (typeof raw === "string" ? raw : defaultValue) ?? defaultValue;

    // 4) The full option object for that value, or first as fallback
    const selectedOption =
        gradientOptions.find(o => o.value === currentGradient) ?? gradientOptions[0];

    return { currentGradient, selectedOption };
}


export function deriveGradientStrength(
    opt: GradientOption | undefined,
    getCurrentValue: (path: string) => unknown
): GradientStrength | undefined {
    if (!opt?.strength_path) return undefined;

    const storeMin = opt.strength_min ?? 0;
    const storeMax = opt.strength_max ?? 0.99;

    const uiMin = toUi(storeMax);
    const uiMax = toUi(storeMin);

    const clampUi = (v: number) => Math.min(uiMax, Math.max(uiMin, v));
    const storeRaw = getCurrentValue(opt.strength_path);
    const storeNum =
        typeof storeRaw === "number"
            ? storeRaw
            : opt.strength_default ?? storeMin;
    const uiValue = round2(clampUi(toUi(storeNum)));

    return {
        displayName: opt.strength_display_name ?? `${opt.display_name} Strength`,
        description:
            opt.strength_description ??
            "Higher values will make the gradient stronger",
        path: opt.strength_path,
        uiValue,
        min: uiMin,
        max: uiMax,
    };
}