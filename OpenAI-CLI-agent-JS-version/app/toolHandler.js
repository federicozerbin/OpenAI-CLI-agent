import fs from "fs/promises"
import path from "path";

const { execSync } = await import("child_process");

export async function executeToolHandler(functionName, functionParameters, skills) {
    switch (functionName) {
        case "Read":
            return await executeReadHandler(functionParameters);
        case "Write":
            return await executeWriteHandler(functionParameters);
        case "Bash":
            return await executeBashHandler(functionParameters);
        default:
            throw new Error(`Unknown tool: ${functionName}`);
    }
}

async function executeReadHandler({ file_path }) {
    return await fs.readFile(file_path, { encoding: "utf8" });
}

async function executeBashHandler({ command }) {
    try {
        return execSync(command, {
            encoding: "utf-8",
            stdio: ["ignore", "pipe", "pipe"],
        });
    } catch (e) {
        // e.stdout e e.stderr are for when command fails
        return `${e.stdout ?? ""}${e.stderr ?? ""}` || `Errore: ${e.message}`;
    }
}

async function executeWriteHandler({ file_path, content }) {
    const dir = path.dirname(file_path);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(file_path, content, { encoding: "utf8" });
    return `file written in: ${file_path}`;
}
