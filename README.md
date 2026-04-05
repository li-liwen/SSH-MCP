# SSH MCP Server

A Model Context Protocol (MCP) server that provides an SSH command wrapper for AI coding agents. This allows agents (like Gemini CLI, Claude Code, and Continue) to securely execute shell commands on remote servers using a dedicated tool, ensuring that you receive proper native permission prompts for remote execution.

## Motivation

When using AI coding agents, if the agent simply runs the local `ssh` command using its local shell runner, you get a generic "Allow local command execution?" prompt. Furthermore, the agent has to construct complex string arrays for arguments.
By exposing `ssh_execute_command` as a native MCP tool, the agent cleanly requests permission to use the SSH tool, separating local operations from remote operations. 

## Features

- Exposes the `ssh_execute_command` tool.
- Automatically handles standard SSH keys (`~/.ssh/id_ed25519` or `~/.ssh/id_rsa`) if no explicit authentication is provided.
- Compatible with all major MCP clients.

## Installation and Build

Ensure you have Node.js installed.

```bash
git clone https://github.com/li-liwen/SSH-MCP.git
cd SSH-MCP
npm install
npm run build
```

## Configuration

You need to add this MCP server to your preferred coding agent. 

### For Gemini

First, link the package globally (or install it globally using `npm install -g .`):
```bash
npm link
```

Then add it to your environment:
```bash
gemini mcp add ssh-mcp ssh-mcp
```

### For Claude Code

Run the following command in your terminal:

```bash
claude mcp add ssh-mcp ssh-mcp
```

### For Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ssh-mcp": {
      "command": "ssh-mcp",
      "args": []
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
      "args": []
    }
  }
}
```

## How the Agent uses it

Once configured, simply instruct your agent:
*"Connect to my remote server at `example.com` with username `ubuntu` and check the disk space."*

The agent will seamlessly use the `ssh_execute_command` tool to execute `df -h` on the remote server and return the results directly into the conversation.
