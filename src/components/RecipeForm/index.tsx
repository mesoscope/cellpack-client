import { Button } from "antd";
import { useContext } from "react";
import { PackingContext } from "../../context";
import InputSwitch from "../InputSwitch";
import "./style.css";

interface RecipeFormProps {
    submitEnabled: boolean;
}

const RecipeForm = (props: RecipeFormProps): JSX.Element => {
    const { submitEnabled } = props;
    const { selectedInput, submitPacking } = useContext(PackingContext);

    return (
        <div className="recipe-form">
            {selectedInput?.editableFields && (
                <div className="input-container">
                    <h3>Options</h3>
                    {selectedInput.editableFields.map((field) => (
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
            { selectedInput && (
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