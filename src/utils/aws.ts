import JSZip from "jszip";
import { getOutputsDirectory } from "./firebase";
import { getS3ListUrl } from "../constants/aws";


export const parseS3ListResponse = (xmlText: string, baseFolderPath: string): { fullPath: string; relativePath: string }[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const contents = xmlDoc.getElementsByTagName("Contents");
    const files: { fullPath: string; relativePath: string }[] = [];
    
    for (let i = 0; i < contents.length; i++) {
        const keyElement = contents[i].getElementsByTagName("Key")[0];
        if (keyElement) {
            const fullPath = keyElement.textContent || "";
            
            if (fullPath && fullPath.length > 0 && fullPath !== baseFolderPath + "/") {
                const relativePath = fullPath.startsWith(baseFolderPath + "/") 
                    ? fullPath.substring(baseFolderPath.length + 1)
                    : fullPath;
                
                if (relativePath && !relativePath.endsWith("/")) {
                    files.push({ fullPath, relativePath });
                }
            }
        }
    }
    
    return files;
};

export const downloadOutputsFromS3 = async (outputsDir: string, jobId: string) => {
    const match = outputsDir.match(/s3\/buckets\/([^/]+)\/(.+)\/?$/);
    if (!match) {
        throw new Error("Invalid S3 URL format");
    }
    
    const bucketName = match[1];
    const folderPath = match[2].replace(/\/$/, "");
    const listUrl = getS3ListUrl(bucketName, folderPath);
    
    console.log("Attempting to list S3 directory:", listUrl);
    
    const listResponse = await fetch(listUrl);
    const xmlText = await listResponse.text();
    const files = parseS3ListResponse(xmlText, folderPath);
    
    console.log(`Found ${files.length} files:`, files.map(f => f.relativePath));
    
    const zip = new JSZip();
    let filesAdded = 0;
    
    for (const file of files) {
        const fileUrl = `${getS3ListUrl(bucketName, "").split("?")[0]}/${file.fullPath}`;
        console.log(`Downloading: ${fileUrl}`);
        
        const response = await fetch(fileUrl);
        if (response.ok) {
            const blob = await response.blob();
            zip.file(file.relativePath, blob);
            filesAdded++;
            console.log(`Added ${file.relativePath} to zip`);
        } else {
            console.log(`Failed to download ${file.relativePath}: ${response.status}`);
        }
    }
    
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const downloadUrl = window.URL.createObjectURL(zipBlob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `cellpack-outputs-${jobId}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    console.log(`Downloaded zip with ${filesAdded} files`);
};

export const downloadOutputs = async (jobId: string) => {
    const outputsDir = await getOutputsDirectory(jobId);
    await downloadOutputsFromS3(outputsDir, jobId);
}
