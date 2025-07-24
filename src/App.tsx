import { useEffect, useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import "./App.css";
import { getResultPath, getLocationDict, getDocById, getFirebaseRecipe, getJobStatus, updateRecipe } from "./firebase";
import {
    getSubmitPackingUrl,
    JobStatus,
} from "./constants/awsBatch";
import {
    FIRESTORE_COLLECTIONS,
    FIRESTORE_FIELDS,
} from "./constants/firebaseConstants";
import { SIMULARIUM_EMBED_URL } from "./constants/urls";
import {
    FirebaseDict,
} from "./types";
import { Link } from "react-router-dom";
import { PageRoutes } from "./constants/routes";

function App() {
    const [recipes, setRecipes] = useState<FirebaseDict>({});
    const [configs, setConfigs] = useState<FirebaseDict>({});
    const [selectedRecipe, setSelectedRecipe] = useState("");
    const [selectedConfig, setSelectedConfig] = useState("");
    const [jobId, setJobId] = useState("");
    const [jobStatus, setJobStatus] = useState("");
    const [jobLogs, setJobLogs] = useState<string>("");
    const [resultUrl, setResultUrl] = useState<string>("");
    const [recipeStr, setRecipeStr] = useState<string>("");
    const [configStr, setConfigStr] = useState<string>("");
    const [viewRecipe, setViewRecipe] = useState<boolean>(true);
    const [viewConfig, setViewConfig] = useState<boolean>(true);
    const [viewResults, setViewResults] = useState<boolean>(false);
    const [viewLogs, setViewLogs] = useState<boolean>(true);
    const [runTime, setRunTime] = useState<number>(0);

    let start = 0;

    async function sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    };

    const recipeHasChanged = async (): Promise<boolean> => {
        const originalRecipe = await getFirebaseRecipe(selectedRecipe);
        return !(originalRecipe == recipeStr);
    }

    const recipeToFirebase = (recipe: string, path: string, id: string): object => {
        const recipeJson = JSON.parse(recipe);
        if (recipeJson.bounding_box) {
            const flattened_array = Object.assign({}, recipeJson.bounding_box);
            recipeJson.bounding_box = flattened_array;
        }
        recipeJson[FIRESTORE_FIELDS.RECIPE_PATH] = path;
        recipeJson[FIRESTORE_FIELDS.NAME] = id;
        return recipeJson;
    }

    const submitRecipe = async () => {
        setResultUrl("");
        setRunTime(0);
        let firebaseRecipe = "firebase:recipes/" + selectedRecipe;
        const firebaseConfig = "firebase:configs/" + selectedConfig;
        const recipeChanged: boolean = await recipeHasChanged();
        if (recipeChanged) {
            const recipeId = uuidv4();
            firebaseRecipe = "firebase:recipes_edited/" + recipeId;
            const recipeJson = recipeToFirebase(recipeStr, firebaseRecipe, recipeId);
            try {
                await updateRecipe(recipeId, recipeJson);
            } catch(e) {
                setJobStatus(JobStatus.FAILED);
                setJobLogs(String(e));
                return;
            }

        }
        const url = getSubmitPackingUrl(firebaseRecipe, firebaseConfig);
        const request: RequestInfo = new Request(url, { method: "POST" });
        start = Date.now();
        const response = await fetch(request);
        setJobStatus(JobStatus.SUBMITTED);
        const data = await response.json();
        if (response.ok) {
            setJobId(data.jobId);
            setJobStatus(JobStatus.STARTING);
            return data.jobId;
        } else {
            setJobStatus(JobStatus.FAILED);
            setJobLogs(JSON.stringify(data));
        }
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
        let localJobStatus = await getJobStatus(id);
        while (localJobStatus !== JobStatus.DONE && localJobStatus !== JobStatus.FAILED) {
            await sleep(500);
            const newJobStatus = await getJobStatus(id);
            if (localJobStatus !== newJobStatus) {
                localJobStatus = newJobStatus;
                setJobStatus(newJobStatus);
            }
        }
        const range = (Date.now() - start) / 1000;
        setRunTime(range);
        if (localJobStatus == JobStatus.DONE) {
            fetchResultUrl(id);
        } else if (localJobStatus == JobStatus.FAILED) {
            getLogs(id);
        }
    };

    const fetchResultUrl = async (jobIdFromSubmit?: string) => {
        const id = jobIdFromSubmit || jobId;
        const url = await getResultPath(id);
        setResultUrl(SIMULARIUM_EMBED_URL + url);
    };

    const getLogs = async (jobIdFromSubmit?: string) => {
        const id = jobIdFromSubmit || jobId;
        const logStr: string = await getDocById(FIRESTORE_COLLECTIONS.JOB_STATUS, id);
        setJobLogs(logStr);
    };

    const runPackingECS = async () => {
        setViewConfig(false);
        setViewRecipe(false);
        submitRecipe().then((jobIdFromSubmit) => checkStatus(jobIdFromSubmit));
    };

    const selectRecipe = async (recipe: string) => {
        setSelectedRecipe(recipe);
        const recStr = await getFirebaseRecipe(recipe);
        setRecipeStr(recStr);
    }

    const selectConfig = async (config: string) => {
        setSelectedConfig(config);
        const confStr = await getDocById(FIRESTORE_COLLECTIONS.CONFIGS, config);
        setConfigStr(confStr);
    }

    const toggleRecipe = () => {
        setViewRecipe(!viewRecipe);
    }

    const toggleConfig = () => {
        setViewConfig(!viewConfig);
    }

    const toggleResults = () => {
        if (resultUrl == "") {
            fetchResultUrl();
        }
        setViewResults(!viewResults);
    }

    const toggleLogs = async () => {
        if (jobLogs.length == 0) {
            await getLogs();
        } else {
            setViewLogs(!viewLogs);
        }
    }

    const jobSucceeded = jobStatus == JobStatus.DONE;
    const showLogButton = jobStatus == JobStatus.FAILED;
    const showResults = resultUrl && viewResults;

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
                <button onClick={runPackingECS} disabled={!selectedRecipe}>
                    Pack
                </button>
            </div>
            <div className="box">
                {recipeStr.length > 0 && (
                    <div className="recipeBox">
                        <button type="button" className="collapsible" onClick={toggleRecipe}>Recipe</button>
                        <div className="recipeJSON">
                            {viewRecipe && (
                                <textarea value={recipeStr} onChange={e => setRecipeStr(e.target.value)}/>
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
                    {runTime > 0 && (<h4>Time to Run: {runTime} sec</h4>)}
                    <button onClick={toggleResults}>Results</button>
                </div>
            )}
            {
                showResults && (
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
                        <div className="logBox">
                            <pre>{jobLogs}</pre>
                        </div>
                    )}
                </div>
            )}
            <div>
                <Link 
                    to={PageRoutes.LANDING_PAGE}
                >
                    ← Back to Home
                </Link>
            </div>
        </div>
    );
}

export default App;