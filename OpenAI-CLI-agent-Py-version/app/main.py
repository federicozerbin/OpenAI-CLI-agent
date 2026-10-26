import argparse
from http import client
import os
from openai import OpenAI
from app.agent import startAgent
from app.skills import skillHandle


API_KEY = os.getenv("OPENROUTER_API_KEY")
BASE_URL = os.getenv("OPENROUTER_BASE_URL", default="https://openrouter.ai/api/v1")
model="anthropic/claude-haiku-4.5"
TOOLS = [{
    "type": "function",
    "function": {
        "name": "Read",
        "description": "Read and return the contents of a file",
        "parameters": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "The path to the file to read",
                }
            },
            "required": ["file_path"],
        },
    },
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
        "description": "Execute a skill by name",
        "parameters": {
            "type": "object",
            "required": ["name"],
            "properties": {
                "name": {"type": "string", "description": "The skill name"},
                "args": {"type": "string", "description": "Optional arguments for the skill"},
            },
        },
    },
}
]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("-p", required=True)
    args = p.parse_args()

    if not API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is not set")

    client = OpenAI(api_key=API_KEY, base_url=BASE_URL)

    skills, systemPrompt, resolvedUserPrompts = skillHandle(args.p)

    tools = TOOLS if skills else [t for t in TOOLS if t["function"]["name"] != "Skill"]

    messages = list(resolvedUserPrompts)
    if skills:
        messages.insert(0, {"role": "user", "content": systemPrompt})

    answer = startAgent(client, model, messages, tools, skills)
    print(answer)

if __name__ == "__main__":
    main()