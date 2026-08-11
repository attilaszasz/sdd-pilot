import { test } from 'node:test';
import { doesNotMatch, match, ok } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const qc = read('../.github/skills/quality-control/SKILL.md');
const auditor = read('../.github/agents/_qc-auditor.md');
const template = read('../.github/skills/quality-control/assets/qc-report-template.md');
const rerun = qc.slice(qc.indexOf('### Re-run Scoping'), qc.indexOf('## 2. Load QC Context'));

test('QRB-001: reruns use a report SHA and evidence snapshot, never a timestamp', () => {
  match(rerun, /exactly a 40-character Git SHA/);
  match(rerun, /QC Evidence Manifest/);
  match(template, /## QC Scope Baseline[\s\S]*Baseline Commit:[^\n]*40-character current HEAD SHA/);
  match(template, /Scope Safety:/);
  doesNotMatch(rerun, /\.completed` timestamp/);
});

test('QRB-002: missing, malformed, unreachable, shallow, and no-Git baselines fail closed', () => {
  match(rerun, /git cat-file -e BASELINE_COMMIT\^\{commit\}/);
  match(rerun, /git merge-base --is-ancestor BASELINE_COMMIT HEAD/);
  match(rerun, /A shallow clone may use the baseline only when both proofs succeed/);
  match(rerun, /Git or required history is unavailable/);
  match(rerun, /baseline is missing, malformed, unreachable, or inconsistent/);
});

test('QRB-003: governance and dependency boundaries force full QC', () => {
  match(rerun, /`spec\.md` or `plan\.md` changed/);
  match(rerun, /any change other than `- \[ \]` to `- \[X\]` for an existing `\[BUG\]` task/);
  match(rerun, /dependency manifest, lockfile, build configuration, test configuration, or test bootstrap changed/);
  match(rerun, /Treat uncertain file classification as a full-run reason/);
});

test('QRB-004: changed files include commits, worktree state, untracked files, and digest drift', () => {
  match(rerun, /git diff --name-only --diff-filter=ACDMRTUXB BASELINE_COMMIT\.\.\.HEAD/);
  match(rerun, /git diff --name-only HEAD/);
  match(rerun, /git ls-files --others --exclude-standard/);
  match(rerun, /current digest differs from the prior Evidence Manifest/);
});

test('QRB-005: test selection includes transitive dependents and prior failures', () => {
  match(rerun, /tests selected from `BASELINE_COMMIT`[\s\S]*transitive dependency graph/);
  match(auditor, /vitest --changed BASELINE_COMMIT/);
  match(auditor, /jest --changedSince=BASELINE_COMMIT/);
  match(auditor, /include `previouslyFailedTests`/);
  match(auditor, /Never use last-failure-only flags such as `pytest --lf`/);
  ok(!auditor.includes('Tests: `vitest --changed` | `jest --changedSince=HEAD~1` | `pytest --lf`'));
});
