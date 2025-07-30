
import { docCleanup } from '../src/firebase.ts';

async function main() {
    try {
        console.log("Starting Firebase cleanup...");
        await docCleanup();
        console.log("Cleanup completed successfully");
        process.exit(0);
    } catch (error) {
        console.error("Cleanup failed:", error);
        process.exit(1);
    }
}

main(); 