import { useState } from "react";
import { Button, Drawer } from "antd";
import { usePackingData } from "../../state/store";
import { JOB_STATUS } from "../../constants/aws";
import "./style.css";

const ErrorLogs = (): JSX.Element => {
    const [viewErrorLogs, setViewErrorLogs] = useState<boolean>(true);
    const {jobStatus, jobLogs: errorLogs} = usePackingData();

    const toggleLogs = () => {
        setViewErrorLogs(!viewErrorLogs);
    };

    if (jobStatus !== JOB_STATUS.FAILED) {
        return <></>
    };

    return (
        <>
            <Button color="primary" variant="filled" onClick={toggleLogs}>
                Logs
            </Button>
            <Drawer
                title="Logs"
                placement="right"
                closable={true}
                onClose={toggleLogs}
                open={viewErrorLogs}
            >
                <div className="log-box">
                    <pre>{errorLogs}</pre>
                </div>
            </Drawer>
        </>
    );
};

export default ErrorLogs;
