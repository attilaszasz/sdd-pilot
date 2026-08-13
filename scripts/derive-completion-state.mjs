#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveFeatureDirectory } from "./lib/feature-directory.mjs";
import { parseQcEvidence } from "./lib/qc-evidence.mjs";
import { parseTasks } from "./parse-tasks.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readIfPresent = (filePath) => existsSync(filePath) ? readFileSync(filePath) : null;

function taskState(tasksBytes) {
  if (tasksBytes === null) return { complete: false, hasTasks: false, blocking: false };

  const parsed = parseTasks(tasksBytes);
  const blocking = !parsed.valid
    || parsed.tasks.some((task) => task.status === "pending" && !(task.bugSeverity === "WARNING" && task.deferred))
    || parsed.tasks.some((task) => (task.bugSeverity === "CRITICAL" || task.bugSeverity === "ERROR") && task.deferred);

  return {
    complete: parsed.taskCount > 0 && !blocking,
    hasTasks: parsed.taskCount > 0,
    blocking,
    errors: parsed.errors,
  };
}

export function deriveCompletionState(featureDir, repoRoot = process.cwd()) {
  const resolvedRoot = path.resolve(repoRoot);
  const resolvedFeatureDir = resolveFeatureDirectory(featureDir, resolvedRoot).absolutePath;
  const tasksBytes = readIfPresent(path.join(resolvedFeatureDir, "tasks.md"));
  const reportBytes = readIfPresent(path.join(resolvedFeatureDir, "qc-report.md"));
  const completedMarker = existsSync(path.join(resolvedFeatureDir, ".completed"));
  const qcMarkerBytes = readIfPresent(path.join(resolvedFeatureDir, ".qc-passed"));
  const tasks = taskState(tasksBytes);
  const report = parseQcEvidence(reportBytes, resolvedFeatureDir, resolvedRoot);
  const issues = [...report.issues, ...tasks.errors.map(({ line, message }) => `tasks.md line ${line}: ${message}`)];

  if (completedMarker && !tasks.complete) issues.push(".completed exists while tasks are incomplete");
  if (!completedMarker && tasks.complete) issues.push("tasks are complete but .completed is missing");

  const implementationComplete = completedMarker && tasks.complete;
  let qcComplete = false;

  if (qcMarkerBytes !== null) {
    const marker = qcMarkerBytes.toString("utf8");
    const reportDigest = marker.match(/^QC Report SHA-256:\s*([0-9a-f]{64})\s*$/m)?.[1];
    const evidenceDigest = marker.match(/^QC Evidence SHA-256:\s*([0-9a-f]{64})\s*$/m)?.[1];
    if (!implementationComplete) issues.push(".qc-passed exists while implementation is incomplete");
    if (report.verdict !== "PASS") issues.push(".qc-passed exists without a PASS report");
    if (!reportDigest || reportBytes === null || reportDigest !== sha256(reportBytes)) {
      issues.push(".qc-passed report digest does not match qc-report.md");
    }
    if (!evidenceDigest || evidenceDigest !== report.evidenceDigest) {
      issues.push(".qc-passed evidence digest does not match qc-report.md");
    }
    qcComplete = implementationComplete && report.verdict === "PASS" && report.validEvidence
      && reportDigest === sha256(reportBytes) && evidenceDigest === report.evidenceDigest;
  } else if (report.verdict === "PASS") {
    issues.push("qc-report.md is PASS but .qc-passed is missing");
  }

  return {
    IMPLEMENTATION_COMPLETE: implementationComplete,
    QC_COMPLETE: qcComplete,
    COMPLETION_STATE: issues.length > 0
      ? "inconsistent"
      : qcComplete
        ? "complete"
        : implementationComplete
          ? "qc-pending"
          : "implementation-pending",
    COMPLETION_ISSUES: [...new Set(issues)],
  };
}

function main() {
  const featureDir = process.argv[2];
  if (!featureDir) throw new Error("Usage: node scripts/derive-completion-state.mjs <feature-dir>");
  console.log(JSON.stringify(deriveCompletionState(featureDir), null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
