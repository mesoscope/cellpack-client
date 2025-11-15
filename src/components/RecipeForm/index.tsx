import { Button, Tooltip } from "antd";
import InputSwitch from "../InputSwitch";
import "./style.css";
import {
    useSelectedRecipeId,
    useFieldsToDisplay,
    useIsPacking,
    useIsOriginalRecipe,
} from "../../state/store";

interface RecipeFormProps {
    onStartPacking: () => Promise<void>;
    availableHeight: number;
}

const RecipeForm = ({ onStartPacking, availableHeight }: RecipeFormProps) => {
    const recipeId = useSelectedRecipeId();
    const fieldsToDisplay = useFieldsToDisplay();
    const isPacking = useIsPacking();
    const isOriginalRecipe = useIsOriginalRecipe();

    return (
        <div className="recipe-form" style={{ height: availableHeight }}>
            {fieldsToDisplay && (
                <div className="input-container">
                    {fieldsToDisplay.map((field) => (
                        <InputSwitch
                            key={field.id}
                            displayName={field.name}
                            inputType={field.input_type}
                            dataType={field.data_type}
                            description={field.description}
                            min={field.min}
                            max={field.max}
                            options={field.options}
                            id={field.path}
                            gradientOptions={field.gradient_options}
                            conversionFactor={field.conversion_factor}
                            unit={field.unit}
                        />
                    ))}
                </div>
            )}
            {recipeId && (
                <Tooltip
                    title={
                        isOriginalRecipe ? "Adjust any parameter to re-run" : ""
                    }
                >
                    <Button
                        onClick={onStartPacking}
                        color="primary"
                        variant="filled"
                        disabled={isPacking || isOriginalRecipe}
                        style={{ width: "100%", minHeight: 38 }}
                    >
                        <strong>Re-run</strong>
                    </Button>
                </Tooltip>
            )}
        </div>
    );
};
export default RecipeForm;
