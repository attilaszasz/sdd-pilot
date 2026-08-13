import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { deepStrictEqual, match, ok, strictEqual } from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { deriveCompletionState } from "../scripts/derive-completion-state.mjs";

const roots = [];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture({ tasksComplete = true, completed = true, manual = null } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "sddp-completion-"));
  roots.push(root);
  const feature = "specs/00001-test";
  const directory = path.join(root, feature);
  mkdirSync(path.join(directory, "checklists"), { recursive: true });
  writeFileSync(path.join(root, "project-instructions.md"), "Instructions\n");
  writeFileSync(path.join(directory, "spec.md"), "Spec\n");
  writeFileSync(path.join(directory, "plan.md"), "Plan\n");
  writeFileSync(path.join(directory, "tasks.md"), tasksComplete ? "- [X] T001 [P1] Complete work\n" : "- [ ] T001 [P1] Complete work\n");
  writeFileSync(path.join(directory, "checklists/requirements.md"), "- [X] CHK001 Complete\n");
  if (manual !== null) writeFileSync(path.join(directory, "manual-test.md"), manual);
  if (completed) writeFileSync(path.join(directory, ".completed"), "Implementation complete\n");
  return { root, feature, directory };
}

function writeQcPass(fixture, paths = null, extra = "") {
  const defaultPaths = ["project-instructions.md", `${fixture.feature}/checklists/requirements.md`, `${fixture.feature}/plan.md`, `${fixture.feature}/spec.md`, `${fixture.feature}/tasks.md`];
  if (existsSync(path.join(fixture.directory, "manual-test.md"))) defaultPaths.splice(2, 0, `${fixture.feature}/manual-test.md`);
  const rows = (paths ?? defaultPaths).map((relative) => {
    const candidate = path.join(fixture.root, relative);
    return `| ${relative} | ${sha256(existsSync(candidate) ? readFileSync(candidate) : "forged")} |\n`;
  }).join("");
  const report = `# QC Report\n\n**Overall Verdict**: PASS\n${extra}\n## QC Evidence Manifest\n| Path | SHA-256 |\n|------|---------|\n${rows}`;
  writeFileSync(path.join(fixture.directory, "qc-report.md"), report);
  writeFileSync(path.join(fixture.directory, ".qc-passed"), `QC Passed: 2026-08-11T00:00:00.000Z\nQC Report SHA-256: ${sha256(report)}\nQC Evidence SHA-256: ${sha256(rows)}\n`);
}

test("CST-001: canonical full evidence deterministically completes", () => {
  const value = fixture();
  writeQcPass(value);
  deepStrictEqual(deriveCompletionState(value.feature, value.root), { IMPLEMENTATION_COMPLETE: true, QC_COMPLETE: true, COMPLETION_STATE: "complete", COMPLETION_ISSUES: [] });
});

test("CST-002: missing each core evidence path fails closed even with recomputed marker digests", () => {
  const value = fixture();
  for (const missing of ["project-instructions.md", `${value.feature}/spec.md`, `${value.feature}/plan.md`, `${value.feature}/tasks.md`]) {
    writeQcPass(value, ["project-instructions.md", `${value.feature}/checklists/requirements.md`, `${value.feature}/plan.md`, `${value.feature}/spec.md`, `${value.feature}/tasks.md`].filter((entry) => entry !== missing));
    const state = deriveCompletionState(value.feature, value.root);
    strictEqual(state.QC_COMPLETE, false);
    match(state.COMPLETION_ISSUES.join("\n"), new RegExp(`missing required path: ${missing}`));
  }
});

test("CST-003: malformed, duplicate, unsorted, aliased, absolute, and symlinked rows fail closed", () => {
  const value = fixture();
  for (const pathValue of ["invalid", `${value.feature}/tasks.md`, `${value.feature}/a/../tasks.md`, "/etc/passwd"]) {
    writeQcPass(value, ["project-instructions.md", `${value.feature}/checklists/requirements.md`, `${value.feature}/plan.md`, `${value.feature}/spec.md`, `${value.feature}/tasks.md`, pathValue]);
    strictEqual(deriveCompletionState(value.feature, value.root).QC_COMPLETE, false, pathValue);
  }
  const outside = path.join(value.root, "outside.md");
  writeFileSync(outside, "outside\n");
  symlinkSync(outside, path.join(value.directory, "linked.md"));
  writeQcPass(value, ["project-instructions.md", `${value.feature}/checklists/requirements.md`, `${value.feature}/linked.md`, `${value.feature}/plan.md`, `${value.feature}/spec.md`, `${value.feature}/tasks.md`]);
  strictEqual(deriveCompletionState(value.feature, value.root).QC_COMPLETE, false);
});

test("CST-004: required evidence mutations invalidate the marker", () => {
  const value = fixture();
  writeQcPass(value);
  writeFileSync(path.join(value.directory, "spec.md"), "Changed\n");
  const state = deriveCompletionState(value.feature, value.root);
  strictEqual(state.QC_COMPLETE, false);
  match(state.COMPLETION_ISSUES.join("\n"), /evidence digest mismatch/);
});

test("CST-005: manual evidence requires canonical complete attestation", () => {
  const valid = `# Manual Test\n\n- Status: ATTESTED\n- Verifier: Test User\n- Verified At (UTC): 2026-08-11T00:00:00.000Z\n- Evidence: screenshot.png\n\n## Scenario Results\n| Scenario | Result |\n|---|---|\n| Sign in | PASS |\n`;
  for (const invalid of [valid.replace("ATTESTED", "PASSED"), valid.replace("- Verifier: Test User\n", ""), valid.replace("2026-08-11T00:00:00.000Z", "tomorrow"), valid.replace("- Evidence: screenshot.png\n", ""), valid.replace("| Sign in | PASS |", "| Sign in | FAILED |")] ) {
    const value = fixture({ manual: invalid });
    writeQcPass(value, null, "\n## Manual Testing - Required\n- Attestation: ATTESTED\n");
    strictEqual(deriveCompletionState(value.feature, value.root).QC_COMPLETE, false);
  }
  const value = fixture({ manual: valid });
  writeQcPass(value, null, "\n## Manual Testing - Required\n- Attestation: ATTESTED\n");
  const state = deriveCompletionState(value.feature, value.root);
  strictEqual(state.QC_COMPLETE, true, JSON.stringify(state));
});

test("CST-006: implementation-complete and QC-pending is a clean resume state", () => {
  const value = fixture();
  deepStrictEqual(deriveCompletionState(value.feature, value.root), { IMPLEMENTATION_COMPLETE: true, QC_COMPLETE: false, COMPLETION_STATE: "qc-pending", COMPLETION_ISSUES: [] });
});

test("CST-007: consumers use separate completion fields and QC-only resume", () => {
  const context = read("../.github/agents/_context-gatherer.md");
  const specify = read("../.github/skills/specify-feature/SKILL.md");
  const autopilot = read("../.github/skills/autopilot-pipeline/SKILL.md");
  const all = `${context}\n${specify}\n${autopilot}`;
  ok(!all.includes(`FEATURE_${"COMPLETE"}`));
  match(context, /IMPLEMENTATION_COMPLETE/);
  match(context, /QC_COMPLETE/);
  match(specify, /IMPLEMENTATION_COMPLETE = true/);
  match(autopilot, /RESUME_AT_QC = true/);
});
