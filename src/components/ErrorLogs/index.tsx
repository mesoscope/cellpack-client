import { useState } from "react";
import { Collapse } from "antd";
import "./style.css";

interface ErrorLogsProps {
    errorLogs: string;
}

const ErrorLogs = (props: ErrorLogsProps): JSX.Element => {
    const { errorLogs } = props;
    const [viewErrorLogs, setViewErrorLogs] = useState<boolean>(true);

    const toggleLogs = () => {
        setViewErrorLogs(!viewErrorLogs);
    }
    const items = [{
        key: "1",
        label: "Logs",
        children: (
            <div className="log-box">
                <pre>{errorLogs}</pre>
            </div>
        )
    }];

    return (
        <div>
            <Collapse 
                items={items}
                activeKey={viewErrorLogs && errorLogs.length > 0 ? ["1"] : []}
                onChange={toggleLogs}
            />
        </div>
    );
};

export default ErrorLogs;