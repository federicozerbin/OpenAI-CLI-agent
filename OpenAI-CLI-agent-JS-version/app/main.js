import OpenAI from "openai";
import { skillHandler } from "./skillHandler.js";
import { startAgent } from "./agentLoop.js";

async function main() {
  const [, , flag, prompt] = process.argv;
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseURL =
      process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  if (flag !== "-p" || !prompt) {
    throw new Error("error: -p flag is required");
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
  });
  const model = "anthropic/claude-haiku-4.5";
  const tools = [
        {
          "type": "function",
          "function": {
            "name": "Read",
            "description": "Read and return the contents of a file",
            "parameters": {
              "type": "object",
              "properties": {
                "file_path": {
                  "type": "string",
                  "description": "The path to the file to read"
                }
              },
              "required": ["file_path"]
            }
          }
        },
        {
          "type": "function",
          "function": {
            "name": "Write",
            "description": "Write content to a file",
            "parameters": {
              "type": "object",
              "required": ["file_path", "content"],
              "properties": {
                "file_path": {
                  "type": "string",
                  "description": "The path of the file to write to"
                },
                "content": {
                  "type": "string",
                  "description": "The content to write to the file"
                }
              }
            }
          }
        },
        {
          "type": "function",
          "function": {
            "name": "Bash",
            "description": "Execute a shell command",
            "parameters": {
              "type": "object",
              "required": ["command"],
              "properties": {
                "command": {
                  "type": "string",
                  "description": "The command to execute"
                }
              }
            }
          }
        },
        {
          "type": "function",
          "function": {
            "name": "Skill",
            "description": "Load a skill's instructions into the conversation",
            "parameters": {
              "type": "object",
              "required": ["name"],
              "properties": {
                "name": { "type": "string", "description": "The name of the skill to use" },
                "args": { "type": "string", "description": "Optional arguments for the skill" }
              }
            }
          }
        }
      ];

  const { skills, systemPrompt, resolvedUserPrompts} = skillHandler(prompt);

  const messages = [
    { role: "system", content: systemPrompt },
      ...resolvedUserPrompts,
  ];

  const answer = await startAgent(client, model, messages, tools, skills);
  console.log(answer);

  // You can use print statements as follows for debugging, they'll be visible when running tests.
  console.error("Logs from your program will appear here!");
}

main();
