import { useEffect } from "react";
import { Tabs } from "antd";
import {
    useIsLoading,
    useLoadAllRecipes,
    useRecipes,
    useSelectedRecipeId,
    useSelectRecipe,
    useStartPacking,
} from "../../state/store";
import Dropdown from "../Dropdown";
import JSONViewer from "../JSONViewer";
import RecipeForm from "../RecipeForm";
import "./style.css";

const PackingInput = (): JSX.Element => {
    const recipes = useRecipes();
    const selectedRecipeId = useSelectedRecipeId();
    const isLoading = useIsLoading();
    const loadAllRecipes = useLoadAllRecipes();
    const selectRecipe = useSelectRecipe();
    const startPacking = useStartPacking();

    const hasRecipes = Object.keys(recipes).length > 0;

    // Load input options on mount
    useEffect(() => {
        const preFetchRecipes = async () => {
            await loadAllRecipes();
        }
        if (!isLoading && !hasRecipes) {
            preFetchRecipes();
        }
    }, [loadAllRecipes, hasRecipes, isLoading]);

    const handleStartPacking = async () => {
        await startPacking();
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <>
            <div className="recipe-select">
                <div>Choose Recipe</div>
                <Dropdown
                    placeholder="Select an option"
                    options={recipes}
                    value={selectedRecipeId}
                    onChange={selectRecipe}
                />
            </div>
            <Tabs defaultActiveKey="1" className="recipe-content">
                <Tabs.TabPane tab="Edit" key="1">
                    <RecipeForm onStartPacking={handleStartPacking} />
                </Tabs.TabPane>
                <Tabs.TabPane tab="Full Recipe" key="2">
                    <JSONViewer />
                </Tabs.TabPane>
            </Tabs>
        </>
    );
};

export default PackingInput;
