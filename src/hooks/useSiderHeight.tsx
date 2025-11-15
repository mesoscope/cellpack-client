import { useState, useEffect } from "react";
const HEADER_HEIGHT = 48;
const FOOTER_HEIGHT = 64;

export function useSiderHeight() {
    const [siderHeight, setSiderHeight] = useState<number>(
        window.innerHeight - HEADER_HEIGHT - FOOTER_HEIGHT
    );

    useEffect(() => {
        function handleResize() {
            setSiderHeight(window.innerHeight - HEADER_HEIGHT - FOOTER_HEIGHT);
        }
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return siderHeight;
}
