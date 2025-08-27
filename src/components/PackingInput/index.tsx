import { useEffect, useState } from "react";
import { Dictionary, PackingInputs } from "../../types";
import { getPackingInputsDict } from "../../utils/firebase";
import { getFirebaseRecipe, jsonToString } from "../../utils/recipeLoader";
import Dropdown from "../Dropdown";
import JSONViewer from "../JSONViewer";
import RecipeForm from "../RecipeForm";
import * as editableFields from '../../editable-fields.json';
import "./style.css";

const editableFieldsDict: Dictionary<any[]> = JSON.parse(JSON.stringify(editableFields.default));

interface PackingInputProps {
    startPacking: (recipeId: string, configId: string, recipeString: string) => Promise<void>;
}

const PackingInput = (props: PackingInputProps): JSX.Element => {
    const { startPacking } = props;
    const [selectedRecipeId, setSelectedRecipeId] = useState("");
    const [selectedConfigId, setSelectedConfigId] = useState("");
    const [selectedInputId, setSelectedInputId] = useState("");
    const [inputOptions, setInputOptions] = useState<Dictionary<PackingInputs>>({});
    const [recipeStr, setRecipeStr] = useState<string>("");
    const [viewRecipe, setViewRecipe] = useState<boolean>(true);
    const [fieldsToDisplay, setFieldsToDisplay] = useState<Dictionary<any>[] | undefined>(undefined);

    useEffect(() => {
        const fetchData = async () => {
            const inputDict = await getPackingInputsDict();
            setInputOptions(inputDict);
        };
        fetchData();
    }, []);

    const selectInput = async (inputName: string) => {
        setSelectedInputId(inputName);
        const recipeId: string = inputOptions[inputName]?.recipe || "";
        const configId: string = inputOptions[inputName]?.config || "";
        await selectRecipe(recipeId);
        setSelectedConfigId(configId);
    }

    const selectRecipe = async (recipeId: string) => {
        setSelectedRecipeId(recipeId);
        const recJson = await getFirebaseRecipe(recipeId);
        const recStr = jsonToString(recJson);
        setFieldsToDisplay(editableFieldsDict[recipeId] || undefined);
        setRecipeStr(recStr);
    }

    const runPacking = async () => {
        setViewRecipe(false);
        startPacking(selectedRecipeId, selectedConfigId, recipeStr);
    };

    const toggleRecipe = () => {
        setViewRecipe(!viewRecipe);
    }

    const setDeepValue = (obj: any, path: string, value: any): any => {
        const keys = path.split('.');
        let current: any = obj;

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];

            if (i === keys.length - 1) {
                // Last key in the path, assign the value
                current[key] = value;
            } else {
                // Not the last key, ensure the intermediate object exists
                if (typeof current[key] !== 'object' || current[key] === null) {
                    // Doesn't exist, return original object without changes
                    console.warn(`Path "${path}" is invalid. Cannot set value.`);
                    return obj;
                }
                current = current[key]; // Move deeper into the object
            }
        }
        return obj;
    }

    const handleFormChange = (id: string, value: string | number) => {
        const recipeObj = JSON.parse(recipeStr);
        const updatedRecipe = setDeepValue(recipeObj, id, value);
        const updatedRecipeStr = JSON.stringify(updatedRecipe, null, 2);
        setRecipeStr(updatedRecipeStr);
    };

    return (
        <div>
            <div className="input-container">
                <Dropdown
                    value={selectedInputId}
                    placeholder="Select a recipe"
                    options={inputOptions}
                    onChange={selectInput}
                />
                <button onClick={runPacking} disabled={!selectedInputId}>
                    Pack
                </button>
            </div>
            {fieldsToDisplay && (
                <RecipeForm editableFields={fieldsToDisplay} handleChange={handleFormChange} />
            )}
            <div className="box">
                <JSONViewer
                    title="Recipe"
                    content={recipeStr}
                    isVisible={viewRecipe}
                    isEditable={fieldsToDisplay === undefined}
                    onToggle={toggleRecipe}
                    onChange={setRecipeStr}
                />
            </div>
        </div>
    );
};

export default PackingInput;