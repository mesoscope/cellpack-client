//api endpoints
const SUBMIT_PACKING_ECS = "https://bda21vau5c.execute-api.us-west-2.amazonaws.com/production/start-packing";

//s3 endpoints
const S3_BASE_URL = "https://s3.us-west-2.amazonaws.com";

export const getSubmitPackingUrl = (
    recipe?: string,
    config?: string,
) => {
    let url = SUBMIT_PACKING_ECS;
    if (recipe && config) {
        url += `?recipe=${recipe}&config=${config}`;
    } else if (recipe) {
        url += `?recipe=${recipe}`;
    } else if (config) {
        url += `?config=${config}`;
    }
    return url;
};

export const getS3ListUrl = (bucketName: string, folderPath: string) => {
    return `${S3_BASE_URL}/${bucketName}?prefix=${folderPath}/&list-type=2`;
};

export const getS3FileUrl = (bucketName: string, folderPath: string, fileName: string) => {
    return `${S3_BASE_URL}/${bucketName}/${folderPath}/${fileName}`;
};

//job status
export const JOB_STATUS = {
    SUBMITTED: "SUBMITTED",
    STARTING: "STARTING",
    RUNNING: "RUNNING",
    DONE: "DONE",
    FAILED: "FAILED",
};
