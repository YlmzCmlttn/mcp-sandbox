#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Schema definitions
const GetWeatherSchema = z.object({
  city: z.string().min(1, "City name cannot be empty"),
});

const GetWeatherOutputSchema = z.object({
  weather: z.string(),
  city: z.string(),
  timestamp: z.string(),
});
// Server setup
const server = new Server(
  {
    name: "weather-server",
    version: "0.0.1",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

async function get_weather(city: string) : Promise<z.infer<typeof GetWeatherOutputSchema>> {
  try {
    // This is a mock implementation
    // In a real application, you would call a weather API here
    if (!city || city.trim() === '') {
      throw new Error('City name is required');
    }
    
    return {
      weather: "sunny",
      city: city,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(`Failed to get weather for ${city}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_weather",
        description: "Get the weather for a city",
        inputSchema: zodToJsonSchema(GetWeatherSchema) as z.infer<typeof ToolSchema.shape.inputSchema>,
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "get_weather": {
        const parsed = GetWeatherSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for get_weather: ${parsed.error}`);
        }
        const weather = await get_weather(parsed.data.city);
        const output = GetWeatherOutputSchema.parse(weather);
        return {
          content: [{ type: "text", text: JSON.stringify(output) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Server started");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
