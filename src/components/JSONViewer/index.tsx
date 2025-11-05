import React from "react";
import { Descriptions, Tree, TreeDataNode } from "antd";
import { DescriptionsItemProps } from "antd/es/descriptions/Item";
import {
    formatArray,
    convertUnderscoreToSpace,
    returnOneElement,
} from "./formattingUtils";
import "./style.css";
import { useRecipes, useSelectedRecipeId } from "../../state/store";
import { buildCurrentRecipeObject } from "../../state/utils";

const JSONViewer = (): JSX.Element | null => {
    const selectedRecipeId = useSelectedRecipeId();
    const recipes = useRecipes();

    const currentRecipe = recipes[selectedRecipeId];

    if (!currentRecipe) {
        return null;
    }

    const contentAsObj = buildCurrentRecipeObject(currentRecipe);

    // descriptions for top level key-value pairs
    const descriptions: DescriptionsItemProps[] = [];
    // trees for nested objects like 'objects', 'composition', 'gradients'
    const trees: { title: string; children: TreeDataNode[] }[] = [];

    const createTree = (key: string, value: object) => {
        const treeData: TreeDataNode[] = [];
        const title = key;
        for (const [k, v] of Object.entries(value)) {
            const element = returnOneElement(k, v);
            if (element) {
                treeData.push(element);
            }
        }
        if (treeData.length > 0) {
            trees.push({ title: title, children: treeData });
        }
    };

    // top level objects, like name, bounding_box, etc.
    Object.entries(contentAsObj).forEach(([key, value]) => {
        if (typeof value === "string") {
            descriptions.push({
                label: convertUnderscoreToSpace(key),
                children: <>{value}</>,
            });
        } else if (typeof value === "number" || typeof value === "boolean") {
            descriptions.push({
                label: convertUnderscoreToSpace(key),
                children: <>{String(value)}</>,
            });
            // if the value is an array
        } else if (Array.isArray(value)) {
            descriptions.push({
                label: convertUnderscoreToSpace(key),
                children: <>{formatArray(value)}</>,
            });
            // if the value is an object, it's one of the nested items,
            // either 'objects', 'composition' or 'gradients'
            // this will make a tree with a title for each
        } else if (typeof value === "object" && value !== null) {
            createTree(key, value);
        }
    });

    return (
        <div className="full-recipe">
            <Descriptions
                size="small"
                bordered
                column={1}
                items={descriptions}
                classNames={{
                    label: "description-label",
                    content: "description-content",
                }}
            />
            {trees.map((tree) => (
                <React.Fragment key={tree.title}>
                    <h4 className="tree-title">{tree.title}</h4>
                    <Tree
                        key={tree.title}
                        showLine
                        selectable={false}
                        treeData={tree.children}
                    />
                </React.Fragment>
            ))}
        </div>
    );
};

export default JSONViewer;
