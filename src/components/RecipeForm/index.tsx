import { Dictionary } from "../../types";
import InputSwitch from "../InputSwitch";
import "./style.css";

interface RecipeFormProps {
    editableFields: Dictionary<any>[];
    handleChange: (id: string, value: string | number) => void;
}

const RecipeForm = (props: RecipeFormProps): JSX.Element => {
    const { editableFields, handleChange } = props;

    return (
        <div className="recipe-form-container">
            <div className="input-container">
                {editableFields.map((field) => (
                    <InputSwitch
                        key={field.filePath}
                        displayName={field.displayName}
                        inputType={field.inputType}
                        dataType={field.dataType}
                        description={field.description}
                        defaultValue={field.defaultValue}
                        min={field.min}
                        max={field.max}
                        options={field.options}
                        id={field.filePath}
                        changeHandler={handleChange}
                    />
                ))}
            </div>
        </div>
    );
};

export default RecipeForm;
