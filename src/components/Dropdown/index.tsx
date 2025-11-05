import { Select } from "antd";
import { Dictionary, RecipeManifest } from "../../types";

interface DropdownProps {
    placeholder: string;
    options: Dictionary<RecipeManifest>;
    value?: string;
    onChange: (value: string) => void;
}

const Dropdown = (props: DropdownProps): JSX.Element => {
    const { placeholder, options, value, onChange } = props;
    const selectOptions = Object.entries(options).map(([key, value]) => (
        {
            label: <span>{value.displayName}</span>,
            value: key,
        }
    ));

    return (
        <Select
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            options={selectOptions}
            style={{ width: "100%", paddingLeft: 5 }}
        />
    );
};

export default Dropdown;