/**
Utility helpers for safely reading/writing values within arbitrary JSON-like objects.

- Supports dot and bracket notation: `a.b[0].c`
- Does not create intermediate objects/arrays on `setAtPath`
- Type-safe with `JSONValue` recursive type
 */

export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export interface JSONObject { [key: string]: JSONValue; }
export type JSONArray = JSONValue[];

/** Type guards */
export const isJSONObject = (v: JSONValue): v is JSONObject =>
    typeof v === "object" && v !== null && !Array.isArray(v);

export const isJSONArray = (v: JSONValue): v is JSONArray =>
    Array.isArray(v);

/**
 * Split a JSON path into segments.
 * Supports dot paths and bracket indices: "a.b[0].c" -> ["a","b","0","c"]
 */
const toPathSegments = (path: string): string[] =>
    path
        // turn ANY bracket content into dot segments: a[-1] -> a.-1, a[foo] -> a.foo
        .replace(/\[([^\]]+)\]/g, ".$1")
        .split(".")
        .filter(Boolean);

/**
 * Safely read a value at a path from a JSONValue.
 * Returns undefined if the path is invalid.
 *
 * @example
 * getAtPath(obj, "a.b[2].c")
 */
export const getAtPath = (root: JSONValue, path: string): JSONValue | undefined => {
    const segs = toPathSegments(path);
    let cur: JSONValue = root;

    for (const seg of segs) {
        if (isJSONObject(cur)) {
            cur = cur[seg];
        } else if (isJSONArray(cur)) {
            const idx = Number(seg);
            if (!Number.isInteger(idx)) return undefined;
            cur = cur[idx];
        } else {
            return undefined;
        }
        if (cur === undefined) return undefined;
    }
    return cur;
};

/**
 * Safely set a value at a path in a JSONValue.
 * Returns true if the path exists and the assignment succeeded.
 * Does not create intermediate objects/arrays.
 *
 * @example
 * setAtPath(obj, "a.b[1].c", 42)
 */
export const setAtPath = (
    root: JSONValue,
    path: string,
    value: JSONValue
): boolean => {
    const segs = toPathSegments(path);
    if (segs.length === 0) return false;

    let cur: JSONValue = root;
    for (let i = 0; i < segs.length - 1; i++) {
        const seg = segs[i];
        if (isJSONObject(cur)) {
            const next = cur[seg];
            if (!isJSONObject(next) && !isJSONArray(next)) return false;
            cur = next;
        } else if (isJSONArray(cur)) {
            const idx = Number(seg);
            if (!Number.isInteger(idx) || idx < 0 || idx >= cur.length) return false;
            const next = cur[idx];
            if (!isJSONObject(next) && !isJSONArray(next)) return false;
            cur = next;
        } else {
            return false;
        }
    }

    const last = segs[segs.length - 1];
    if (isJSONObject(cur)) {
        cur[last] = value;
        return true;
    } else if (isJSONArray(cur)) {
        const idx = Number(last);
        if (!Number.isInteger(idx) || idx < 0 || idx >= cur.length) return false;
        cur[idx] = value;
        return true;
    }
    return false;
};
