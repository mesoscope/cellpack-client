import { useEffect, useState } from "react";
import { FirebaseDict } from "../../types";
import { FIRESTORE_COLLECTIONS } from "../../constants/firebaseConstants";
import { getFirebaseRecipe, getDocById, getLocationDict } from "../../firebase";
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
    const [recipes, setRecipes] = useState<FirebaseDict>({});
    const [configs, setConfigs] = useState<FirebaseDict>({});
    const [recipeStr, setRecipeStr] = useState<string>("");
    const [configStr, setConfigStr] = useState<string>("");
    const [viewRecipe, setViewRecipe] = useState<boolean>(true);
    const [viewConfig, setViewConfig] = useState<boolean>(true);

    useEffect(() => {
        const fetchData = async () => {
            const recipeDict = await getLocationDict(FIRESTORE_COLLECTIONS.RECIPES);
            const configDict = await getLocationDict(FIRESTORE_COLLECTIONS.CONFIGS);
            setRecipes(recipeDict);
            setConfigs(configDict);
        };
        fetchData();
    }, []);

    const selectRecipe = async (recipe: string) => {
        setSelectedRecipeId(recipe);
        const recStr = await getFirebaseRecipe(recipe);
        setRecipeStr(recStr);
    }

    const selectConfig = async (config: string) => {
        setSelectedConfigId(config);
        const confStr = await getDocById(FIRESTORE_COLLECTIONS.CONFIGS, config);
        setConfigStr(confStr);
    }

    const runPacking = async () => {
        setViewConfig(false);
        setViewRecipe(false);
        startPacking(selectedRecipeId, selectedConfigId, recipeStr);
    };

    const toggleRecipe = () => {
        setViewRecipe(!viewRecipe);
    }

    const toggleConfig = () => {
        setViewConfig(!viewConfig);
    }

    return (
        <div>
            <div className="input-container">
                <Dropdown
                    value={selectedRecipeId}
                    placeholder="Select a recipe"
                    options={recipes}
                    onChange={selectRecipe}
                />
                <Dropdown
                    value={selectedConfigId}
                    placeholder="Select a config"
                    options={configs}
                    onChange={selectConfig}
                />
                <button onClick={runPacking} disabled={!selectedRecipeId}>
                    Pack
                </button>
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
                <JSONViewer
                    title="Config"
                    content={configStr}
                    isVisible={viewConfig}
                    isEditable={false}
                    onToggle={toggleConfig}
                />
            </div>
        </div>
    );
};

export default PackingInput;