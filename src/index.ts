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
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

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
  username: z.string().describe("The SSH username"),
  command: z.string().describe("The shell command to execute remotely"),
  privateKeyPath: z.string().optional().describe("Path to the private key (defaults to ~/.ssh/id_rsa or ~/.ssh/id_ed25519)"),
  password: z.string().optional().describe("SSH password (if not using private key)"),
  port: z.number().optional().default(22).describe("SSH port (defaults to 22)"),
});

// Parse command line arguments for allowed hosts
let allowedHosts = process.argv.slice(2);

// If no hosts are provided, try to read from ~/.ssh/config
if (allowedHosts.length === 0) {
  try {
    const sshConfigPath = path.join(os.homedir(), ".ssh", "config");
    if (fs.existsSync(sshConfigPath)) {
      const configContent = fs.readFileSync(sshConfigPath, "utf8");
      const hostRegex = /^[ \t]*Host\s+(.+)$/gm;
      let match;
      while ((match = hostRegex.exec(configContent)) !== null) {
        const hosts = match[1].split(/\s+/);
        for (const h of hosts) {
          if (h !== "*" && !h.includes("*") && !h.includes("?")) {
            allowedHosts.push(h);
          }
        }
      }
    }
  } catch (error) {
    console.error("Failed to parse ~/.ssh/config:", error);
  }
}

// Remove duplicates
allowedHosts = [...new Set(allowedHosts)];

if (allowedHosts.length === 0) {
  console.error("No allowed hosts provided. Please specify hosts as arguments (e.g., ssh-mcp 10.101.0.108 example.com) or configure them in ~/.ssh/config.");
  process.exit(1);
}

// Map of safe tool names to actual hostnames
const hostMap = new Map<string, string>();
const toolsList: any[] = [];

for (const host of allowedHosts) {
  // Convert hostname to a safe tool name format: a-z, A-Z, 0-9, _, -
  const safeHost = host.replace(/[^a-zA-Z0-9_-]/g, "_");
  const toolName = `ssh_execute_${safeHost}`;
  
  // To avoid collisions if multiple hosts map to the same safeHost
  if (!hostMap.has(toolName)) {
    hostMap.set(toolName, host);
    
    toolsList.push({
      name: toolName,
      description: `A wrapper to execute a shell command on the remote server '${host}' via SSH.`,
      inputSchema: {
        type: "object",
        properties: {
          username: { type: "string", description: "The SSH username" },
          command: {
            type: "string",
            description: "The shell command to execute remotely (e.g., ls -la, cat file.txt)",
          },
          privateKeyPath: {
            type: "string",
            description: "Path to the private key (defaults to ~/.ssh/id_rsa or ~/.ssh/id_ed25519)",
          },
          password: { type: "string", description: "SSH password" },
          port: { type: "number", description: "SSH port (defaults to 22)" },
        },
        required: ["username", "command"],
      },
    });
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: toolsList,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  
  if (!hostMap.has(toolName)) {
    throw new McpError(
      ErrorCode.MethodNotFound,
      `Unknown tool: ${toolName}`
    );
  }

  const targetHost = hostMap.get(toolName)!;

  try {
    const args = SSHCommandSchema.parse(request.params.arguments);

    const result = await executeSSHCommand({
      host: targetHost,
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
