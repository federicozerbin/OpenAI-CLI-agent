from app.tools import toolHandle
from app.skills import skillHandle, runSkill
import sys
import json

def startAgent(client, model, messages, TOOLS, skills):
    while True:
            chat = client.chat.completions.create(
                model=model,
                messages=messages,
                tools=TOOLS,
            )
    
            if not chat.choices:
                raise RuntimeError("no choices in response")
    
            assistantMessage = chat.choices[0].message
            messages.append(assistantMessage)
    
            toolCalls = assistantMessage.tool_calls
    
            if not toolCalls:
                return assistantMessage.content
    
            for call in toolCalls:
                functionName = call.function.name
                try:

                    if functionName == "Skill":
                        functionParameters = json.loads(call.function.arguments)
                        result = runSkill(client, model, TOOLS, skills, functionParameters)
                    else:
                        result = toolHandle(call)

                except Exception as e:
                    print("Tool error:", functionName, e, file=sys.stderr)
                    result = f"Error: {e}"

                messages.append({
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": str(result),
                })
    