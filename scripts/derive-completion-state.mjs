#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveFeatureDirectory } from "./lib/feature-directory.mjs";
import { parseQcEvidence } from "./lib/qc-evidence.mjs";
import { parseTasks } from "./parse-tasks.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readIfPresent = (filePath) => existsSync(filePath) ? readFileSync(filePath) : null;

function repositoryState(repoRoot, featureDir) {
  try {
    const baseline = execFileSync("git", ["-C", repoRoot, "rev-parse", "--verify", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (!/^[0-9a-f]{40}$/.test(baseline)) throw new Error("invalid HEAD");
    const ignored = new Set([".completed", ".qc-passed", "qc-report.md"].map((name) => path.relative(repoRoot, path.join(featureDir, name)).split(path.sep).join("/")));
    const status = execFileSync("git", ["-C", repoRoot, "status", "--porcelain=v1", "-z", "--untracked-files=all"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const relevantStatus = status.split("\0").filter((entry) => entry && !ignored.has(entry.slice(3))).join("\0");
    return { baseline, digest: sha256(relevantStatus) };
  } catch {
    return null;
  }
}

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
    const baselineCommit = marker.match(/^QC Baseline Commit:\s*([0-9a-f]{40})\s*$/m)?.[1];
    const repositoryStateDigest = marker.match(/^QC Repository State SHA-256:\s*([0-9a-f]{64})\s*$/m)?.[1];
    const currentRepositoryState = repositoryState(resolvedRoot, resolvedFeatureDir);
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
    if (!currentRepositoryState) issues.push(".qc-passed cannot verify Git repository state");
    else if (!baselineCommit || baselineCommit !== currentRepositoryState.baseline) {
      issues.push(".qc-passed baseline commit does not match current HEAD");
    } else if (!repositoryStateDigest || repositoryStateDigest !== currentRepositoryState.digest) {
      issues.push(".qc-passed repository state does not match current repository");
    }
    qcComplete = implementationComplete && report.verdict === "PASS" && report.validEvidence
      && reportDigest === sha256(reportBytes) && evidenceDigest === report.evidenceDigest
      && baselineCommit === currentRepositoryState?.baseline && repositoryStateDigest === currentRepositoryState?.digest;
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
