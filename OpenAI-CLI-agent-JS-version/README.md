Sì. Basandomi sul codice che hai caricato, il progetto è sostanzialmente una versione **JavaScript/Node.js di un AI coding agent**, con OpenRouter, tool calling e sistema di Skills con supporto ai subagent. Il cuore dell'agent loop è in `agentLoop.js`, mentre `main.js` configura client, modello e tool.  

Ti preparerei un README nello stesso stile del tuo esempio, ma **senza inventare feature che nel codice non risultano presenti**.

# Mini Claude Code (JavaScript)

A minimal, from-scratch implementation of a **Claude Code–style AI coding agent** in JavaScript. It connects to an LLM through an OpenAI-compatible API, allows the model to interact with your machine through tools, and supports a **Skills system** with the ability to run skills inside an isolated subagent context.

Built while completing the CodeCrafters ["Build your own Claude Code"](https://codecrafters.io/challenges/claude-code) challenge.

---

## Features

* **Agent loop**: the model is called repeatedly until it produces a response without requesting additional tools.

* **OpenAI-compatible API**: uses the `openai` JavaScript SDK and can connect to OpenRouter or another compatible endpoint.

* **Four tools**

  | Tool    | Purpose                                |
  | ------- | -------------------------------------- |
  | `Read`  | Read and return the contents of a file |
  | `Write` | Write content to a file                |
  | `Bash`  | Execute a shell command                |
  | `Skill` | Load and execute a skill               |

* **Skills system**

  * Skills are resolved from the user's prompt through `skillHandler`.
  * The model can request a skill through the `Skill` tool.
  * Skills can receive arguments.
  * Skills can run directly in the current agent context.
  * Skills with `context: fork` are executed by a separate subagent with its own message history.
  * The result of a forked skill is returned to the main agent.

## How it works

```text
                  user prompt
                       │
                       ▼
                  ┌──────────┐
                  │  main.js │
                  └────┬─────┘
                       │
                       ▼
               skillHandler()
                       │
             system prompt +
            resolved user prompts
                       │
                       ▼
                ┌───────────┐
                │ agentLoop │◄──────────────────┐
                └─────┬─────┘                   │
                      │                         │
                call LLM                       │
                      │                         │
                      ▼                         │
                 tool calls?                   │
                  /       \                    │
                yes         no                 │
                 │           │                 │
                 ▼           ▼                 │
          execute tool    final answer         │
                 │                             │
                 ▼                             │
          tool result ─────────────────────────┘
```

The agent sends the conversation to the model together with the available tools. When the model requests a tool, the corresponding function is executed and its result is appended to the conversation as a `tool` message. The loop then continues until the model returns a normal response without any tool calls. 

### Skills and subagents

The `Skill` tool can load a skill by name. If the skill does not use a forked context, its expanded body is returned directly to the current agent.

When a skill specifies `context: fork`, a new message history is created and the same `startAgent` loop is used to run the skill as a separate subagent. Only the final result is returned to the original agent. 

## Project layout

```text
.
├── main.js             # CLI entry point, OpenRouter client and tool definitions
├── agentLoop.js        # Main agent loop and subagent execution
├── skillHandler.js     # Skill discovery and prompt/skill resolution
├── toolHandler.js      # Tool execution
├── package.json        # Project dependencies and scripts
└── ...
```

The main entry point creates the OpenAI client, configures the model and declares the four available tools.  

## Requirements

* Node.js
* npm
* An [OpenRouter](https://openrouter.ai/) API key
* An OpenAI-compatible API endpoint

## Setup

Clone the repository and install the dependencies:

```bash
git clone <your-repo-url>
cd <your-repo>

npm install
```

Set your OpenRouter API key:

```bash
export OPENROUTER_API_KEY="sk-or-..."
```

Optionally, configure another OpenAI-compatible endpoint:

```bash
export OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
```

The application uses the OpenRouter endpoint by default when `OPENROUTER_BASE_URL` is not set. 

## Usage

The CLI expects a prompt passed through the `-p` flag:

```bash
node main.js -p "What is inside README.md?"
```

For example:

```bash
node main.js -p "Read package.json and explain what this project does."
```

The default model is configured in `main.js`:

```javascript
const model = "anthropic/claude-haiku-4.5";
```

You can change this value to use another model available through your configured API provider. 

### Examples

Let the agent read a file:

```bash
node main.js -p "Read README.md and summarize it."
```

Let the agent write a file:

```bash
node main.js -p "Create a file called notes.txt containing a short project summary."
```

Let the agent use the shell:

```bash
node main.js -p "List the files in the current directory."
```

Ask the agent to use a skill:

```bash
node main.js -p "Use the appropriate skill to help me with this task."
```

The `Skill` tool accepts a skill name and optional arguments. 

## Available tools

### `Read`

Reads and returns the contents of a file.

```text
Read(file_path)
```

The tool expects a `file_path` argument. 

### `Write`

Writes content to a file.

```text
Write(file_path, content)
```

The tool requires both the destination path and the content to write. 

### `Bash`

Executes a shell command.

```text
Bash(command)
```

The tool accepts a command string and executes it through the project's tool handler. 

### `Skill`

Loads a skill's instructions into the agent.

```text
Skill(name, args)
```

The `name` parameter identifies the skill and `args` can provide optional arguments. 

## Agent loop

The core of the project is the agent loop implemented in `agentLoop.js`.

For every iteration:

1. The current conversation is sent to the model.
2. The assistant response is added to the conversation.
3. The agent checks whether the response contains tool calls.
4. If there are no tool calls, the assistant's answer is returned.
5. If tool calls exist, each requested tool is executed.
6. The result is added to the conversation as a `tool` message.
7. The model is called again with the updated conversation.

This continues until the model produces a response without requesting another tool. 

Tool errors are caught and returned to the model as text instead of immediately terminating the agent loop. 

## Skills

Skills provide a way to package reusable instructions that the agent can load when needed.

A skill can be represented conceptually as:

```text
.claude/
└── skills/
    └── <skill-name>/
        └── SKILL.md
```

A skill can contain instructions and optional frontmatter, including:

```yaml
---
name: greet
description: Generate a greeting for a person.
context: fork
---
```

When `context` is set to `fork`, the skill is executed using a separate agent context rather than directly returning its instructions to the main conversation. 

### Skill arguments

Skills can receive arguments through the `Skill` tool:

```text
Skill(name, args)
```

The exact argument expansion and skill resolution are handled by `skillHandler.js`.

## Error handling

The agent checks that the LLM response contains at least one choice before continuing. If no choices are returned, the agent throws an error.

Tool execution is also wrapped in a `try/catch`. When a tool fails, the error is converted into a message that is returned to the model:

```text
Error: <error message>
```

This allows the model to receive the failure as part of the conversation and potentially recover from it.  

## Security notice

`Write` and `Bash` give the agent the ability to modify files and execute shell commands on your machine.

Do not run the agent in a directory containing important files unless you understand and trust the prompts being given to it.

For development and experimentation, a disposable or version-controlled directory is recommended.

## Implementation notes

* The project uses the `openai` JavaScript SDK with an OpenAI-compatible API endpoint. 
* The default model is `anthropic/claude-haiku-4.5`. 
* Tool arguments returned by the model are parsed from JSON before execution. 
* Tool results are appended to the conversation using the corresponding `tool_call_id`. 
* Forked skills reuse the same `startAgent` implementation as the main agent, creating a separate message history for the subagent. 
* The CLI requires the `-p` flag and a prompt. 

## Possible extensions

Some natural next steps for the project would be:

* Add confirmation prompts before `Write` and `Bash`.
* Add streaming model responses.
* Add additional tools such as `Edit`, `Glob`, and `Grep`.
* Add persistent conversation history.
* Improve CLI argument parsing.
* Add tests for the agent loop and individual tools.
* Add richer skill discovery and validation.
* Add support for additional OpenAI-compatible providers.
* Add a terminal UI or graphical interface.

## Acknowledgements

Built following the CodeCrafters **"Build your own Claude Code"** challenge.

The project is intended as a minimal implementation for understanding how an LLM-powered coding agent works internally, including tool calling, iterative agent loops, skills, and subagent execution.

Questo è già abbastanza vicino, come **struttura e livello di dettaglio**, al README Python che hai mostrato, ma adattato a ciò che effettivamente emerge dai due file JS. In particolare ho evitato di attribuire al progetto funzionalità che non posso verificare dal codice fornito.
