import { useState } from "react";
import { Button } from "antd";
import { downloadOutputs } from "../../utils/aws";
import { JOB_STATUS } from "../../constants/aws";
import { usePackingData } from "../../state/store";
import "./style.css";
import ErrorLogs from "../ErrorLogs";

const StatusBar = (): JSX.Element => {
    const { jobStatus, runTime, jobId, outputDir } =
        usePackingData();
    const [isDownloading, setIsDownloading] = useState(false);

    const downloadResults = async (jobId: string) => {
        setIsDownloading(true);
        await downloadOutputs(jobId, outputDir);
        setIsDownloading(false);
    };

    const jobSucceeded = jobStatus == JOB_STATUS.DONE;
    
    if (!jobStatus) {
        return <></>;
    }

    return (
        <>
            <div className="status-container status-bar">
                <div>
                    <b>Status</b> {jobStatus}
                </div>
                {jobSucceeded && runTime > 0 && (
                    <div>
                        <b>Run time</b> {runTime} sec
                    </div>
                )}
            </div>
            {jobSucceeded && (
                <Button
                    onClick={() => downloadResults(jobId)}
                    loading={isDownloading}
                    color="primary"
                    variant="filled"
                    className="download-button"
                >
                    Download Packing Result
                </Button>
            )}
            <ErrorLogs />
        </>
    );
};

export default StatusBar;
