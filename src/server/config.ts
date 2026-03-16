/** Server configuration — reads from config.json and environment variables. */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(__dirname, "..", "..", "config.json");

interface FileConfig {
  readonly port?: number;
  readonly pollInterval?: number;
}

function loadFileConfig(): FileConfig {
  try {
    const raw = readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as FileConfig;
  } catch {
    return {};
  }
}

const fileConfig = loadFileConfig();

export const config = {
  /** Server port. */
  port: parseInt(process.env["DESK_MIRROR_SERVER_PORT"] ?? "", 10) || (fileConfig.port ?? 3847),

  /** How often to broadcast status messages (ms). */
  statusInterval: 5000,
} as const;
