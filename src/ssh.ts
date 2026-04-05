import { NodeSSH } from "node-ssh";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

export interface SSHConfig {
  host: string;
  username: string;
  command: string;
  privateKeyPath?: string;
  password?: string;
  port?: number;
}

export async function executeSSHCommand(
  config: SSHConfig
): Promise<{ stdout: string; stderr: string }> {
  const ssh = new NodeSSH();

  let keysToTry: string[] = [];
  if (config.privateKeyPath) {
    keysToTry.push(config.privateKeyPath);
  } else if (!config.password) {
    const homeDir = os.homedir();
    const ed25519Path = path.join(homeDir, ".ssh", "id_ed25519");
    const rsaPath = path.join(homeDir, ".ssh", "id_rsa");
    
    // Add all standard keys if they exist
    if (fs.existsSync(ed25519Path)) keysToTry.push(ed25519Path);
    if (fs.existsSync(rsaPath)) keysToTry.push(rsaPath);
  }

  let connected = false;
  let lastError: any = null;

  if (keysToTry.length > 0) {
    for (const keyPath of keysToTry) {
      try {
        await ssh.connect({
          host: config.host,
          username: config.username,
          port: config.port || 22,
          password: config.password,
          privateKeyPath: keyPath,
          readyTimeout: 30000,
          agent: process.env.SSH_AUTH_SOCK,
        });
        connected = true;
        break; // Connected successfully
      } catch (err) {
        lastError = err;
        // Keep trying the next key
      }
    }
  } else {
    // Try connecting with password only, or SSH agent
    try {
      await ssh.connect({
        host: config.host,
        username: config.username,
        port: config.port || 22,
        password: config.password,
        readyTimeout: 30000,
        agent: process.env.SSH_AUTH_SOCK,
      });
      connected = true;
    } catch (err) {
      lastError = err;
    }
  }

  if (!connected) {
    throw lastError || new Error("Failed to connect using provided authentication methods.");
  }

  try {
    const result = await ssh.execCommand(config.command, {
      cwd: ".",
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } finally {
    ssh.dispose();
  }
}
