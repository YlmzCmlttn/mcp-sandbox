from agents import Agent, ModelSettings, function_tool, trace
from agents import Agent, InputGuardrail, GuardrailFunctionOutput, Runner

from agents import Agent, Runner, gen_trace_id, trace
from agents.mcp import MCPServer, MCPServerStdio
from pydantic import BaseModel
import asyncio
import uuid
import sys
import os
import shutil



async def run(mcp_server: MCPServer):
    agent = Agent(
        name="Assistant",
        instructions="Use the tools to get the weather information.",
        mcp_servers=[mcp_server],
        model = "gpt-4o-mini"
    )

    # List the files it can read
    message = "What city is the Golden Gate Bridge in?"
    print(f"Running: {message}")
    result = await Runner.run(starting_agent=agent, input=message)
    print(result.final_output)

    message = "What is the weather in it?"
    print(f"Running: {message}")
    print(result.to_input_list())
    new_input = result.to_input_list() + [{"role": "user", "content": message}]
    result = await Runner.run(starting_agent=agent, input=new_input)
    print(result.final_output)
    print(result.to_input_list())

    message = "What was the timestamp and id?"
    print(f"Running: {message}")
    new_input = result.to_input_list() + [{"role": "user", "content": message}]
    result = await Runner.run(starting_agent=agent, input=new_input)
    print(result.final_output)
    print(result.to_input_list())

async def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))

    async with MCPServerStdio(
        name="Weather Server, via npx",
        params={
            "command": "npx",
            "args": ["-y", "."],
        },
    ) as server:
        trace_id = gen_trace_id()
        with trace(workflow_name="MCP Filesystem Example", trace_id=trace_id):
            print(f"View trace: https://platform.openai.com/traces/trace?trace_id={trace_id}\n")
            await run(server)


if __name__ == "__main__":
    # Let's make sure the user has npx installed
    if not shutil.which("npx"):
        raise RuntimeError("npx is not installed. Please install it with `npm install -g npx`.")

    asyncio.run(main())
