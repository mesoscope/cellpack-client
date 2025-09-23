import { Button } from "antd";
import InputSwitch from "../InputSwitch";
import "./style.css";
import {
    useSelectedRecipeId,
    useFieldsToDisplay,
    useIsCurrentRecipeModified,
    useRestoreRecipeDefault,
    useIsPacking,
} from "../../state/store";

interface RecipeFormProps {
    submitEnabled: boolean;
    onStartPacking: () => Promise<void>;
}

const RecipeForm = ({ submitEnabled, onStartPacking }: RecipeFormProps) => {
    const recipeId = useSelectedRecipeId();
    const fieldsToDisplay = useFieldsToDisplay();
    const isModified = useIsCurrentRecipeModified();
    const restoreRecipeDefault = useRestoreRecipeDefault();
    const isPacking = useIsPacking();

    return (
        <div className="recipe-form">
            {fieldsToDisplay && (
                <div className="input-container">
                    <h3>Options</h3>
                    {fieldsToDisplay.map((field) => (
                        <InputSwitch
                            key={field.id}
                            displayName={field.name}
                            inputType={field.input_type}
                            dataType={field.data_type}
                            description={field.description}
                            defaultValue={field.default}
                            min={field.min}
                            max={field.max}
                            options={field.options}
                            id={field.path}
                            gradientOptions={field.gradient_options}
                        />
                    ))}
                </div>
            )}
            {recipeId && isModified && (
                <Button
                    onClick={() => restoreRecipeDefault(recipeId)}
                    variant="outlined"
                    style={{ width: "100%", marginBottom: "8px" }}
                >
                    Restore Default Recipe Options
                </Button>
            )}
            {recipeId && (
                <Button
                    onClick={onStartPacking}
                    color="primary"
                    variant="filled"
                    disabled={isPacking || !submitEnabled}
                    style={{ width: "100%" }}
                >
                    Pack!
                </Button>
            )}
        </div>
    );
};
export default RecipeForm;