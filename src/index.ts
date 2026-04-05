#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { executeSSHCommand } from "./ssh.js";

const server = new Server(
  {
    name: "ssh-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tool schema
const SSHCommandSchema = z.object({
  host: z.string().describe("The remote server hostname or IP address"),
  username: z.string().describe("The SSH username"),
  command: z.string().describe("The shell command to execute remotely"),
  privateKeyPath: z.string().optional().describe("Path to the private key (defaults to ~/.ssh/id_rsa or ~/.ssh/id_ed25519)"),
  password: z.string().optional().describe("SSH password (if not using private key)"),
  port: z.number().optional().default(22).describe("SSH port (defaults to 22)"),
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "ssh_execute_command",
        description:
          "A wrapper to execute a shell command on a remote server via SSH.",
        inputSchema: {
          type: "object",
          properties: {
            host: {
              type: "string",
              description: "The remote server hostname or IP address",
            },
            username: { type: "string", description: "The SSH username" },
            command: {
              type: "string",
              description: "The shell command to execute remotely (e.g., ls -la, cat file.txt)",
            },
            privateKeyPath: {
              type: "string",
              description:
                "Path to the private key (defaults to ~/.ssh/id_rsa or ~/.ssh/id_ed25519)",
            },
            password: { type: "string", description: "SSH password" },
            port: { type: "number", description: "SSH port (defaults to 22)" },
          },
          required: ["host", "username", "command"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "ssh_execute_command") {
    throw new McpError(
      ErrorCode.MethodNotFound,
      `Unknown tool: ${request.params.name}`
    );
  }

  try {
    const args = SSHCommandSchema.parse(request.params.arguments);

    const result = await executeSSHCommand({
      host: args.host,
      username: args.username,
      command: args.command,
      privateKeyPath: args.privateKeyPath,
      password: args.password,
      port: args.port,
    });

    let outputText = "";
    if (result.stdout) {
      outputText += `STDOUT:\n${result.stdout}\n`;
    }
    if (result.stderr) {
      outputText += `STDERR:\n${result.stderr}\n`;
    }

    return {
      content: [
        {
          type: "text",
          text: outputText.trim() || "(Empty output)",
        },
      ],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid arguments: ${error.message}`
      );
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error executing command: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SSH MCP Server running on stdio");
}

run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
