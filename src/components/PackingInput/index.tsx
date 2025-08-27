import { useEffect, useState } from "react";
import { Dictionary, PackingInputs } from "../../types";
import { getPackingInputsDict } from "../../utils/firebase";
import { Button } from "antd";
import { getFirebaseRecipe } from "../../utils/recipeLoader";
import Dropdown from "../Dropdown";
import JSONViewer from "../JSONViewer";
import "./style.css";

interface PackingInputProps {
    startPacking: (recipeId: string, configId: string, recipeString: string) => Promise<void>;
}

const PackingInput = (props: PackingInputProps): JSX.Element => {
    const { startPacking } = props;
    const [selectedRecipeId, setSelectedRecipeId] = useState("");
    const [selectedConfigId, setSelectedConfigId] = useState("");
    const [inputOptions, setInputOptions] = useState<Dictionary<PackingInputs>>({});
    const [recipeStr, setRecipeStr] = useState<string>("");
    const [viewRecipe, setViewRecipe] = useState<boolean>(true);

    useEffect(() => {
        const fetchData = async () => {
            const inputDict = await getPackingInputsDict();
            setInputOptions(inputDict);
        };
        fetchData();
    }, []);

    const selectInput = async (inputName: string) => {
        const recipeId: string = inputOptions[inputName]?.recipe || "";
        const configId: string = inputOptions[inputName]?.config || "";
        await selectRecipe(recipeId);
        setSelectedConfigId(configId);
    }

    const selectRecipe = async (recipeId: string) => {
        setSelectedRecipeId(recipeId);
        const recStr = await getFirebaseRecipe(recipeId);
        setRecipeStr(recStr);
    }

    const runPacking = async () => {
        setViewRecipe(false);
        startPacking(selectedRecipeId, selectedConfigId, recipeStr);
    };

    const toggleRecipe = () => {
        setViewRecipe(!viewRecipe);
    }

    return (
        <div>
            <div className="input-container">
                <Dropdown
                    placeholder="Select a recipe"
                    options={inputOptions}
                    onChange={selectInput}
                />
                <Button onClick={runPacking} disabled={!selectedRecipeId} style={{ marginLeft: 5 }}>
                    Pack
                </Button>
            </div>
            <div className="box">
                <JSONViewer
                    title="Recipe"
                    content={recipeStr}
                    isVisible={viewRecipe}
                    isEditable={true}
                    onToggle={toggleRecipe}
                    onChange={setRecipeStr}
                />
            </div>
        </div>
    );
};

export default PackingInput;