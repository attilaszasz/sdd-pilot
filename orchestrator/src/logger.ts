import chalk from "chalk";
import { appendFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import type { LogEntry } from "./types.js";

let logFilePath: string | undefined;

/** Initialize the log file at the workspace root */
export function initLogFile(workspaceRoot: string): void {
  logFilePath = join(workspaceRoot, "specs", "orchestrator-log.md");
  const logDir = dirname(logFilePath);
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
  writeFileSync(
    logFilePath,
    `# SDD Orchestrator Log\n\nStarted: ${new Date().toISOString()}\n\n| Timestamp | Level | Epic | Wave | Message |\n|-----------|-------|------|------|---------|\n`,
    "utf-8",
  );
}

function appendToFile(entry: LogEntry): void {
  if (!logFilePath) return;
  const epic = entry.epicId ?? "";
  const wave = entry.wave != null ? String(entry.wave) : "";
  appendFileSync(
    logFilePath,
    `| ${entry.timestamp} | ${entry.level} | ${epic} | ${wave} | ${entry.message} |\n`,
    "utf-8",
  );
}

function formatConsole(entry: LogEntry): string {
  const ts = entry.timestamp.slice(11, 19); // HH:MM:SS
  const prefix = entry.epicId ? `[${entry.epicId}]` : entry.wave != null ? `[Wave ${entry.wave}]` : "";
  return `${chalk.dim(ts)} ${prefix} ${entry.message}`;
}

function log(level: LogEntry["level"], message: string, epicId?: string, wave?: number): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    epicId,
    wave,
    message,
  };
  appendToFile(entry);

  switch (level) {
    case "SUCCESS":
      console.log(formatConsole({ ...entry, message: chalk.green(message) }));
      break;
    case "ERROR":
      console.error(formatConsole({ ...entry, message: chalk.red(message) }));
      break;
    case "WARN":
      console.warn(formatConsole({ ...entry, message: chalk.yellow(message) }));
      break;
    default:
      console.log(formatConsole(entry));
  }
}

export const logger = {
  info: (msg: string, epicId?: string, wave?: number) => log("INFO", msg, epicId, wave),
  warn: (msg: string, epicId?: string, wave?: number) => log("WARN", msg, epicId, wave),
  error: (msg: string, epicId?: string, wave?: number) => log("ERROR", msg, epicId, wave),
  success: (msg: string, epicId?: string, wave?: number) => log("SUCCESS", msg, epicId, wave),

  /** Print a prominent phase/wave banner */
  banner: (text: string) => {
    const line = "═".repeat(text.length + 4);
    console.log(chalk.cyan(`\n${line}\n  ${text}  \n${line}\n`));
  },

  /** Log a Markdown table of generated documents for an epic */
  epicDocuments: (epicId: string, featureDir: string, docs: string[]) => {
    if (!logFilePath || docs.length === 0) return;
    
    let table = `\n### Generated Documents for ${epicId}\n\n`;
    table += `| Document | Link |\n|----------|------|\n`;
    
    for (const doc of docs) {
      table += `| \`${doc}\` | [${doc}](./${featureDir}/${doc}) |\n`;
    }
    
    appendFileSync(logFilePath, table + "\n", "utf-8");
  },
};
