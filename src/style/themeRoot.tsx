import { ConfigProvider } from "antd";
import { useState, useEffect } from "react";
import { darkTheme, lightTheme } from "./theme";

export function ThemeRoot({ children }: { children: React.ReactNode }) {
    const [isDark, setIsDark] = useState(
        () =>
            window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
    );

    useEffect(() => {
        const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
        if (!mq) return;
        const on = (e: MediaQueryListEvent) => setIsDark(e.matches);
        mq.addEventListener?.("change", on);
        return () => mq.removeEventListener?.("change", on);
    }, []);

    return (
        <ConfigProvider theme={isDark ? darkTheme : lightTheme}>
            <div className={isDark ? "dark-theme" : "light-theme"}>
                {children}
            </div>
        </ConfigProvider>
    );
}
