import { useState, useEffect, useCallback } from "react";
import { Input, InputNumber, Select, Slider } from "antd";
import { GradientOption } from "../../types";
import {
    useSelectedRecipeId,
    useUpdateRecipeObj,
    useGetCurrentValue,
    useCurrentRecipeString,
} from "../../state/store";
import GradientInput from "../GradientInput";
import "./style.css";

interface InputSwitchProps {
    displayName: string;
    inputType: string;
    dataType: string;
    description: string;
    id: string;
    min?: number;
    max?: number;
    conversionFactor?: number;
    unit?: string;
    options?: string[];
    gradientOptions?: GradientOption[];
}

const InputSwitch = (props: InputSwitchProps): JSX.Element => {
    const { displayName, inputType, dataType, description, min, max, options, id, gradientOptions, conversionFactor, unit } = props;

    const selectedRecipeId = useSelectedRecipeId();
    const updateRecipeObj = useUpdateRecipeObj();
    const getCurrentValue = useGetCurrentValue();
    const recipeVersion = useCurrentRecipeString();

    // Conversion factor for numeric inputs where we want to display a
    // different unit in the UI than is stored in the recipe
    const conversion = conversionFactor ?? 1;

    // Stable getter for current value
    const getCurrentValueMemo = useCallback(() => {
        let value = getCurrentValue(id);
        if (!value) {
            if (dataType === "integer" || dataType === "float") {
                value = min ?? 0;
            } else {
                value = "";
            }
        }
        if (typeof value == "number") {
            value = value * conversion;
        }
        return value;
    }, [getCurrentValue, id, conversion, dataType, min]);

    // Local controlled state for the input UI
    const [value, setValue] = useState<string | number>(getCurrentValueMemo());

    // Reset local state when store value (or recipe) changes
    useEffect(() => {
        setValue(getCurrentValueMemo());
    }, [getCurrentValueMemo, recipeVersion]);

    const handleInputChange = (value: string | number | null) => {
        if (value == null || !selectedRecipeId) return;
        setValue(value);
        if (typeof value === "number") {
            // Convert back to original units for updating recipe object
            value = value / conversion;
        }
        updateRecipeObj(selectedRecipeId, { [id]: value });
    };

    switch (inputType) {
        case "slider": {
            const numericValue =
                typeof value === "number" ? value : Number(value) || 0;
            const step = dataType === "integer" ? 1 : 0.01;
            const maxValue = (max ?? 1) * conversion;

            return (
                <div className="input-switch">
                    <div className="input-label">
                        <strong>{displayName}</strong>{" "}
                        <small>{description}</small>
                    </div>
                    <div className="input-content">
                        <Slider
                            min={min}
                            max={maxValue}
                            step={step}
                            onChange={handleInputChange}
                            value={numericValue}
                            style={{ width: "60%" }}
                        />
                        <InputNumber
                            min={min}
                            max={maxValue}
                            step={step}
                            style={{ margin: "0 6px" }}
                            value={numericValue}
                            onChange={handleInputChange}
                        />
                        {unit && <span>{unit}</span>}
                    </div>
                </div>
            );
        }

        case "dropdown": {
            const selectOptions = options?.map((option) => ({
                label: option,
                value: option,
            })) || [];
            return (
                <div className="input-switch">
                    <div className="input-label">
                        <strong>{displayName}</strong>{" "}
                        <small>{description}</small>
                    </div>
                    <div className="input-content">
                        <Select
                            options={selectOptions}
                            value={String(value)}
                            onChange={handleInputChange}
                            style={{ width: 200, marginLeft: 10 }}
                        />
                    </div>
                </div>
            );
        }

        case "gradient": {
            return gradientOptions && gradientOptions.length > 0 ? (
                <GradientInput
                    displayName={displayName}
                    description={description}
                    gradientOptions={gradientOptions}
                    defaultValue={String(getCurrentValueMemo())}
                />
            ) : (
                <div>Issue reading gradient options</div>
            );
        }

        default: {
            return (
                <div className="input-switch">
                    <div className="input-label">
                        <strong>{displayName}</strong>{" "}
                        <small>{description}</small>
                    </div>
                    <Input
                        value={String(value)}
                        onChange={(e) => handleInputChange(e.target.value)}
                        style={{ width: 200, marginLeft: 10 }}
                    />
                </div>
            );
        }
    }
};

export default InputSwitch;
