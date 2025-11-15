import { useCallback, useEffect, useState } from "react";
import { Tabs } from "antd";

import {
    useSelectedRecipeId,
    useSelectRecipe,
    useStartPacking,
    useLoadAllRecipes,
    useCurrentRecipeObject,
    useInputOptions,
    useLoadInputOptions,
} from "../../state/store";
import Dropdown from "../Dropdown";
import JSONViewer from "../JSONViewer";
import RecipeForm from "../RecipeForm";
import ExpandableText from "../ExpandableText";
import "./style.css";
import { useSiderHeight } from "../../hooks/useSiderHeight";
import {
    DEFAULT_DESCRIPTION_HEIGHT,
    SELECT_HEIGHT,
    TABS_HEADER_HEIGHT,
    TEXT_BOTTOM_MARGIN,
} from "../../constants";

interface PackingInputProps {
    startPacking: (
        recipeId: string,
        configId: string,
        recipeString: string
    ) => Promise<void>;
}

const PackingInput = (props: PackingInputProps): JSX.Element => {
    const { startPacking } = props;
    const selectedRecipeId = useSelectedRecipeId();
    const recipeObj = useCurrentRecipeObject();
    const inputOptions = useInputOptions();

    const loadInputOptions = useLoadInputOptions();
    const loadAllRecipes = useLoadAllRecipes();
    const selectRecipe = useSelectRecipe();
    const storeStartPacking = useStartPacking();
    const siderHeight = useSiderHeight();

    const [availableRecipeHeight, setAvailableRecipeHeight] = useState<number>(
        siderHeight - DEFAULT_DESCRIPTION_HEIGHT - SELECT_HEIGHT - TEXT_BOTTOM_MARGIN
    );
    const [descriptionHeight, setDescriptionHeight] = useState<number>(
        DEFAULT_DESCRIPTION_HEIGHT
    );

    const getAvailableHeight = useCallback(() => {
        return (
            siderHeight - descriptionHeight - SELECT_HEIGHT - TEXT_BOTTOM_MARGIN
        );
    }, [siderHeight, descriptionHeight]);

    useEffect(() => {
        const newAvailableHeight = getAvailableHeight();
        setAvailableRecipeHeight(newAvailableHeight);
    }, [getAvailableHeight]);

    const preFetchInputsAndRecipes = useCallback(async () => {
        await loadInputOptions();
        await loadAllRecipes();
    }, [loadInputOptions, loadAllRecipes]);

    // Load input options on mount
    useEffect(() => {
        preFetchInputsAndRecipes();
    }, [loadInputOptions, loadAllRecipes, preFetchInputsAndRecipes]);

    const handleStartPacking = async () => {
        await storeStartPacking(startPacking);
    };

    const loadingText = <div className="recipe-select">Loading...</div>;

    // No recipe or dropdown options to load
    if (!recipeObj && !inputOptions[selectedRecipeId]) {
        return loadingText;
    }

    return (
        <>
            <div className="recipe-select">
                <div>Choose Recipe</div>
                <Dropdown
                    defaultValue={selectedRecipeId}
                    placeholder="Select an option"
                    options={inputOptions}
                    onChange={selectRecipe}
                />
            </div>
            {/* Options menu loaded, but no recipe to load yet */}
            {!recipeObj ? (
                loadingText
            ) : (
                <>
                    {recipeObj.description && (
                        <div className="recipe-description">
                            <ExpandableText
                                text={recipeObj.description}
                                setCurrentHeight={setDescriptionHeight}
                            />
                        </div>
                    )}
                    <Tabs defaultActiveKey="1" className="recipe-content">
                        <Tabs.TabPane tab="Editable fields" key="1">
                            <RecipeForm
                                onStartPacking={handleStartPacking}
                                availableHeight={
                                    availableRecipeHeight - TABS_HEADER_HEIGHT
                                }
                            />
                        </Tabs.TabPane>
                        <Tabs.TabPane tab="Full Recipe" key="2">
                            <JSONViewer title="Recipe" content={recipeObj} />
                        </Tabs.TabPane>
                    </Tabs>
                </>
            )}
        </>
    );
};

export default PackingInput;
