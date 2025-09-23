import { useCallback, useEffect } from "react";
import {
    useSelectedRecipeId,
    useCurrentRecipeString,
    useFieldsToDisplay,
    useInputOptions,
    useIsLoading,
    useLoadInputOptions,
    useSelectInput,
    useUpdateRecipeString,
    useStartPacking,
    useLoadAllRecipes,
} from "../../state/store";
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
    const selectedRecipeId = useSelectedRecipeId();
    const recipeString = useCurrentRecipeString();
    const fieldsToDisplay = useFieldsToDisplay();
    const inputOptions = useInputOptions();
    const isLoading = useIsLoading();

    const loadInputOptions = useLoadInputOptions();
    const loadAllRecipes = useLoadAllRecipes();
    const selectInput = useSelectInput();
    const updateRecipeString = useUpdateRecipeString();
    const storeStartPacking = useStartPacking();

    const preFetchInputsAndRecipes = useCallback(async () => {
        await loadInputOptions();
        await loadAllRecipes();
    }, [loadInputOptions, loadAllRecipes]);

    // Load input options on mount
    useEffect(() => {
        preFetchInputsAndRecipes();
    }, [loadInputOptions, loadAllRecipes, preFetchInputsAndRecipes]);

    const handleStartPacking = async () => {
        await storeStartPacking(startPacking);
    };

    const handleRecipeStringChange = (newString: string) => {
        if (selectedRecipeId) {
            updateRecipeString(selectedRecipeId, newString);
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <div className="recipe-select">
                <div>Packing Recipe</div>
                <Dropdown
                    placeholder="Select an option"
                    options={inputOptions}
                    onChange={selectInput}
                />
            </div>
            <div className="recipe-content">
                <JSONViewer
                    title="Recipe"
                    content={recipeString}
                    isEditable={fieldsToDisplay === undefined}
                    onChange={handleRecipeStringChange}
                />
                <RecipeForm
                    submitEnabled={submitEnabled}
                    onStartPacking={handleStartPacking}
                />
            </div>
        </div>
    );
};

export default PackingInput;