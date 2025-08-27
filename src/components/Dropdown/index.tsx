import { Select } from "antd";
import { FirebaseDict } from "../../types";

interface DropdownProps {
    placeholder: string;
    options: FirebaseDict;
    onChange: (value: string) => void;
}

const Dropdown = (props: DropdownProps): JSX.Element => {
    const { placeholder, options, onChange } = props;
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
            placeholder={placeholder}
            options={selectOptions}
            style={{ width: 200 }}
        />
    );
};

export default Dropdown;