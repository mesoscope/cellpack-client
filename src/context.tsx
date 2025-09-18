import { createContext } from "react";
import { Dictionary, PackingInputs } from "./types";

interface PackingContextType {
    selectedInput: PackingInputs | undefined,
    changeHandler: (updates: Dictionary<string | number>) => void;
    getCurrentValue: (path: string) => string | number | undefined;
    submitPacking: () => Promise<void>;
};

export const PackingContext = createContext<PackingContextType>({
    selectedInput: undefined,
    changeHandler: async () => {},
    getCurrentValue: () => undefined,
    submitPacking: async () => {},
});