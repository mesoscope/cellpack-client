//api endpoints
const SUBMIT_PACKING_ECS = "https://bda21vau5c.execute-api.us-west-2.amazonaws.com/production/start-packing";

export const getSubmitPackingUrl = (
    recipe: string,
    config?: string,
) => {
    let url = `${SUBMIT_PACKING_ECS}?recipe=${recipe}`;
    if (config) {
        url += `&config=${config}`;
    }
    return url;
};

//job status
export const JOB_STATUS = {
    SUBMITTED: "SUBMITTED",
    STARTING: "STARTING",
    RUNNING: "RUNNING",
    DONE: "DONE",
    FAILED: "FAILED",
};
