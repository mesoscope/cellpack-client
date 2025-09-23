import { Select, Slider, InputNumber } from "antd";
import { GradientOption } from "../../types";
import {
    useSelectedRecipeId,
    useUpdateRecipeObj,
    useGetCurrentValue,
    useCurrentRecipeString,
} from "../../state/store";
import { getSelectedGradient, deriveGradientStrength, round2, toStore } from "../../utils/gradient";
import "./style.css";

interface GradientInputProps {
    displayName: string;
    description: string;
    gradientOptions: GradientOption[];
    defaultValue: string;
};

const GradientInput = (props: GradientInputProps): JSX.Element => {
    const { displayName, description, gradientOptions, defaultValue } = props;
    const selectedRecipeId = useSelectedRecipeId();
    const updateRecipeObj = useUpdateRecipeObj();
    const getCurrentValue = useGetCurrentValue();
    // Force re-render after restore/navigation
    useCurrentRecipeString();

    const { currentGradient, selectedOption } = getSelectedGradient(
        gradientOptions,
        defaultValue,
        getCurrentValue
    );

    const gradientStrengthData = deriveGradientStrength(selectedOption, getCurrentValue);

    const handleGradientChange = (value: string) => {
        if (!selectedRecipeId) return;
        const selectedOption = gradientOptions.find(option => option.value === value);
        if (!selectedOption || !selectedOption.path) return;

        // Make changes to JSON recipe
        const changes: Record<string, string | number> = {[selectedOption.path]: value};
        if (selectedOption.packing_mode && selectedOption.packing_mode_path) {
            changes[selectedOption.packing_mode_path] = selectedOption.packing_mode;
        }
        updateRecipeObj(selectedRecipeId, changes);
    };

    const handleStrengthChange = (val: number | null) => {
        if (val == null || !selectedRecipeId || !gradientStrengthData) return;
        const uiVal = round2(val);
        const storeVal = toStore(uiVal);
        updateRecipeObj(selectedRecipeId, { [gradientStrengthData.path]: storeVal });
    };

    const selectOptions = gradientOptions.map((option) => ({
        label: option.display_name,
        value: option.value,
    }));

    return (
        <div>
            <div className="input-switch">
                <div className="input-label">
                    <strong>{displayName}</strong>
                    <small>{description}</small>
                </div>
                <Select
                    options={selectOptions}
                    value={currentGradient}
                    onChange={handleGradientChange}
                    style={{ width: 200, margin: "0 16px" }}
                />
            </div>
            {gradientStrengthData && (
                <div className="input-switch">
                    <div className="input-label">
                        <strong>{gradientStrengthData.displayName}</strong>
                        <small>{gradientStrengthData.description}</small>
                    </div>
                    <Slider
                        id={gradientStrengthData.displayName}
                        min={gradientStrengthData.min}
                        max={gradientStrengthData.max}
                        onChange={(val) => handleStrengthChange(val)}
                        value={gradientStrengthData.uiValue}
                        step={0.01}
                        style={{ width: 100 }}
                    />
                    <InputNumber
                        id={gradientStrengthData.displayName + " Input"}
                        min={gradientStrengthData.min}
                        max={gradientStrengthData.max}
                        value={gradientStrengthData.uiValue}
                        onChange={(val) => handleStrengthChange(val)}
                        step={0.01}
                        style={{ margin: "0 16px" }}
                    />
                </div>
            )}
        </div>
    );
};

export default GradientInput;
