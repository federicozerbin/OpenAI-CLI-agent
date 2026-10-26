import YAML from "yaml";
import fs from "fs";
import path from "path";

export function skillHandler(userPrompt) {
    const skills = loadSkills();
    const systemPrompt = buildSystemPrompt(skills);
    const resolvedUserPrompts = resolvePrompt(userPrompt, skills);
    return { skills, systemPrompt, resolvedUserPrompts };
}


//loads skills into array
function loadSkills() {
    const skillsDir = path.join(process.cwd(), ".claude", "skills");
    if (!fs.existsSync(skillsDir)) return [];

    //Scan .claude/skills/, run through the skill folders and parse the frontmatter to read the name and description out of each SKILL.md,
    // and add them to your system prompt. Do not include the bodies.
    const skills = [];

    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;

        const file = path.join(skillsDir, entry.name, "SKILL.md");
        if (!fs.existsSync(file)) continue;

        const content = fs.readFileSync(file, "utf8");
        // check if contains frontmatter between "---" and extract it
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
        if (!match) continue;

        //parse it to add it to the skills
        const meta = YAML.parse(match[1]) ?? {};
        skills.push({
            name: meta.name ?? entry.name,
            description: meta.description ?? "",
            context: meta.context,
            body: match[2].trim(),
        });
    }
    return skills;
}

function buildSystemPrompt(skills) {
    const list = skills.map((s) => `- ${s.name}: ${s.description}`).join("\n");
    return `You have access to the following skills:\n\n${list}\n\nIf a skill matches the user's request, call the Skill tool with its name\nand follow the instructions it returns.`;
}

//builds the user prompt with positional args tokens
function resolvePrompt(prompt, skills) {

    //splits prompt (each token is a skill or ARGUMENT)
    const tokens = prompt.trim().split(/\s+/);
    const used = [];
    let i = 0;

    //while token starts with /, it's a skill, i push it in an array
    while (i < tokens.length && tokens[i].startsWith("/")) {
        const skill = skills.find((s) => s.name === tokens[i].slice(1));
        if (!skill) break;
        used.push(skill);
        i++;
    }

    //if it doesn not start with / it's a user message
    if (used.length === 0) return [{ role: "user", content: prompt }];

    //the rest, is shared ARGUMENT between the skills, we take
    // each skill with map and fill their body with "rest"
    const rest = tokens.slice(i);
    return used.map((skill) => ({
        role: "user",
        content: fillBody(skill.body, rest),
    }));
}

// fills a single body with positional token ARGUMENTS
function fillBody(body, tokens, appendArgs = true) {
    const args = tokens.join(" ");

    if (!/\$ARGUMENTS|\$\d+/.test(body)) {
        return args && appendArgs ? `${body}\n\nARGUMENTS: ${args}` : body;
    }
    return body.replace(/\$ARGUMENTS|\$(\d+)/g, (_m, index) =>
        index === undefined ? args : (tokens[Number(index)] ?? "")
    );
}

//for subagent skill calls
export function expandSkill(skills, { name, args }) {
    const skill = skills.find((s) => s.name === name);
    if (!skill) return null;

    const tokens = (args ?? "").trim().split(/\s+/).filter(Boolean);
    return { skill, text: fillBody(skill.body, tokens, skill.context !== "fork") };
}