import { Select } from "antd";
import { Dictionary, PackingInputs } from "../../types";

interface DropdownProps {
    placeholder: string;
    options: Dictionary<PackingInputs>;
    onChange: (value: string) => void;
    loading?: boolean;
}

const Dropdown = (props: DropdownProps): JSX.Element => {
    const { placeholder, options, onChange, loading } = props;
    const selectOptions = Object.entries(options).map(([key]) => (
        {
            label: <span>{key}</span>,
            value: key,
        }
    ));

    return (
        <Select
            defaultValue={undefined}
            onChange={onChange}
            placeholder={loading ? "Loading..." : placeholder}
            options={selectOptions}
            style={{ width: "100%", paddingLeft: 5 }}
            disabled={loading}
        />
    );
};

export default Dropdown;