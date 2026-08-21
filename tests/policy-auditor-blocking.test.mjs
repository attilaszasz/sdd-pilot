import { test } from 'node:test';
import { match, ok } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const auditor = read('../.github/agents/_policy-auditor.md');
const specify = read('../.github/sddp/workflows/specify-feature/WORKFLOW.md');
const plan = read('../.github/sddp/workflows/plan-feature/WORKFLOW.md');
const analyze = read('../.github/sddp/workflows/analyze-compliance/WORKFLOW.md');
const implementGates = read('../.github/sddp/workflows/implement-tasks/references/gates.md');
const qc = read('../.github/sddp/workflows/quality-control/WORKFLOW.md');
const autopilot = read('../.github/sddp/workflows/autopilot-pipeline/WORKFLOW.md');

const assertInteractiveContract = (text, phase) => {
  match(text, /explicit, non-empty justification/, `${phase} must require an explicit non-empty justification`);
  match(text, /conversation only, never in a marker or artifact/, `${phase} must keep overrides out of artifacts`);
};

test('PA-001: Policy Auditor FAIL is blocking and unattended bypass is forbidden', () => {
  match(auditor, /`FAIL` is blocking/, 'FAIL must be blocking');
  match(auditor, /`AUTOPILOT = true` MUST halt on `FAIL`/, 'autopilot must halt');
  match(auditor, /may not invent, infer, reuse, or auto-select a justification/, 'unattended justification must be forbidden');
  match(auditor, /Missing, empty, or ambiguous justification.*MUST halt/, 'invalid justification must halt');
});

test('PA-002: Specify blocks Policy FAIL except for an explicit interactive justification', () => {
  match(specify, /`FAIL` → apply the Policy Auditor blocking contract/, 'Specify must apply the blocking contract');
  assertInteractiveContract(specify, 'Specify');
});

test('PA-003: Plan blocks Policy FAIL except for an explicit interactive justification', () => {
  match(plan, /`FAIL` → apply the Policy Auditor blocking contract/, 'Plan must apply the blocking contract');
  assertInteractiveContract(plan, 'Plan');
});

test('PA-004: Analyze blocks before remediation on Policy FAIL', () => {
  match(analyze, /Independently audit each current artifact: `FEATURE_DIR\/spec\.md`, `FEATURE_DIR\/plan\.md`, and `FEATURE_DIR\/tasks\.md`/, 'Analyze must independently audit every phase artifact');
  match(analyze, /Any `FAIL` is \*\*CRITICAL\*\* and blocking/, 'any audited artifact violation must be critical and blocking');
  match(analyze, /every failing artifact and violation/, 'Analyze must report all failing artifacts');
  match(analyze, /blocking contract before any remediation or downstream phase/, 'Analyze must block before remediation');
  match(analyze, /never remediates or bypasses a Policy Auditor `FAIL`/, 'Analyze autopilot remediation must not bypass FAIL');
  assertInteractiveContract(analyze, 'Analyze');
});

test('PA-005: Implement audits every phase artifact before task execution', () => {
  match(implementGates, /## Project Instructions Gate/, 'Implement must define a policy gate');
  match(implementGates, /`FEATURE_DIR\/spec\.md`.*`FEATURE_DIR\/plan\.md`.*`FEATURE_DIR\/tasks\.md`/, 'Implement must audit all phase artifacts');
  match(implementGates, /before project setup or task execution/, 'Implement must block before side effects');
  assertInteractiveContract(implementGates, 'Implement');
});

test('PA-006: QC blocks Policy FAIL before QC delegates and invalidates pass evidence', () => {
  match(qc, /### Policy Auditor gate/, 'QC must define a policy gate');
  match(qc, /Every halt leaves `\.qc-passed` absent/, 'QC FAIL must leave pass evidence absent');
  match(qc, /before QC Auditor or Story Verifier delegation/, 'QC must block before downstream delegates');
  assertInteractiveContract(qc, 'QC');
});

test('PA-007: Autopilot explicitly halts Policy FAIL in every calling phase', () => {
  match(autopilot, /Specify[\s\S]*Policy Auditor `FAIL` halts here/, 'Specify FAIL must halt autopilot');
  match(autopilot, /Plan[\s\S]*Policy Auditor `FAIL` also halts here/, 'Plan FAIL must halt autopilot');
  match(autopilot, /Analyze[\s\S]*Policy Auditor `FAIL` halts without remediation or justification/, 'Analyze FAIL must halt autopilot');
  match(autopilot, /Implement and QC Policy Auditor gates halt on `FAIL` without justification/, 'Implement and QC FAIL must halt autopilot');
});

test('PA-008: PI-mandated skipped QC checks require a fresh explicit override', () => {
  const skippedEscalation = qc.slice(qc.indexOf('## 3.5. SKIPPED Check Escalation'), qc.indexOf('## 4. Requirements & Project Instructions Verification'));
  match(skippedEscalation, /apply the Policy Auditor blocking contract/, 'PI-mandated skips must use the shared contract');
  match(skippedEscalation, /A choice alone is not an override/, 'choice-only responses must fail closed');
  match(skippedEscalation, /Missing, silent, empty, stale, recommended, inferred, or ambiguous justification → \*\*BLOCKED\*\*/, 'invalid or reused responses must fail closed');
  match(skippedEscalation, /Only a valid current-invocation justification → \*\*WARNING/, 'only a fresh explicit justification may continue');
  match(skippedEscalation, /`AUTOPILOT = true` → default to \*\*Fail QC \(BUG task\)\*\*/, 'autopilot must fail rather than waive a PI mandate');
  match(skippedEscalation, /conversation only/, 'the override must not persist');
});

test('PA-009: skipped PI mandates cannot receive a PASS-warning without a valid override', () => {
  const verdictLogic = qc.slice(qc.indexOf('### Verdict logic for SKIPPED escalations'), qc.indexOf('### If ANY failures:'));
  match(verdictLogic, /only after a valid current-invocation Policy Auditor override/, 'PI-mandated warnings must be conditioned on a valid override');
  ok(!/user-acknowledged or non-mandated\): Does NOT block PASS/.test(verdictLogic), 'the former unconditional warning bypass must be absent');
});
