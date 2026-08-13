#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { deriveCompletionState } from "./derive-completion-state.mjs";
import { parseRequirementOwnership } from "./parse-requirement-ownership.mjs";
import { parseTasks } from "./parse-tasks.mjs";
import { resolveFeatureDirectory } from "./lib/feature-directory.mjs";

const requiredPhases = ["Setup", "Foundational", "Delivery", "Polish"];

function result(gate, issues, completion = null) {
  return {
    valid: issues.length === 0,
    gate,
    resumeAt: issues.length > 0 ? gate : null,
    issues,
    completion,
  };
}

function validateSpec(source) {
  const parsed = parseRequirementOwnership(source);
  const text = source.toString("utf8");
  const issues = [...parsed.errors];
  const markers = (text.match(/\[NEEDS CLARIFICATION(?::[^\]]*)?\]/g) ?? []).length;
  if (markers > 3) issues.push(`unresolved clarification marker count ${markers} exceeds 3`);
  if (/STF-\d{3}:.*\((?:CRITICAL|HIGH)\)/.test(text)) issues.push("unresolved CRITICAL/HIGH stress-test finding");
  return { issues, p1RequirementIds: parsed.p1RequirementIds };
}

function validatePlan(source, requirementIds) {
  const text = source.toString("utf8");
  const issues = [];
  for (const heading of ["Instructions Check", "Technical Context", "Requirement Coverage Map", "Acceptance Test Stubs"]) {
    if (!new RegExp(`^## ${heading}$`, "m").test(text)) issues.push(`plan.md missing ${heading}`);
  }
  if (Buffer.byteLength(source) > 10 * 1024) issues.push("plan.md exceeds 10 KB");

  const coverage = new Set([...text.matchAll(/^\|\s*((?:FR|TR|OR|RR)-\d{3})\s*\|\s*([^|]+)\|\s*([^|]+)\|/gm)]
    .filter((match) => match[2].trim() && match[3].trim())
    .map((match) => match[1]));
  for (const id of requirementIds) if (!coverage.has(id)) issues.push(`plan.md has no concrete coverage row for ${id}`);

  const decisions = [...text.matchAll(/^\|\s*(AD-\d{3})\s*\|/gm)].map((match) => match[1]);
  for (const id of decisions) {
    if ((text.match(new RegExp(`\\b${id}\\b`, "g")) ?? []).length < 2) issues.push(`orphaned architecture decision ${id}`);
  }
  return issues;
}

function hasDependencyCycle(tasks) {
  const graph = new Map(tasks.map((task) => [task.id, task.dependencies]));
  const active = new Set();
  const complete = new Set();
  const visit = (id) => {
    if (active.has(id)) return true;
    if (complete.has(id)) return false;
    active.add(id);
    for (const dependency of graph.get(id) ?? []) if (graph.has(dependency) && visit(dependency)) return true;
    active.delete(id);
    complete.add(id);
    return false;
  };
  return [...graph.keys()].some(visit);
}

function validateTasks(source, requirementIds) {
  const parsed = parseTasks(source);
  const issues = parsed.errors.map(({ line, message }) => `line ${line}: ${message}`);
  if (Buffer.byteLength(source) > 6 * 1024) issues.push("tasks.md exceeds 6 KB");
  for (const id of requirementIds) {
    if (!parsed.tasks.some((task) => task.requirements.includes(id))) issues.push(`tasks.md has no task for ${id}`);
  }
  if (hasDependencyCycle(parsed.tasks)) issues.push("tasks.md has a circular after: chain");
  const phaseNames = parsed.tasks.map(({ phase }) => phase).filter(Boolean);
  let previous = -1;
  for (const phase of phaseNames) {
    const index = requiredPhases.findIndex((name) => phase.includes(name));
    if (index < 0 || index < previous) {
      issues.push("tasks.md has invalid phase structure");
      break;
    }
    previous = index;
  }
  return issues;
}

function validateChecklists(featureDirectory) {
  const directory = path.join(featureDirectory, "checklists");
  if (!existsSync(directory)) return [];
  const issues = [];
  for (const name of readdirSync(directory).filter((file) => file.endsWith(".md"))) {
    const source = readFileSync(path.join(directory, name), "utf8");
    if (/^- \[ \] CHK\d{3}\b/m.test(source)) issues.push(`checklist ${name} is incomplete`);
  }
  return issues;
}

export function evaluateFeatureLifecycle(featureDir, repoRoot = process.cwd()) {
  const featureDirectory = resolveFeatureDirectory(featureDir, repoRoot).absolutePath;
  const specPath = path.join(featureDirectory, "spec.md");
  const planPath = path.join(featureDirectory, "plan.md");
  const tasksPath = path.join(featureDirectory, "tasks.md");
  if (!existsSync(specPath)) return result("specify", ["spec.md is missing"]);

  const spec = validateSpec(readFileSync(specPath));
  if (spec.issues.length > 0) return result("spec-to-plan", spec.issues);
  if (!existsSync(planPath)) return result("plan", ["plan.md is missing"]);

  const planIssues = validatePlan(readFileSync(planPath), spec.p1RequirementIds);
  if (planIssues.length > 0) return result("plan-to-tasks", planIssues);
  if (!existsSync(tasksPath)) return result("tasks", ["tasks.md is missing"]);

  const taskIssues = validateTasks(readFileSync(tasksPath), spec.p1RequirementIds);
  if (taskIssues.length > 0) return result("tasks-to-implement", taskIssues);
  const checklistIssues = validateChecklists(featureDirectory);
  if (checklistIssues.length > 0) return result("checklist-to-implement", checklistIssues);

  const completion = deriveCompletionState(featureDir, repoRoot);
  if (completion.COMPLETION_STATE === "inconsistent") return result("completion", completion.COMPLETION_ISSUES, completion);
  return {
    valid: true,
    gate: "ready",
    resumeAt: completion.QC_COMPLETE ? "complete" : completion.IMPLEMENTATION_COMPLETE ? "qc" : "implement",
    issues: [],
    completion,
  };
}

function main() {
  const featureDir = process.argv[2];
  if (!featureDir) throw new Error("Usage: node scripts/evaluate-feature-lifecycle.mjs <feature-dir>");
  const lifecycle = evaluateFeatureLifecycle(featureDir);
  console.log(JSON.stringify(lifecycle, null, 2));
  if (!lifecycle.valid) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
