import { Button } from "antd";
import { Dictionary, EditableField } from "../../types";
import InputSwitch from "../InputSwitch";
import "./style.css";

interface RecipeFormProps {
    submitEnabled: boolean;
    recipeId?: string;
    fieldsToDisplay?: EditableField[];
    submitPacking: () => Promise<void>;
    changeHandler: (changes: Dictionary<string | number>) => void;
    getCurrentValue: (path: string) => string | number | undefined;
}

const RecipeForm = (props: RecipeFormProps): JSX.Element => {
    const { submitEnabled, recipeId, fieldsToDisplay, submitPacking, changeHandler, getCurrentValue } = props;
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
                            changeHandler={changeHandler}
                            getCurrentValue={getCurrentValue}
                        />
                    ))}
                </div>
            )}
            {recipeId && (
                <Button
                    onClick={submitPacking}
                    color="primary"
                    variant="filled"
                    disabled={!submitEnabled}
                    style={{ width: '100%' }}
                >
                    Pack!
                </Button>
            )}
        </div>
    );
};
export default RecipeForm;