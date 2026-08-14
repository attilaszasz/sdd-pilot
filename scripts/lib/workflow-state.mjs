import { appendFileSync, existsSync, lstatSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

import { parseTasks } from "../parse-tasks.mjs";

const phases = new Set(["Gate", "Specify", "Clarify", "Plan", "Checklist", "Tasks", "Analyze", "Implement+QC", "Post-Pipeline"]);
const events = new Set(["phase_start", "phase_complete", "phase_skip", "gate_check", "decision", "halt", "epic_update"]);
const logHeader = "# Autopilot Execution Log\n\n> Auto-generated. Records every automatic decision, phase event, and gate check during autopilot execution.\n\n| Timestamp | Phase | Event | Detail | Outcome | Rationale | Artifacts |\n|-----------|-------|-------|--------|---------|-----------|-----------|\n";

function taskLines(source) {
  return source.split(/\r?\n/).filter((line) => /^- \[[ X]\] T\d{3}\b/.test(line));
}

function taskState(result) {
  if (!result || result.developer !== "PASS" || result.verify !== "PASS" || result.exports !== "PASS" || result.review !== "PASS") return "blocked";
  if (result.confidence === "UNCERTAIN") return "blocked";
  if (result.confidence === "TENTATIVE" && result.extraVerification !== "PASS") return "blocked";
  if (!["CONFIDENT", "TENTATIVE"].includes(result.confidence) || !["PASS", "SKIPPED"].includes(result.microQc)) return "blocked";
  return "complete";
}

export function commitTaskCompletion(source, results) {
  const parsed = parseTasks(source);
  if (!parsed.valid) throw new Error("tasks.md is malformed");
  const completed = [];
  const blocked = [];
  let output = source;
  for (const task of parsed.tasks.filter((task) => task.status === "pending")) {
    if (taskState(results[task.id]) !== "complete") {
      blocked.push(task.id);
      continue;
    }
    output = output.replace(new RegExp(`^- \\[ \\] ${task.id}\\b`, "m"), `- [X] ${task.id}`);
    completed.push(task.id);
  }
  return { source: output, completed, blocked };
}

export function reconcileTasksFile(tasksPath, candidate) {
  const original = readFileSync(tasksPath, "utf8");
  const baselineLines = taskLines(original);
  const candidateLines = taskLines(candidate);
  const baselineHeadings = original.match(/^## Phase .+$/gm) ?? [];
  const candidateHeadings = candidate.match(/^## Phase .+$/gm) ?? [];
  const ids = candidateLines.map((line) => line.match(/\b(T\d{3})\b/)?.[1]);
  if (ids.some((id, index) => !id || ids.indexOf(id) !== index) || baselineLines.some((line, index) => candidateLines[index] !== line) || baselineHeadings.some((line, index) => candidateHeadings[index] !== line)) {
    throw new Error("rerun would alter an existing task or phase header");
  }
  writeFileSync(tasksPath, candidate);
}

export function initializePlanAfterGate(planPath, gatePassed, createPlan) {
  if (!gatePassed) return false;
  if (!existsSync(planPath)) writeFileSync(planPath, createPlan());
  return true;
}

export function reserveChecklistPath(checklistPath) {
  if (existsSync(checklistPath)) throw new Error("checklist path collision");
  writeFileSync(checklistPath, "");
}

export function rejectDestructiveMigration(approved, mapping) {
  if (!approved || !Array.isArray(mapping) || mapping.length === 0) throw new Error("destructive migration requires an approved complete ID mapping");
}

function git(repo, args) {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

export function selectQcScope(repo, baseline) {
  if (!/^[0-9a-f]{40}$/.test(baseline ?? "")) return { mode: "full", reason: "baseline is missing or malformed", changedFiles: [] };
  try {
    git(repo, ["rev-parse", "--is-inside-work-tree"]);
    git(repo, ["cat-file", "-e", `${baseline}^{commit}`]);
    git(repo, ["merge-base", "--is-ancestor", baseline, "HEAD"]);
    const changedFiles = [...new Set([
      ...git(repo, ["diff", "--name-only", "--diff-filter=ACDMRTUXB", `${baseline}...HEAD`]).split("\n"),
      ...git(repo, ["diff", "--name-only", "HEAD"]).split("\n"),
      ...git(repo, ["ls-files", "--others", "--exclude-standard"]).split("\n"),
    ].filter(Boolean))].sort();
    return { mode: "scoped", baseline, changedFiles };
  } catch {
    return { mode: "full", reason: "baseline is unreachable or Git history is unavailable", changedFiles: [] };
  }
}

function checkedPath(featureDir, repoRoot, target) {
  if (!target || path.isAbsolute(target) || target.includes("\\")) throw new Error("artifact link must be relative");
  const resolved = path.resolve(featureDir, target);
  const root = path.resolve(repoRoot);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new Error("artifact link escapes repository root");
  let current = root;
  for (const segment of path.relative(root, resolved).split(path.sep)) {
    current = path.join(current, segment);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error("artifact link contains a symlink");
  }
}

export function initializeAutopilotLog(logPath, timestamp) {
  if (!existsSync(logPath)) writeFileSync(logPath, logHeader);
  appendFileSync(logPath, `\n## Run ${timestamp}\n\n| Timestamp | Phase | Event | Detail | Outcome | Rationale | Artifacts |\n|-----------|-------|-------|--------|---------|-----------|-----------|\n`);
}

export function appendAutopilotRow(logPath, row, featureDir, repoRoot) {
  const cells = row.match(/^\|(.+)\|$/)?.[1].split("|").map((cell) => cell.trim());
  if (!cells || cells.length !== 7 || !phases.has(cells[1]) || !events.has(cells[2])) throw new Error("invalid autopilot log row");
  for (const [, target] of cells[6].matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) checkedPath(featureDir, repoRoot, target);
  appendFileSync(logPath, `${row}\n`);
}

export function flushAutopilotRows(logPath, rows, featureDir, repoRoot, afterWrite = null) {
  while (rows.length > 0) {
    appendAutopilotRow(logPath, rows[0], featureDir, repoRoot);
    rows.shift();
    afterWrite?.();
  }
}
