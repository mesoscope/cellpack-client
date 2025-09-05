import { useState } from "react";
import { InputNumber, Select, Slider } from 'antd';
import { GradientOption } from "../../types";
import "./style.css";

interface GradientStrength {
    displayName: string;
    description: string;
    path: string;
    default: number;
    min: number;
    max: number;
}

interface GradientInputProps {
    displayName: string;
    description: string;
    gradientOptions: GradientOption[];
    defaultValue: string;
    changeHandler: (id: string, value: string | number) => void;
    getCurrentValue: (path: string) => string | number | undefined;
}

const GradientInput = (props: GradientInputProps): JSX.Element => {
    const { displayName, description, gradientOptions, defaultValue, changeHandler, getCurrentValue } = props;
    const [displayGradientStrength, setDisplayGradientStrength] = useState<boolean>(true);
    const initialOption = gradientOptions.find(option => option.value === defaultValue);
    const initialGradientStrength: GradientStrength | undefined = initialOption && initialOption.strength_path ? {
        displayName: initialOption.strength_display_name || initialOption.display_name + " Strength",
        description: initialOption.strength_description || "",
        path: initialOption.strength_path,
        default: initialOption.strength_default || 0.01,
        min: initialOption.strength_min || 0,
        max: initialOption.strength_max || 1,
    } : undefined;
    const [gradientStrengthData, setGradientStrengthData] = useState<GradientStrength | undefined>(initialGradientStrength);
    const [sliderValue, setSliderValue] = useState<number>(initialGradientStrength ? initialGradientStrength.default : 0);

    const gradientSelected = (value: string) => {
        const selectedOption = gradientOptions.find(option => option.value === value);
        if (!selectedOption) return;
        changeHandler(selectedOption.path, value); // update JSON with gradient choice
        if (selectedOption.strength_path) {
            setDisplayGradientStrength(true);
            const currVal = getCurrentValue(selectedOption.strength_path) as number | undefined || selectedOption.strength_default || 0.01;
            const strengthData: GradientStrength = {
                displayName: selectedOption.strength_display_name || selectedOption.display_name + " Strength",
                description: selectedOption.strength_description || "",
                path: selectedOption.strength_path,
                default: currVal,
                min: selectedOption.strength_min || 0,
                max: selectedOption.strength_max || 1,
            };
            setGradientStrengthData(strengthData);
            setSliderValue(strengthData.default);
        } else {
            setDisplayGradientStrength(false);
            setGradientStrengthData(undefined);
        }

    }

    const handleStrengthChange = (value: number | null, path: string) => {
        if (value === null) return;
        setSliderValue(value);
        changeHandler(path, value);
    };
    
    const selectOptions = gradientOptions.map((option) => ({
        label: option.display_name,
        value: option.value,
    }));
    return (
        <div>
            <div className="input-switch">
                <div className="input-label">
                    <strong>{displayName} </strong>
                    <small>{description}</small>
                </div>
                <Select
                    options={selectOptions}
                    defaultValue={defaultValue}
                    onChange={(e) => gradientSelected(e)}
                    style={{ width: 200, margin: '0 16px' }}
                />
            </div>
            {displayGradientStrength && gradientStrengthData && (
                <div className="input-switch">
                    <div className="input-label">
                        <strong>{gradientStrengthData.displayName}</strong>
                        <small>{gradientStrengthData.description}</small>
                    </div>
                    <Slider
                        min={gradientStrengthData.min}
                        max={gradientStrengthData.max}
                        defaultValue={gradientStrengthData.default}
                        onChange={(value) => handleStrengthChange(value, gradientStrengthData.path)}
                        value={sliderValue}
                        style={{ width: 100 }}
                        step={0.01}
                    />
                    <InputNumber
                        min={gradientStrengthData.min}
                        max={gradientStrengthData.max}
                        value={sliderValue}
                        defaultValue={gradientStrengthData.default}
                        onChange={(value) => handleStrengthChange(value, gradientStrengthData.path)}
                        step={0.01}
                        style={{ margin: '0 16px' }}
                    />
                </div>
            )}
        </div>
    );
};

export default GradientInput;