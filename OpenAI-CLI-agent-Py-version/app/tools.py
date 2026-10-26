import argparse
import os
import sys
import json
import subprocess

def toolHandle(call):
    args = json.loads(call.function.arguments)

    if call.function.name == "Read":
        f = open(args["file_path"])
        return f.read()

    if call.function.name == "Write":
        file_path = args["file_path"]
        dir_path = os.path.dirname(file_path)
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(args["content"])
            return f"file written in: {file_path}"

    if call.function.name == "Bash":
        command = args["command"]
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                encoding="utf-8",
                stdin=subprocess.DEVNULL,
            )
        except Exception as e:
            return f"Error: {e}"

        if result.returncode == 0:
            return result.stdout

        return (result.stdout or "") + (result.stderr or "") or f"Errore: exit code {result.returncode}"

    raise ValueError(f"Unknown tool: {call.function.name}")