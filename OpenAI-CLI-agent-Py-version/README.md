# Mini Claude Code (Python)

A minimal, from-scratch implementation of a **Claude Code–style AI coding agent** in Python. It talks to an LLM through an OpenAI-compatible API, lets the model act on your machine through tools (read files, write files, run shell commands), and supports a **Skills system** compatible with the `.claude/skills/` convention, including skills that run in an isolated subagent.

Built while completing the CodeCrafters ["Build your own Claude Code"](https://codecrafters.io/challenges/claude-code) challenge, including all the Skills extension stages.

---

## Features

- **Agent loop**: the model is called repeatedly; every tool call it requests is executed and the result is fed back, until it answers without requesting more tools.
- **Three built-in tools**
  | Tool | Purpose |
  |------|---------|
  | `Read` | Read and return the contents of a file |
  | `Write` | Create or overwrite a file (parent directories are created automatically) |
  | `Bash` | Run a shell command and return stdout/stderr |
- **Skills system** (`.claude/skills/<name>/SKILL.md`)
  - Skills are discovered at startup; only their **name and description** are advertised to the model, so the prompt stays small.
  - The model can **choose a skill by itself** by calling the `Skill` tool.
  - Users can **invoke a skill explicitly** with `/skill-name`.
  - **Arguments**: `$ARGUMENTS` (everything) and positional `$0`, `$1`, ...
  - **Stacking**: `/skill-a /skill-b some args` loads several skills with shared arguments.
  - **Bundled scripts**: a skill can ship files (e.g. `scripts/checksum.sh`) and instruct the model to run them via `Bash`.
  - **Subagents**: with `context: fork` in the frontmatter, the skill runs in a separate agent with its own message history, and only the final answer returns to the main conversation.

## How it works

```
 prompt ──► skills.py ──► resolve /commands, build skills system prompt
                │
                ▼
           agent.py  ◄───────────────┐
        (call the LLM)               │ tool results
                │                    │
        tool calls? ── yes ──► tools.py (Read / Write / Bash)
                │              skills.py (Skill → inline body or forked subagent)
                no
                ▼
          final answer printed
```

### Project layout

```
.
├── app/
│   ├── main.py      # CLI entry point, tool schemas, client setup
│   ├── agent.py     # the agent loop (also reused for subagents)
│   ├── tools.py     # Read / Write / Bash implementations
│   └── skills.py    # skill discovery, prompt building, argument substitution, subagents
├── pyproject.toml   # dependencies (openai, pyyaml)
├── uv.lock
└── your_program.sh  # local runner (uv run -m app.main)
```

## Requirements

- Python **3.14+**
- [`uv`](https://docs.astral.sh/uv/)
- An [OpenRouter](https://openrouter.ai/) API key (any OpenAI-compatible endpoint works)

## Setup

```bash
git clone <your-repo-url>
cd <your-repo>

export OPENROUTER_API_KEY="sk-or-..."
# optional, this is the default:
export OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
```

Dependencies are installed automatically by `uv run`.

## Usage

```bash
./your_program.sh -p "What is inside README.md? Summarize it in one sentence."
```

The model is set in `app/main.py` (`anthropic/claude-haiku-4.5` by default). Change the `model` variable to use another one.

### Examples

```bash
# Let the agent read and write files
./your_program.sh -p "Read README.md and create the file it describes."

# Let it use the shell
./your_program.sh -p "List the files here with ls and delete the old readme."

# Invoke a skill explicitly, with arguments
./your_program.sh -p "/greet Federico"

# Stack skills with a shared argument
./your_program.sh -p "/release-notes /changelog v1.2.0"

# Let the model pick a skill from its description
./your_program.sh -p "Who owns the payments dashboard?"
```

## Writing a skill

Create `.claude/skills/<name>/SKILL.md` in the directory you run the program from:

```markdown
---
name: greet
description: Use this skill when the user wants a greeting for someone.
context: fork        # optional: run in an isolated subagent
---

Reply with a short, friendly greeting for: $ARGUMENTS
```

| Frontmatter | Meaning |
|-------------|---------|
| `name` | Skill name (defaults to the folder name) |
| `description` | What the skill does and when to use it; this is what the model sees |
| `context: fork` | Run the skill body in a separate subagent and return only its final answer |

| Placeholder | Replaced with |
|-------------|---------------|
| `$ARGUMENTS` | All arguments, joined by spaces |
| `$0`, `$1`, ... | The corresponding positional argument (empty if missing) |

If the body has no placeholder, arguments are appended as `ARGUMENTS: ...`.

A skill can bundle extra files next to `SKILL.md`:

```
.claude/skills/checksum/
├── SKILL.md          # "Run scripts/checksum.sh using the Bash tool..."
├── data.txt
└── scripts/
    └── checksum.sh
```

## Security notice

`Write` and `Bash` act on your real filesystem and shell **with no confirmation step**. The agent can overwrite files and run arbitrary commands, so run it in a disposable or version-controlled directory until you trust the prompts and skills you use.

## Implementation notes

- Tool arguments arrive from the model as a JSON string and are parsed with `json.loads`.
- Tool errors are caught and returned to the model as text, so it can recover instead of crashing the loop.
- The `Skill` tool and the skills system prompt are only sent when at least one skill exists, which keeps plain requests clean.
- `skills.py` imports `startAgent` lazily to avoid a circular import, since subagents reuse the same agent loop.

## Possible extensions

- Confirmation prompts before `Write` / `Bash`
- Streaming output
- More tools (`Edit`, `Glob`, `Grep`)
- Persistent conversation history and a small GUI

## Acknowledgements

Built following the CodeCrafters "Build your own Claude Code" challenge.
