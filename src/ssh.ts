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
  let keyPath = config.privateKeyPath;

  // If no password and no explicit private key provided, try default keys
  if (!config.password && !keyPath) {
    const homeDir = os.homedir();
    const ed25519Path = path.join(homeDir, ".ssh", "id_ed25519");
    const rsaPath = path.join(homeDir, ".ssh", "id_rsa");

    if (fs.existsSync(ed25519Path)) {
      keyPath = ed25519Path;
    } else if (fs.existsSync(rsaPath)) {
      keyPath = rsaPath;
    }
  }

  try {
    await ssh.connect({
      host: config.host,
      username: config.username,
      port: config.port || 22,
      password: config.password,
      privateKeyPath: keyPath,
    });

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
