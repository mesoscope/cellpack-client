import React, { useState } from "react";
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
    changeHandler: (id: string, value: string | number) => void;
}

const InputSwitch = (props: InputSwitchProps): JSX.Element => {
    const { displayName, inputType, dataType, description, defaultValue, min, max, options, changeHandler, id } = props;
    const [sliderValue, setSliderValue] = useState(defaultValue);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = dataType === "integer" ? parseInt(e.target.value) : parseFloat(e.target.value);
        setSliderValue(value);
        changeHandler(id, value);
    };

    switch (inputType) {
        case "slider":
            return (
                <div className="input-switch">
                    <div >
                        <strong>{displayName} </strong>
                        <br />
                        <small>{description}</small>
                        <br />
                    </div>
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={dataType === "integer" ? 1 : 0.01}
                        defaultValue={defaultValue as number}
                        onChange={handleSliderChange}
                    />
                    <span>{sliderValue}</span>
                    <br />
                </div>
            );
        case "dropdown":
            return (
                <div className="input-switch">
                    <div className="input-label">
                        <strong>{displayName} </strong>
                        <br />
                        <small>{description}</small>
                        <br />
                    </div>
                    <select
                        defaultValue={defaultValue as string}
                        onChange={(e) => changeHandler(id, e.target.value)}
                    >
                        {options?.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </div>
            );
        default:
            return (
                <div className="input-switch">
                    <div className="input-label">
                        <strong>{displayName} </strong>
                        <br />
                        <small>{description}</small>
                        <br />
                    </div>
                    <input
                        type="text"
                        defaultValue={defaultValue as string}
                        onChange={(e) => changeHandler(id, e.target.value)}
                    />
                </div>
            );
    }
};

export default InputSwitch;
