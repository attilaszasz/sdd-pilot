#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveFeatureDirectory } from "./lib/feature-directory.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readIfPresent = (filePath) => existsSync(filePath) ? readFileSync(filePath) : null;

function taskState(tasksBytes) {
  if (tasksBytes === null) return { complete: false, hasTasks: false, blocking: false };

  const lines = tasksBytes.toString("utf8").split(/\r?\n/);
  const taskLines = lines.filter((line) => /^- \[[ X]\] T\d{3}\b/.test(line));
  const unchecked = taskLines.filter((line) => /^- \[ \]/.test(line));
  const blocking = unchecked.some((line) => !/\[BUG:WARNING\].*\[DEFERRED\]/.test(line))
    || taskLines.some((line) => /\[BUG:(?:CRITICAL|ERROR)\].*\[DEFERRED\]/.test(line));

  return {
    complete: taskLines.length > 0 && !blocking,
    hasTasks: taskLines.length > 0,
    blocking,
  };
}

function reportState(reportBytes, repoRoot) {
  if (reportBytes === null) return { exists: false, verdict: "MISSING", validEvidence: false, issues: [] };

  const report = reportBytes.toString("utf8");
  const verdict = report.match(/^\*\*Overall Verdict\*\*:\s*(PASS|FAIL|BLOCKED)\s*$/m)?.[1] ?? "MALFORMED";
  const manifestStart = report.indexOf("## QC Evidence Manifest");
  const manifestEnd = manifestStart < 0 ? -1 : report.indexOf("\n## ", manifestStart + 1);
  const manifest = manifestStart < 0 ? "" : report.slice(manifestStart, manifestEnd < 0 ? report.length : manifestEnd);
  const rows = [...manifest.matchAll(/^\|\s*(.+?)\s*\|\s*([0-9a-f]{64})\s*\|(\r?\n|$)/gm)]
    .map((match) => ({ path: match[1], digest: match[2], persisted: match[0] }));
  const issues = [];
  const seen = new Set();

  if (verdict === "MALFORMED") issues.push("qc-report.md has no valid Overall Verdict");
  if (rows.length === 0) issues.push("qc-report.md has no QC evidence rows");
  if (verdict === "PASS" && /^.*Attestation:\s*(?:PENDING|FAILED)\s*$/mi.test(report)) {
    issues.push("qc-report.md is PASS with incomplete manual attestation");
  }

  for (const row of rows) {
    const evidencePath = path.resolve(repoRoot, row.path);
    if (seen.has(row.path)) issues.push(`duplicate QC evidence path: ${row.path}`);
    seen.add(row.path);
    if (evidencePath === repoRoot || !evidencePath.startsWith(`${repoRoot}${path.sep}`)) {
      issues.push(`QC evidence path escapes repository: ${row.path}`);
      continue;
    }
    const bytes = readIfPresent(evidencePath);
    if (bytes === null) issues.push(`QC evidence file missing: ${row.path}`);
    else if (sha256(bytes) !== row.digest) issues.push(`QC evidence digest mismatch: ${row.path}`);
  }

  return {
    exists: true,
    verdict,
    validEvidence: issues.length === 0,
    evidenceDigest: sha256(rows.map((row) => row.persisted).join("")),
    issues,
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
  const report = reportState(reportBytes, resolvedRoot);
  const issues = [...report.issues];

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
