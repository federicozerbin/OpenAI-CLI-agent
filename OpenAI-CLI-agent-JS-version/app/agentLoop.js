import {executeToolHandler} from "./toolHandler.js";
import { expandSkill } from "./skillHandler.js";

export async function startAgent(client, model, messages, tools, skills){
    while (true) {
        const response = await client.chat.completions.create({
            model,
            messages,
            tools,
        });

        if (!response.choices || response.choices.length === 0) {
            throw new Error("no choices in response");
        }

        const assistantMessage = response.choices[0].message;
        messages.push(assistantMessage);

        const toolCalls = assistantMessage.tool_calls;

        if (!toolCalls?.length) {
            return assistantMessage.content;
        }

        for (const toolCall of toolCalls) {
            const functionName = toolCall.function.name;
            const functionParameters = JSON.parse(toolCall.function.arguments);

            let result;
            try {
                if (functionName === "Skill") {
                    //subagent call
                    result = await runSkill(client, model, tools, skills, functionParameters);
                } else {
                    //normal call
                    result = await executeToolHandler(functionName, functionParameters);
                }
            } catch (e) {
                console.error("Tool error:", functionName, e);
                result = `Error: ${e.message}`;
            }

            messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: String(result ?? ""),
            });
        }
    }
}

//runskill searches for context, called by agent if theres a skill
async function runSkill(client, model, tools, skills, params) {
    const expanded = expandSkill(skills, params);
    if (!expanded) return `Error: skill "${params.name}" not found`;

    //skill with no context return body
    if (expanded.skill.context !== "fork") return expanded.text;

    //skill with context has a subagent
    const subMessages = [{ role: "user", content: expanded.text }];
    const answer = await startAgent(client, model, subMessages, tools, skills);

    return `Skill ${params.name} ran in a separate context and returned: ${answer}`;
}