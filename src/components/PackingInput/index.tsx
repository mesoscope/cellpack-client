import { useEffect, useState } from "react";
import { PackingContext } from "../../context";
import { Dictionary, PackingInputs } from "../../types";
import { getPackingInputsDict } from "../../utils/recipeLoader";
import { jsonToString } from "../../utils/recipeLoader";
import Dropdown from "../Dropdown";
import JSONViewer from "../JSONViewer";
import RecipeForm from "../RecipeForm";
import "./style.css";


interface PackingInputProps {
    startPacking: (recipeId: string, configId: string, recipeString: string) => Promise<void>;
    submitEnabled: boolean;
}

const PackingInput = (props: PackingInputProps): JSX.Element => {
    const { startPacking, submitEnabled } = props;
    const [selectedInput, setSelectedInput] = useState<PackingInputs | undefined>(undefined);
    const [inputOptions, setInputOptions] = useState<Dictionary<PackingInputs>>({});
    const [recipesLoading, setRecipesLoading] = useState<boolean>(true);
    const [recipeStr, setRecipeStr] = useState<string>("");

    useEffect(() => {
        const fetchData = async () => {
            setRecipesLoading(true);
            const inputDict = await getPackingInputsDict();
            setInputOptions(inputDict);
            setRecipesLoading(false);
        };
        fetchData();
    }, []);

    const selectInput = async (inputName: string) => {
        if (!inputOptions[inputName]) return;

        // Reset current recipe to deep copy of initial recipe when switching inputs
        setSelectedInput({
            ...inputOptions[inputName],
            currentRecipeObj: JSON.parse(JSON.stringify(inputOptions[inputName].initialRecipeObj))
        });

        const recString = jsonToString(inputOptions[inputName].initialRecipeObj);
        console.log("Setting recipe string to: ", recString);
        setRecipeStr(recString);
    };

    const runPacking = async () => {
        if (!selectedInput) return;

        const recString = jsonToString(selectedInput.currentRecipeObj);
        startPacking(selectedInput.recipeId, selectedInput.configId, recString);
    };

    const handleFormChange = (changes: Dictionary<string | number>) => {
        if (!selectedInput) return;

        const recObj: any = selectedInput.currentRecipeObj;
        for (const [id, value] of Object.entries(changes)) {
            const keys = id.split('.');
            let current = recObj;
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];

                if (i === keys.length - 1) {
                    // Last key in the path, assign the value
                    current[key] = value;
                } else {
                    // Not the last key, ensure the intermediate object exists
                    if (typeof current[key] !== 'object' || current[key] === null) {
                        // Doesn't exist, return original object without changes
                        console.warn(`Path "${id}" is invalid. Cannot set value.`);
                        return;
                    }
                    current = current[key];
                }
            }
        }
        setSelectedInput( { ...selectedInput, currentRecipeObj: recObj })
        setRecipeStr(jsonToString(recObj));
    };

    const getCurrentValue = (path: string): string | number | undefined => {
        if (!selectedInput) return undefined;

        const keys = path.split('.');
        let current: any = selectedInput.currentRecipeObj;
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (current[key] === undefined) {
                return undefined;
            }
            current = current[key];
        }
        return current;
    }

    const updateRecipeStr = (newStr: string) => {
        if (!selectedInput) return;
        try {
            const newObj = JSON.parse(newStr);
            setSelectedInput( { ...selectedInput, currentRecipeObj: newObj } )
            setRecipeStr(newStr);
        } catch (e) {
            console.error("Invalid JSON string: ", e);
            setRecipeStr(newStr);
            return;
        }
    }

    return (
        <div>
            <PackingContext.Provider value={{
                selectedInput: selectedInput,
                submitPacking: runPacking,
                changeHandler: handleFormChange,
                getCurrentValue: getCurrentValue
            }}>
                <div className="recipe-select">
                    <div>Packing Recipe</div>
                    <Dropdown
                        placeholder="Select an option"
                        options={inputOptions}
                        onChange={selectInput}
                        loading={recipesLoading}
                    />
                </div>
                <div className="recipe-content">
                    <JSONViewer
                        title="Recipe"
                        content={recipeStr}
                        isEditable={selectedInput?.editableFields === undefined}
                        onChange={updateRecipeStr}
                    />
                    <RecipeForm submitEnabled={submitEnabled} />
                </div>
            </PackingContext.Provider>
        </div>
    );
};

export default PackingInput;