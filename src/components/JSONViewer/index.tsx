import { Collapse, Input } from "antd";
import "./style.css";

interface JSONViewerProps {
    title: string;
    content: string;
    isVisible: boolean;
    isEditable?: boolean;
    onToggle: () => void;
    onChange?: (value: string) => void;
}

const JSONViewer = (props: JSONViewerProps): JSX.Element => {
    const { title, content, isVisible, isEditable = false, onToggle, onChange } = props;
    if (!content) {
        return (<></>)
    }
    
    const items = [{
        key: "1",
        label: title,
        children: isEditable ? (
            <Input.TextArea 
                value={content} 
                onChange={(e) => onChange?.(e.target.value)}
                rows={14}
            />
        ) : (
            <pre className="json-content">{content}</pre>
        )
    }];
    
    return (
        <div className={`${title.toLowerCase()}-box`}>
            <Collapse 
                items={items}
                activeKey={isVisible ? ["1"] : []}
                onChange={() => onToggle()}
            />
        </div>
    );
};

export default JSONViewer;