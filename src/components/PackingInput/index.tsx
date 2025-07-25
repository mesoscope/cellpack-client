import { useEffect, useState } from "react";
import { FirebaseDict } from "../../types";
import { FIRESTORE_COLLECTIONS } from "../../constants/firebaseConstants";
import { getFirebaseRecipe, getDocById, getLocationDict } from "../../firebase";
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

    const getRecipes = async () => {
        const recipeDict = await getLocationDict(FIRESTORE_COLLECTIONS.RECIPES);
        return recipeDict;
    };

    useEffect(() => {
        const fetchRecipes = async () => {
            const recipeDict = await getRecipes();
            setRecipes(recipeDict);
        };
        fetchRecipes();
    }, []);

    const getConfigs = async () => {
        const configDict = await getLocationDict(FIRESTORE_COLLECTIONS.CONFIGS);
        return configDict;
    };

    useEffect(() => {
        const fetchConfigs = async () => {
            const configDict = await getConfigs();
            setConfigs(configDict);
        };
        fetchConfigs();
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
                <select
                    value={selectedRecipeId}
                    onChange={(e) => selectRecipe(e.target.value)}
                >
                    <option value="" disabled>
                        Select a recipe
                    </option>
                    {Object.entries(recipes).map(([key, value]) => (
                        <option key={key} value={value["firebaseId"]}>
                            {key}
                        </option>
                    ))}
                </select>
                <select
                    value={selectedConfigId}
                    onChange={(e) => selectConfig(e.target.value)}
                >
                    <option value="" disabled>
                        Select a config
                    </option>
                    {Object.entries(configs).map(([key, value]) => (
                        <option key={key} value={value["firebaseId"]}>
                            {key}
                        </option>
                    ))}
                </select>
                <button onClick={runPacking} disabled={!selectedRecipeId}>
                    Pack
                </button>
            </div>
            <div className="box">
                {recipeStr.length > 0 && (
                    <div className="recipeBox">
                        <button type="button" className="collapsible" onClick={toggleRecipe}>Recipe</button>
                        <div className="recipeJSON">
                            {viewRecipe && (
                                <textarea value={recipeStr} onChange={e => setRecipeStr(e.target.value)}/>
                            )}
                        </div>
                    </div>
                )}
                {configStr.length > 0 && (
                    <div className="configBox">
                        <button type="button" className="collapsible" onClick={toggleConfig}>Config</button>
                        <div className="configJSON">
                            {viewConfig && (
                                <pre>{configStr}</pre>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PackingInput;