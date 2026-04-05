# SSH MCP Server

A Model Context Protocol (MCP) server that provides an SSH command wrapper for AI coding agents. This allows agents (like Gemini CLI, Claude Code, and Continue) to securely execute shell commands on remote servers using a dedicated tool, ensuring that you receive proper native permission prompts for remote execution.

## Motivation

When using AI coding agents, if the agent simply runs the local `ssh` command using its local shell runner, you get a generic "Allow local command execution?" prompt. Furthermore, the agent has to construct complex string arrays for arguments.
By exposing `ssh_execute_command` as a native MCP tool, the agent cleanly requests permission to use the SSH tool, separating local operations from remote operations. 

## Features

- **Per-Host Permissions**: Dynamically generates a specific tool for each allowed host (e.g., `ssh_execute_example_com`). This allows your AI agent's permission system to ask for permission *per server*. Once you approve a host for a session, the AI can execute commands on it seamlessly, but connecting to a new host will trigger a new permission request.
- **Auto-Discovery**: Automatically parses your `~/.ssh/config` to discover available hosts, or accepts specific allowed hosts via command-line arguments.
- **Key Management**: Automatically handles standard SSH keys (`~/.ssh/id_ed25519` or `~/.ssh/id_rsa`) and works with `ssh-agent`.
- **Cross-Platform**: Compatible with all major MCP clients.

## Installation and Build

Ensure you have Node.js installed.

```bash
git clone https://github.com/li-liwen/SSH-MCP.git
cd SSH-MCP
npm install
npm run build
```

## Configuration

You need to add this MCP server to your preferred coding agent. By default, `ssh-mcp` will read your `~/.ssh/config` file to discover allowed hosts. Alternatively, you can explicitly pass the allowed hosts as arguments.

### For Gemini

First, link the package globally (or install it globally using `npm install -g .`):
```bash
npm link
```

Then add it to your environment. You can pass specific allowed IP addresses or hostnames at the end:
```bash
gemini mcp add ssh-mcp ssh-mcp 10.101.0.108 example.com
```
*(If you omit the hosts, it will automatically expose tools for all hosts found in `~/.ssh/config`).*

### For Claude Code

Run the following command in your terminal:

```bash
claude mcp add ssh-mcp ssh-mcp 10.101.0.108
```

### For Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ssh-mcp": {
      "command": "ssh-mcp",
      "args": ["10.101.0.108", "example.com"]
    }
  }
}
```

### For Continue & Other Agents (OpenCode, Codex, Cursor)

Add the following to your `config.json` (or equivalent settings file) under `mcpServers`:

```json
{
  "mcpServers": {
    "ssh-mcp": {
      "command": "ssh-mcp",
      "args": ["10.101.0.108"]
    }
  }
}
```

## How the Agent uses it

Once configured, the MCP server will expose explicit tools like `ssh_execute_10_101_0_108`. Simply instruct your agent:
*"Connect to my remote server at `10.101.0.108` with username `ubuntu` and check the disk space."*

The agent will seamlessly use the explicit per-host tool (like `ssh_execute_10_101_0_108`) to execute commands (e.g., `df -h`) on the remote server and return the results directly into the conversation.
