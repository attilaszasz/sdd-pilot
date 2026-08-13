import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseTasks } from "../parse-tasks.mjs";

const MAX_BYTES = 6144;
const TASK_ID = /^T(\d{3})$/;
const PHASES = ["Setup", "Foundational", "Delivery", "Polish", "Bug Fixes"];

function phaseName(heading) {
  if (/^Phase:\s*Bug Fixes$/.test(heading)) return "Bug Fixes";
  if (/^Phase \d+: Setup$/.test(heading)) return "Setup";
  if (/^Phase \d+: Foundational$/.test(heading)) return "Foundational";
  if (/^Phase \d+: Delivery \[(?:US|OBJ)\d+\]$/.test(heading)) return "Delivery";
  if (/^Phase \d+: Polish$/.test(heading)) return "Polish";
  return null;
}

function phaseErrors(text) {
  const errors = [];
  let last = -1;
  const seen = new Set();
  const headings = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const match = line.match(/^##\s+(.+?)\s*$/);
    if (!match) continue;
    const phase = phaseName(match[1]);
    if (!phase && match[1].startsWith("Phase")) {
      errors.push({ line: index + 1, code: "invalid-phase", message: `invalid phase heading ${match[1]}`, source: line });
      continue;
    }
    if (!phase) continue;
    const position = PHASES.indexOf(phase);
    if (position < last || (phase !== "Delivery" && seen.has(phase))) {
      errors.push({ line: index + 1, code: "invalid-phase-order", message: `invalid phase order for ${match[1]}`, source: line });
    }
    seen.add(phase);
    last = Math.max(last, position);
    headings.push({ line: index + 1, phase, source: line });
  }
  const lines = text.split(/\r?\n/);
  for (const [index, heading] of headings.entries()) {
    if (heading.phase === "Delivery" || heading.phase === "Bug Fixes") continue;
    const end = headings[index + 1]?.line - 1 ?? lines.length;
    if (!lines.slice(heading.line, end).some((line) => /^- \[[ X]\] T\d+\b/.test(line))) {
      errors.push({ line: heading.line, code: "empty-optional-phase", message: `${heading.phase} phase must be omitted when empty`, source: heading.source });
    }
  }
  return errors;
}

function sequentialIdErrors(tasks) {
  const errors = [];
  let previous = null;
  for (const task of tasks) {
    const value = Number(TASK_ID.exec(task.id)?.[1]);
    if (previous !== null && value !== previous + 1) {
      errors.push({ line: null, code: "non-sequential-task-id", message: `task ID ${task.id} does not follow T${String(previous).padStart(3, "0")}`, source: task.id });
    }
    previous = value;
  }
  return errors;
}

export function preflightBugTasks(tasksText, additions) {
  if (!Array.isArray(additions) || additions.some((addition) => typeof addition !== "string" || !addition.trim())) {
    throw new TypeError("BUG task additions must be non-empty strings");
  }
  const separator = tasksText.endsWith("\n") ? "\n" : "\n\n";
  const candidate = `${tasksText}${separator}${additions.join("\n")}${tasksText.endsWith("\n") ? "" : "\n"}`;
  const parsed = parseTasks(candidate);
  const unphased = parsed.tasks
    .filter((task) => !phaseName(task.phase ?? ""))
    .map((task) => ({ line: null, code: "invalid-task-phase", message: `task ${task.id} is not in a valid phase`, source: task.id }));
  const errors = [...parsed.errors, ...sequentialIdErrors(parsed.tasks), ...phaseErrors(candidate), ...unphased];
  if (Buffer.byteLength(candidate, "utf8") > MAX_BYTES) {
    errors.push({ line: null, code: "file-size-limit", message: `tasks.md size ${Buffer.byteLength(candidate, "utf8")} exceeds the maximum of ${MAX_BYTES} bytes`, source: "tasks.md" });
  }
  return { valid: errors.length === 0, candidate, errors, taskCount: parsed.taskCount, bytes: Buffer.byteLength(candidate, "utf8") };
}

export async function applyBugTasks(tasksPath, additions, operations = {}) {
  const fs = { readFile, writeFile, rename, unlink, ...operations };
  const original = await fs.readFile(tasksPath, "utf8");
  const result = preflightBugTasks(original, additions);
  if (!result.valid) return { ...result, written: false };

  const temporaryPath = `${tasksPath}.qc-bugs-${process.pid}.tmp`;
  try {
    await fs.writeFile(temporaryPath, result.candidate, { encoding: "utf8", flag: "wx" });
    await fs.rename(temporaryPath, tasksPath);
  } catch (cause) {
    await fs.unlink(temporaryPath).catch(() => {});
    throw cause;
  }
  return { ...result, written: true };
}

async function main() {
  const [tasksPath] = process.argv.slice(2);
  if (!tasksPath) throw new Error("Usage: node scripts/lib/qc-bug-tasks.mjs <tasks.md> < additions.json");
  let stdin = "";
  for await (const chunk of process.stdin) stdin += chunk;
  const input = JSON.parse(stdin);
  const result = await applyBugTasks(path.resolve(tasksPath), input.additions);
  console.log(JSON.stringify(result));
  if (!result.valid) process.exitCode = 1;
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main().catch((cause) => {
    console.error(cause.message);
    process.exitCode = 1;
  });
}
