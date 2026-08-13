import { createHash } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const coreFiles = ["spec.md", "plan.md", "tasks.md", "project-instructions.md"];

function evidenceFiles(directory, prefix = "") {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.posix.join(prefix, entry.name);
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) return evidenceFiles(candidate, relative);
    return entry.isFile() && entry.name.endsWith(".md") ? [relative] : [];
  });
}

function safeEvidencePath(repoRoot, evidencePath) {
  if (!/^[^\\/]+(?:\/[^\\/]+)*$/.test(evidencePath) || evidencePath.split("/").some((part) => part === "." || part === "..")) return { issue: `QC evidence path is not normalized repository-relative: ${evidencePath}` };
  const candidate = path.resolve(repoRoot, ...evidencePath.split("/"));
  if (!candidate.startsWith(`${repoRoot}${path.sep}`)) return { issue: `QC evidence path escapes repository: ${evidencePath}` };
  let current = repoRoot;
  for (const part of evidencePath.split("/")) {
    current = path.join(current, part);
    if (!existsSync(current)) return { path: candidate };
    if (lstatSync(current).isSymbolicLink()) return { issue: `QC evidence path contains symlink: ${evidencePath}` };
  }
  try {
    if (!realpathSync(candidate).startsWith(`${repoRoot}${path.sep}`)) return { issue: `QC evidence canonical path escapes repository: ${evidencePath}` };
  } catch { /* Missing files are reported by the caller. */ }
  return { path: candidate };
}

function manualAttestation(filePath) {
  if (!existsSync(filePath)) return ["manual-test.md is missing"];
  const source = readFileSync(filePath, "utf8");
  const issues = [];
  if (!/^\s*- Status:\s*ATTESTED\s*$/m.test(source)) issues.push("manual-test.md requires Status: ATTESTED");
  if (!/^\s*- Verifier:\s*\S.+$/m.test(source)) issues.push("manual-test.md requires verifier identity");
  const timestamp = source.match(/^\s*- Verified At \(UTC\):\s*(.+?)\s*$/m)?.[1];
  if (!timestamp || Number.isNaN(Date.parse(timestamp)) || !/(?:Z|[+-]00:00)$/.test(timestamp)) issues.push("manual-test.md requires UTC timestamp");
  if (!/^\s*- Evidence:\s*\S.+$/m.test(source)) issues.push("manual-test.md requires evidence references");
  const scenarioStart = source.indexOf("## Scenario Results");
  const scenarioSection = scenarioStart < 0 ? "" : source.slice(scenarioStart, source.indexOf("\n## ", scenarioStart + 1) < 0 ? undefined : source.indexOf("\n## ", scenarioStart + 1));
  const rows = scenarioSection.split(/\r?\n/).filter((line) => /^\|[^|]+\|[^|]+\|\s*$/.test(line))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter(([scenario]) => scenario !== "Scenario" && !/^-+$/.test(scenario));
  if (rows.length === 0 || rows.some(([, result]) => result !== "PASS")) issues.push("manual-test.md requires every scenario result to be PASS");
  return issues;
}

export function parseQcEvidence(reportBytes, featureDir, repoRoot) {
  if (reportBytes === null) return { exists: false, verdict: "MISSING", validEvidence: false, issues: [] };
  const report = reportBytes.toString("utf8");
  const issues = [];
  const verdict = report.match(/^\*\*Overall Verdict\*\*:\s*(PASS|FAIL|BLOCKED)\s*$/m)?.[1] ?? "MALFORMED";
  const manifestStart = report.indexOf("## QC Evidence Manifest");
  const manifest = manifestStart < 0 ? undefined : report.slice(manifestStart + "## QC Evidence Manifest".length, report.indexOf("\n## ", manifestStart + 1) < 0 ? undefined : report.indexOf("\n## ", manifestStart + 1)).replace(/^\r?\n/, "");
  const rows = [];
  if (verdict === "MALFORMED") issues.push("qc-report.md has no valid Overall Verdict");
  if (manifest === undefined) issues.push("qc-report.md has no QC Evidence Manifest");
  else {
    const lines = manifest.split(/\r?\n/).filter(Boolean);
    if (lines.length < 3 || lines[0] !== "| Path | SHA-256 |" || !/^\|[- ]+\|[- ]+\|$/.test(lines[1])) issues.push("qc-report.md has malformed QC evidence header");
    for (const line of lines.slice(2)) {
      const match = line.match(/^\|\s*([^|\s][^|]*?)\s*\|\s*([0-9a-f]{64})\s*\|$/);
      if (!match) issues.push(`qc-report.md has malformed QC evidence row: ${line}`);
      else rows.push({ path: match[1], digest: match[2], persisted: `${line}\n` });
    }
    if (rows.length === 0) issues.push("qc-report.md has no QC evidence rows");
  }
  const featureRelative = path.relative(repoRoot, featureDir).split(path.sep).join("/");
  const expected = new Set(coreFiles.map((name) => name === "project-instructions.md" ? name : `${featureRelative}/${name}`));
  for (const checklist of evidenceFiles(path.join(featureDir, "checklists"), "checklists")) expected.add(`${featureRelative}/${checklist}`);
  const manualRequired = /^## Manual Testing(?:\s*[—-]\s*Required)?\s*$/m.test(report) || existsSync(path.join(featureDir, "manual-test.md"));
  if (manualRequired) {
    expected.add(`${featureRelative}/manual-test.md`);
    issues.push(...manualAttestation(path.join(featureDir, "manual-test.md")));
  }
  const seen = new Set();
  let previous = "";
  for (const row of rows) {
    if (seen.has(row.path)) issues.push(`duplicate QC evidence path: ${row.path}`);
    if (previous && row.path <= previous) issues.push(`QC evidence paths are not sorted: ${row.path}`);
    seen.add(row.path);
    previous = row.path;
    const safe = safeEvidencePath(repoRoot, row.path);
    if (safe.issue) { issues.push(safe.issue); continue; }
    if (!existsSync(safe.path)) issues.push(`QC evidence file missing: ${row.path}`);
    else if (sha256(readFileSync(safe.path)) !== row.digest) issues.push(`QC evidence digest mismatch: ${row.path}`);
  }
  for (const required of expected) if (!seen.has(required)) issues.push(`QC evidence manifest missing required path: ${required}`);
  return { exists: true, verdict, validEvidence: issues.length === 0, evidenceDigest: sha256(rows.map((row) => row.persisted).join("")), issues };
}
