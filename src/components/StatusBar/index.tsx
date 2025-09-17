import { useState } from "react";
import { Button } from "antd";
import { downloadOutputs } from "../../utils/aws";
import { JOB_STATUS } from "../../constants/aws";
import "./style.css";

interface StatusBarProps {
    jobStatus: string;
    runTime: number;
    jobId: string;
} 

const StatusBar = (props: StatusBarProps): JSX.Element => {
    const { jobStatus, runTime, jobId } = props;
    const [isDownloading, setIsDownloading] = useState(false);

    const downloadResults = async (jobId: string) => {
        setIsDownloading(true);
        await downloadOutputs(jobId);
        setIsDownloading(false);
    }

    const jobSucceeded = jobStatus == JOB_STATUS.DONE;
    
    return (
        <div className="status-row">
            <div className="status-container status-bar">
                <div><b>Status</b> {jobStatus}</div>
                {jobSucceeded && runTime > 0 && (<div><b>Run time</b> {runTime} sec</div>)}
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
        </div>
    )
}

export default StatusBar;