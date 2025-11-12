import { LoadingOutlined } from "@ant-design/icons";
import { SIMULARIUM_EMBED_URL } from "../../constants/urls";
import { useCurrentRecipeObject, useIsModified, useIsPacking, useResultUrl } from "../../state/store";
import "./style.css";

const Viewer = (): JSX.Element => {
    const resultUrl = useResultUrl();
    const recipeObject = useCurrentRecipeObject();
    const isLoading = !recipeObject;
    const isPacking = useIsPacking();
    const isModified = useIsModified();

    let overlayText = "";
    if (isLoading) {
        overlayText = "Loading...";
    } else if (isPacking) {
        overlayText = "Running...";
    } else if (isModified) {
        overlayText = "Re-run packing to view result";
    }

    const showOverlay = isLoading || isPacking || isModified;
    const showSpinner = isLoading || isPacking;

    return (
        <div className="viewer-container">
            <iframe
                className="simularium-embed"
                src={`${SIMULARIUM_EMBED_URL}${resultUrl}`}
            />
            {showOverlay && (
                <div className="viewer-overlay">
                    <div className="overlay-content">
                        {showSpinner && <LoadingOutlined />}
                        <p>{overlayText}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Viewer;
