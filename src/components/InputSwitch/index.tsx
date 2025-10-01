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
    defaultValue: string | number;
    min?: number;
    max?: number;
    options?: string[];
    gradientOptions?: GradientOption[];
}

const InputSwitch = (props: InputSwitchProps): JSX.Element => {
    const { displayName, inputType, dataType, description, defaultValue, min, max, options, id, gradientOptions } = props;

    const selectedRecipeId = useSelectedRecipeId();
    const updateRecipeObj = useUpdateRecipeObj();
    const getCurrentValue = useGetCurrentValue();
    const recipeVersion = useCurrentRecipeString();

    // Stable getter for current value, with default fallback
    const getCurrentValueMemo = useCallback(() => {
        const v = getCurrentValue(id);
        return v ?? defaultValue;
    }, [getCurrentValue, id, defaultValue]);

    // Local controlled state for the input UI
    const [value, setValue] = useState<string | number>(getCurrentValueMemo());

    // Reset local state when store value (or recipe) changes
    useEffect(() => {
        setValue(getCurrentValueMemo());
    }, [getCurrentValueMemo, recipeVersion]);

    const handleSliderChange = (n: number | null) => {
        if (n == null || !selectedRecipeId) return;
        setValue(n);
        updateRecipeObj(selectedRecipeId, { [id]: n });
    };

    const handleSelectChange = (s: string) => {
        if (!selectedRecipeId) return;
        setValue(s);
        updateRecipeObj(selectedRecipeId, { [id]: s });
    };

    const handleInputChange = (s: string) => {
        if (!selectedRecipeId) return;
        setValue(s);
        updateRecipeObj(selectedRecipeId, { [id]: s });
    };

    switch (inputType) {
        case "slider": {
            const numericValue =
                typeof value === "number" ? value : Number(value) || 0;
            const step = dataType === "integer" ? 1 : 0.01;

            return (
                <div className="input-switch">
                    <div className="input-label">
                        <strong>{displayName}</strong>{" "}
                        <small>{description}</small>
                    </div>
                    <Slider
                        min={min}
                        max={max}
                        step={step}
                        onChange={handleSliderChange}
                        value={numericValue}
                        style={{ width: 100 }}
                    />
                    <InputNumber
                        min={min}
                        max={max}
                        step={step}
                        style={{ margin: "0 16px" }}
                        value={numericValue}
                        onChange={handleSliderChange}
                    />
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
                    <Select
                        options={selectOptions}
                        value={String(value)}
                        onChange={handleSelectChange}
                        style={{ width: 200, marginLeft: 10 }}
                    />
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
