import { Typography } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";
import {
    DEFAULT_DESCRIPTION_HEIGHT,
    TEXT_BOTTOM_MARGIN,
} from "../../constants";

import "./style.css";
const { Paragraph } = Typography;

interface ExpandableTextProps {
    text: string;
    setCurrentHeight: (height: number) => void;
}

const expandSymbol = (
    <span>
        expand <ArrowDownOutlined />
    </span>
);

const collapseSymbol = (
    <span>
        collapse <ArrowUpOutlined />
    </span>
);

const ExpandableText = ({ text, setCurrentHeight }: ExpandableTextProps) => {
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const ref = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        setCurrentHeight(
            (ref.current?.clientHeight || DEFAULT_DESCRIPTION_HEIGHT) +
                TEXT_BOTTOM_MARGIN
        );
    }, [isExpanded, setCurrentHeight]);
    return (
        <Paragraph
            ref={ref}
            ellipsis={{
                rows: 2,
                expandable: "collapsible",
                onExpand: (_, info) => {
                    setIsExpanded(info.expanded);
                },
                expanded: isExpanded,
                symbol: (expanded) =>
                    expanded ? collapseSymbol : expandSymbol,
            }}
        >
            {text}
        </Paragraph>
    );
};
export default ExpandableText;
