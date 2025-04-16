import { useEffect, useState } from "react";
import isEqual from 'lodash/isEqual';
import "./App.css";
import { queryFirebase, getLocationDict, getDocById, getFirebaseRecipe, updateConfig } from "./firebase";
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

    const fetchRecipes = async () => {
        const recipeDict = await getLocationDict(FIRESTORE_COLLECTIONS.RECIPES);
        setRecipes(recipeDict);
    };

    useEffect(() => {
        fetchRecipes();
    }, []);

    const fetchConfigs = async () => {
        const configDict = await getLocationDict(FIRESTORE_COLLECTIONS.CONFIGS);
        setConfigs(configDict);
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    const incrementVersion = (name: string): string =>  {
        if (name.includes("_v")) {
            const index = name.indexOf("_v");
            const version = parseInt(name.substring(index + 2)) + 1;
            return name.substring(0, index + 2) + version;
        }
        return name + "_v1";
    };

    const checkName = (name: string): string => {
        if (name in configs) {
            const newName = incrementVersion(name);
            return checkName(newName);
        }
        // Name is unique, it's good to go
        return name;
    };

    const configHasChanged = async (configJson: object): Promise<boolean> => {
        const originalConfig = await getDocById(FIRESTORE_COLLECTIONS.CONFIGS, selectedConfig);
        return !isEqual(originalConfig, configJson);
    };

    const runPacking = async () => {
        // Check if config has changed. If so, update firebase reference
        const configJson = JSON.parse(configStr);
        const hasChanged: boolean = await configHasChanged(configJson);
        let newConfigId = undefined;
        if (hasChanged) {
            // automatically increment name version if name didn't change
            configJson["name"] = checkName(configJson["name"]);
            // add new config to firebase and save new firebase id
            newConfigId = await updateConfig(configJson);
            if (newConfigId) {
                setSelectedConfig(newConfigId);
                await fetchConfigs();
            }
        }

        // submit packing job to AWS batch
        const firebaseRecipe = "firebase:recipes/" + selectedRecipe;
        const firebaseConfig = "firebase:configs/" + (newConfigId || selectedConfig);
        const url = getSubmitPackingUrl(firebaseRecipe, firebaseConfig);
        const request: RequestInfo = new Request(url, {
            method: "POST",
        });
        const response = await fetch(request);
        const data = await response.json();
        setJobId(data.jobId);

        // job submit complete, start checking job status
        checkStatus(data.jobId);
        setViewConfig(false);
        setViewRecipe(false);
    };

    const checkStatus = async (jobIdFromSubmit: string) => {
        const url = packingStatusUrl(jobIdFromSubmit || jobId);
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

    const selectRecipe = async (recipe: string) => {
        setSelectedRecipe(recipe);
        const recStr = await getFirebaseRecipe(recipe);
        setRecipeStr(recStr);
    }

    const selectConfig = async (config: string) => {
        setSelectedConfig(config);
        const conf = await getDocById(FIRESTORE_COLLECTIONS.CONFIGS, config);
        const confString = JSON.stringify(conf, null, 2);
        setConfigStr(confString);
    }

    const toggleRecipe = () => {
        setViewRecipe(!viewRecipe);
    };

    const toggleConfig = async () => {
        setViewConfig(!viewConfig);
    };

    const toggleLogs = async () => {
        if (jobLogs.length == 0) {
            await getLogs();
        } else {
            setViewLogs(!viewLogs);
        }
    };

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
                        <option key={key} value={value["firebaseId"]}>
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
                                <textarea defaultValue={recipeStr} value={recipeStr} onChange={e => setRecipeStr(e.target.value)}/>
                            )}
                        </div>
                    </div>
                )}
                {configStr.length > 0 && (
                    <div className="configBox">
                        <button type="button" className="collapsible" onClick={toggleConfig}>Config</button>
                        <div className="configJSON">
                            {viewConfig && (
                                <textarea defaultValue={configStr} value={configStr} onChange={e => setConfigStr(e.target.value)}/>
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