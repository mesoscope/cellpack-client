import { describe, it, expect } from "vitest";
import { JSONValue, getAtPath, setAtPath } from "../utils/jsonPath";

describe("jsonPath", () => {
    const makeObj = (): JSONValue => ({
        a: { b: [{ c: 1 }, { c: 2 }, { c: 3 }] },
        x: [{ y: 10 }, { y: 20 }],
        s: "str",
        n: 5,
        z: null,
    });

    it("reads simple object paths", () => {
        const obj = makeObj();
        expect(getAtPath(obj, "a.b[0].c")).toBe(1);
        expect(getAtPath(obj, "a.b[2].c")).toBe(3);
    });

    it("reads array paths", () => {
        const obj = makeObj();
        expect(getAtPath(obj, "x[1].y")).toBe(20);
    });

    it("returns undefined for invalid paths", () => {
        const obj = makeObj();
        expect(getAtPath(obj, "a.b[10].c")).toBeUndefined();
        expect(getAtPath(obj, "a.missing.key")).toBeUndefined();
        expect(getAtPath(obj, "s.key")).toBeUndefined(); // string is not object
    });

    it("sets values at valid paths", () => {
        const obj = makeObj();
        const ok = setAtPath(obj, "a.b[1].c", 42);
        expect(ok).toBe(true);
        expect(getAtPath(obj, "a.b[1].c")).toBe(42);
    });

    it("rejects setting at invalid paths", () => {
        const obj = makeObj();
        expect(setAtPath(obj, "a.b[10].c", 1)).toBe(false);
        expect(setAtPath(obj, "s.key", 1)).toBe(false);
        expect(setAtPath(obj, "", 1 as JSONValue)).toBe(false);
    });

    it("sets array element when last segment is index", () => {
        const obj = makeObj();
        const ok = setAtPath(obj, "x[0]", { y: 99 });
        expect(ok).toBe(true);
        expect(getAtPath(obj, "x[0].y")).toBe(99);
    });
    it("handles numeric-looking object keys (not arrays)", () => {
        const obj: JSONValue = { obj: { "0": { key: 1 } } };
        expect(getAtPath(obj, "obj.0.key")).toBe(1);
        expect(setAtPath(obj, "obj.0.key", 2)).toBe(true);
        expect(getAtPath(obj, "obj.0.key")).toBe(2);
    });

    it("rejects invalid indices and non-integer indices", () => {
        const obj: JSONValue = { a: [1, 2, 3] };
        expect(getAtPath(obj, "a[-1]")).toBeUndefined();
        expect(getAtPath(obj, "a[1.2]")).toBeUndefined();
        expect(setAtPath(obj, "a[-1]", 9 as JSONValue)).toBe(false);
        expect(setAtPath(obj, "a[3]", 9 as JSONValue)).toBe(false);
    });

    it("fails when encountering non-object mid-path", () => {
        const obj: JSONValue = { a: 10 };
        expect(getAtPath(obj, "a.x")).toBeUndefined();
        expect(setAtPath(obj, "a.x", 1 as JSONValue)).toBe(false);
    });

    it("mixes bracket and dot", () => {
        const obj: JSONValue = { a: [{ b: [{ c: 5 }] }] };
        expect(getAtPath(obj, "a[0].b[0].c")).toBe(5);
        expect(setAtPath(obj, "a[0].b[0].c", 7 as JSONValue)).toBe(true);
        expect(getAtPath(obj, "a[0].b[0].c")).toBe(7);
    });

    it("does not create intermediates", () => {
        const obj: JSONValue = { a: {} };
        expect(setAtPath(obj, "a.missing.k", 3 as JSONValue)).toBe(false);
    });
});
