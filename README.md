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

### For Gemini CLI

Run the following command in your terminal, replacing `/path/to/SSH-MCP` with the absolute path to where you cloned this repository:

```bash
gemini-cli mcp add ssh-mcp "node /path/to/SSH-MCP/build/index.js"
```

### For Claude Code

You can add this to your `claude_desktop_config.json` or run:

```bash
claude mcp add ssh-mcp "node" "/path/to/SSH-MCP/build/index.js"
```

### For Continue

Add the following to your `config.json` under `mcpServers`:

```json
{
  "mcpServers": {
    "ssh-mcp": {
      "command": "node",
      "args": ["/path/to/SSH-MCP/build/index.js"]
    }
  }
}
```

## How the Agent uses it

Once configured, simply instruct your agent:
*"Connect to my remote server at `example.com` with username `ubuntu` and check the disk space."*

The agent will seamlessly use the `ssh_execute_command` tool to execute `df -h` on the remote server and return the results directly into the conversation.
