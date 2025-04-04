import { useEffect, useState } from "react";
import "./App.css";
import { queryFirebase, getLocationDict, getDocById, getFirebaseRecipe } from "./firebase";
import {
    getSubmitPackingUrl,
    packingStatusUrl,
    getLogsUrl,
    JobStatus,
} from "./constants/awsBatch";
import {
    FIRESTORE_COLLECTIONS
} from "./constants/firebaseConstants";
import { SIMULARIUM_EMBED_URL } from "./constants/urls";
import {
    AWSBatchJobsResponse,
    CloudWatchLogsResponse,
    FirebaseDict,
} from "./types";

function App() {
    const [recipes, setRecipes] = useState<FirebaseDict>({});
    const [configs, setConfigs] = useState<FirebaseDict>({});
    const [selectedRecipe, setSelectedRecipe] = useState("");
    const [selectedConfig, setSelectedConfig] = useState("");
    const [jobId, setJobId] = useState("");
    const [jobStatus, setJobStatus] = useState("");
    const [logStreamName, setLogStreamName] = useState(
        ""
    );
    const [jobLogs, setJobLogs] = useState<string[]>([]);
    const [resultUrl, setResultUrl] = useState<string>("");
    const [recipeStr, setRecipeStr] = useState<string>("");
    const [configStr, setConfigStr] = useState<string>("");
    const [viewRecipe, setViewRecipe] = useState<boolean>(true);
    const [viewConfig, setViewConfig] = useState<boolean>(true);
    const [viewLogs, setViewLogs] = useState<boolean>(true);

    const submitRecipe = async () => {
        const firebaseRecipe = "firebase:recipes/" + selectedRecipe
        const url = getSubmitPackingUrl(firebaseRecipe, selectedConfig);
        const request: RequestInfo = new Request(url, {
            method: "POST",
        });
        const response = await fetch(request);
        const data = await response.json();
        setJobId(data.jobId);
        return data.jobId;
    };

    const getRecipes = async () => {
        const recipeDict = await getLocationDict(FIRESTORE_COLLECTIONS.RECIPES);
        return recipeDict;
    };

    useEffect(() => {
        const fetchRecipes = async () => {
            const recipeDict = await getRecipes();
            setRecipes(recipeDict);
        };
        fetchRecipes();
    }, []);


    const getConfigs = async () => {
        const configDict = await getLocationDict(FIRESTORE_COLLECTIONS.CONFIGS);
        return configDict;
    };

    useEffect(() => {
        const fetchConfigs = async () => {
            const configDict = await getConfigs();
            setConfigs(configDict);
        };
        fetchConfigs();
    }, []);

    const checkStatus = async (jobIdFromSubmit: string) => {
        const id = jobIdFromSubmit || jobId;
        const url = packingStatusUrl(id);
        const request: RequestInfo = new Request(
            url,
            {
                method: "GET",
            }
        );
        let localJobStatus = "";
        while (localJobStatus !== JobStatus.SUCCEEDED && localJobStatus !== JobStatus.FAILED) {
            const response = await fetch(request);
            const data: AWSBatchJobsResponse = await response.json();
            if (localJobStatus !== data.jobs[0].status) {
                localJobStatus = data.jobs[0].status;
                setJobStatus(data.jobs[0].status);
            }
            setLogStreamName(data.jobs[0].container.logStreamName);
        }
    };

    const fetchResultUrl = async () => {
        const url = await queryFirebase(jobId);
        setResultUrl(SIMULARIUM_EMBED_URL + url);
    };

    const getLogs = async () => {
        const url = getLogsUrl(logStreamName);
        const request: RequestInfo = new Request(
            url,
            {
                method: "GET",
            }
        );
        const response = await fetch(request);
        const data: CloudWatchLogsResponse = await response.json();
        const logs = data.events.map((event: { message: string }) => event.message);
        setJobLogs(logs);
    };

    const runPacking = async () => {
        submitRecipe().then((jobIdFromSubmit) => checkStatus(jobIdFromSubmit));
        setViewConfig(false);
        setViewRecipe(false);
    };

    const selectRecipe = async (recipe: string) => {
        setSelectedRecipe(recipe);
        const recStr = await getFirebaseRecipe(recipe);
        setRecipeStr(recStr);
    }

    const selectConfig = async (config: string) => {
        setSelectedConfig(config);
        // Determine the firebaseId for this config
        let firebaseId = "unknown"
        for (const name in configs) {
            const path = configs[name]["path"];
            if (path == config) {
                firebaseId = configs[name]["firebaseId"]
            }
        }
        const confStr = await getDocById(FIRESTORE_COLLECTIONS.CONFIGS, firebaseId);
        setConfigStr(confStr);
    }

    const toggleRecipe = () => {
        setViewRecipe(!viewRecipe);
    }

    const toggleConfig = () => {
        setViewConfig(!viewConfig);
    }

    const toggleLogs = async () => {
        if (jobLogs.length == 0) {
            await getLogs();
        } else {
            setViewLogs(!viewLogs);
        }
    }

    const jobSucceeded = jobStatus == JobStatus.SUCCEEDED;
    const showLogButton = jobSucceeded || jobStatus == JobStatus.FAILED;

    return (
        <div className="app">
            <h1>Welcome to cellPACK</h1>
            <div className="input-container">
                <select
                    value={selectedRecipe}
                    onChange={(e) => selectRecipe(e.target.value)}
                >
                    <option value="" disabled>
                        Select a recipe
                    </option>
                    {Object.entries(recipes).map(([key, value]) => (
                        <option key={key} value={value["firebaseId"]}>
                            {key}
                        </option>
                    ))}
                </select>
                <select
                    value={selectedConfig}
                    onChange={(e) => selectConfig(e.target.value)}
                >
                    <option value="" disabled>
                        Select a config
                    </option>
                    {Object.entries(configs).map(([key, value]) => (
                        <option key={key} value={value["path"]}>
                            {key}
                        </option>
                    ))}
                </select>
                <button onClick={runPacking} disabled={!selectedRecipe}>
                    Pack
                </button>
            </div>
            <div className="box">
                {recipeStr.length > 0 && (
                    <div className="recipeBox">
                        <button type="button" className="collapsible" onClick={toggleRecipe}>Recipe</button>
                        <div className="recipeJSON">
                            {viewRecipe && (
                                <pre>{recipeStr}</pre>
                            )}
                        </div>
                    </div>
                )}
                {configStr.length > 0 && (
                    <div className="configBox">
                        <button type="button" className="collapsible" onClick={toggleConfig}>Config</button>
                        <div className="configJSON">
                            {viewConfig && (
                                <pre>{configStr}</pre>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <h3>Job Status: {jobStatus}</h3>
            {jobSucceeded && (
                <div>
                    <button onClick={fetchResultUrl}>View result</button>
                </div>
            )}
            {
                resultUrl && (
                    <div>
                        <iframe
                            src={resultUrl}
                            style={{
                                width: "1000px",
                                height: "600px",
                                border: "1px solid black",
                            }}
                        ></iframe>
                    </div>
                )
            }
            {showLogButton && (
                <div>
                    <button className="collapsible" onClick={toggleLogs}>Logs</button>
                    {viewLogs && jobLogs.length > 0 && (
                        <div className="logs-container">
                            {jobLogs.map((log, index) => (
                                <div key={index} className="log-entry">
                                    <span>{log}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default App;