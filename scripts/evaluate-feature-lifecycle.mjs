#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { deriveCompletionState } from "./derive-completion-state.mjs";
import { resolveFeatureDirectory } from "./lib/feature-directory.mjs";
import { assessChecklistState } from "./checklist-state.mjs";
import { evaluatePlanGate, evaluateSpecGate, evaluateTasksGate } from "./phase-gates.mjs";

function result(gate, issues, completion = null) {
  return {
    valid: issues.length === 0,
    gate,
    resumeAt: issues.length > 0 ? gate : null,
    issues,
    completion,
  };
}


function validateChecklists(featureDirectory) {
  return assessChecklistState(featureDirectory).issues;
}

export function evaluateFeatureLifecycle(featureDir, repoRoot = process.cwd()) {
  const featureDirectory = resolveFeatureDirectory(featureDir, repoRoot).absolutePath;
  const specPath = path.join(featureDirectory, "spec.md");
  const planPath = path.join(featureDirectory, "plan.md");
  const tasksPath = path.join(featureDirectory, "tasks.md");
  if (!existsSync(specPath)) return result("specify", ["spec.md is missing"]);

  const spec = evaluateSpecGate(readFileSync(specPath), { projectPlanExists: existsSync(path.join(repoRoot, "specs", "project-plan.md")) });
  if (!spec.valid) return result("spec-to-plan", spec.issues);
  if (!existsSync(planPath)) return result("plan", ["plan.md is missing"]);

  const plan = evaluatePlanGate(readFileSync(planPath), spec.p1RequirementIds);
  if (!plan.valid) return result("plan-to-tasks", plan.issues);
  if (!existsSync(tasksPath)) return result("tasks", ["tasks.md is missing"]);

  const tasks = evaluateTasksGate(readFileSync(tasksPath), spec.p1RequirementIds);
  if (!tasks.valid) return result("tasks-to-implement", tasks.issues);
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
