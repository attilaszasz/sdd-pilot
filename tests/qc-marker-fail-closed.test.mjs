import { test } from 'node:test';
import { match, ok } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const qc = read('../.github/sddp/workflows/quality-control/WORKFLOW.md');
const loop = read('../.github/sddp/workflows/implement-qc-loop/WORKFLOW.md');
const implement = read('../.github/sddp/workflows/implement-tasks/WORKFLOW.md');
const autopilot = read('../.github/sddp/workflows/autopilot-pipeline/WORKFLOW.md');
const conventions = read('../.github/skills/artifact-conventions/SKILL.md');
const template = read('../.github/sddp/workflows/quality-control/assets/qc-report-template.md');

test('QMF-001: prior PASS marker is invalidated before failed or blocked QC gates', () => {
  const invalidate = qc.indexOf('### Invalidate prior QC evidence');
  const completedGate = qc.indexOf('### Gate: `.completed` marker');
  ok(invalidate > 0 && invalidate < completedGate, 'stale marker invalidation must precede QC gates');
  match(qc, /Every FAIL or BLOCKED exit must leave it absent/);
  match(qc, /Delete `FEATURE_DIR\/.completed` and `FEATURE_DIR\/\.qc-passed`/);
});

test('QMF-002: manual verification remains BLOCKED until complete human attestation', () => {
  match(qc, /Manual verification is a \*\*BLOCKED\*\* QC state/);
  match(qc, /`Status: ATTESTED`[\s\S]*every required scenario records `PASS`/);
  match(qc, /Preserve an existing attestation block/);
  match(qc, /Autopilot must never create or infer this attestation/);
  match(template, /\*\*Overall Verdict\*\*: PASS \| FAIL \| BLOCKED/);
  match(loop, /without complete human attestation OR report verdict=BLOCKED/);
});

test('QMF-003: deferred CRITICAL and ERROR bugs block both completion markers', () => {
  match(implement, /no `\[BUG:CRITICAL\]` or `\[BUG:ERROR\]` task is unchecked or `\[DEFERRED\]`/);
  match(loop, /CRITICAL\/ERROR bugs are never deferred or waived unattended/);
  match(qc, /Any unchecked or deferred `\[BUG:CRITICAL\]` or `\[BUG:ERROR\]` is FAIL/);
  match(conventions, /deferred CRITICAL\/ERROR bugs block it/);
});

test('QMF-004: PASS marker is atomic and bound to current report and evidence', () => {
  match(qc, /QC Evidence Manifest/);
  match(qc, /write and flush `\.qc-passed\.tmp`/);
  match(qc, /rename it to `\.qc-passed`/);
  match(qc, /QC Report SHA-256: <REPORT_SHA256>/);
  match(qc, /QC Evidence SHA-256: <EVIDENCE_SHA256>/);
  match(template, /## QC Evidence Manifest/);
});

test('QMF-005: stale or inconsistent evidence halts autopilot and epic completion', () => {
  match(autopilot, /marker existence alone never proves completion/);
  match(autopilot, /Re-run the Phase 7 current-evidence verification immediately before editing `specs\/project-plan\.md`/);
  match(autopilot, /no pending manual attestation or unchecked\/deferred CRITICAL\/ERROR bug exists/);
  match(loop, /report\/evidence SHA-256 digests validate/);
});
