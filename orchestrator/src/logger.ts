import chalk from "chalk";
import { appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { LogEntry } from "./types.js";

let logFilePath: string | undefined;

/** Initialize the log file at the workspace root */
export function initLogFile(workspaceRoot: string): void {
  logFilePath = join(workspaceRoot, "orchestrator-log.md");
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
};
