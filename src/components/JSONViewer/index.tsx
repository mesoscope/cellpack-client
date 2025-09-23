import { Collapse, Input } from "antd";
import { useState } from "react";
import "./style.css";

interface JSONViewerProps {
    title: string;
    content: string;
    isEditable: boolean;
    onChange: (value: string) => void;
}

const JSONViewer = (props: JSONViewerProps): JSX.Element => {
    const { title, content, isEditable, onChange } = props;
    const [viewContent, setViewContent] = useState<boolean>(true);

    if (!content) {
        return (<></>)
    }
    
    const items = [{
        key: "1",
        label: title,
        children: isEditable ? (
            <Input.TextArea 
                value={content} 
                onChange={(e) => onChange(e.target.value)}
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
                activeKey={viewContent ? ["1"] : []}
                onChange={() => setViewContent(!viewContent)}
            />
        </div>
    );
};

export default JSONViewer;