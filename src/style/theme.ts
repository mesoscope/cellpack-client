import type { ThemeConfig } from "antd";
import { theme } from "antd";

const commonComponents = {
    Button: { controlHeight: 40 },
};

export const lightTheme: ThemeConfig = {
    algorithm: theme.defaultAlgorithm,
    token: {
        colorPrimary: "#646cff",
        fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
        borderRadius: 8,
        colorBgBase: "#ffffff",
        colorTextBase: "#213547",
    },
    components: {
        ...commonComponents,
        Layout: {
            headerBg: "#ffffff",
            bodyBg: "#ffffff",
        },
    },
};

export const darkTheme: ThemeConfig = {
    algorithm: theme.darkAlgorithm,
    token: {
        colorPrimary: "#8b91ff",
        fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
        borderRadius: 8,
        colorBgBase: "#0f1115",
        colorTextBase: "rgba(255,255,255,0.87)",
    },
    components: {
        ...commonComponents,
        Layout: {
            headerBg: "#0f1115",
            bodyBg: "#0f1115",
        },
    },
};
