import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';
import { deepStrictEqual, match, ok, strictEqual } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { deriveCompletionState } from '../scripts/derive-completion-state.mjs';

const roots = [];
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture({ tasksComplete, completed, verdict, marker }) {
  const root = mkdtempSync(path.join(tmpdir(), 'sddp-completion-'));
  roots.push(root);
  const feature = path.join(root, 'specs', '00001-test');
  mkdirSync(feature, { recursive: true });
  writeFileSync(path.join(feature, 'tasks.md'), tasksComplete
    ? '- [X] T001 [P1] Complete work\n'
    : '- [ ] T001 [P1] Complete work\n');
  if (completed) writeFileSync(path.join(feature, '.completed'), 'Implementation complete\n');

  if (verdict) {
    const tasks = readFileSync(path.join(feature, 'tasks.md'));
    const row = `| specs/00001-test/tasks.md | ${sha256(tasks)} |\n`;
    const report = `# QC Report\n\n**Overall Verdict**: ${verdict}\n\n## QC Evidence Manifest\n| Path | SHA-256 |\n|------|---------|\n${row}`;
    writeFileSync(path.join(feature, 'qc-report.md'), report);
    if (marker) {
      writeFileSync(path.join(feature, '.qc-passed'), `QC Passed: 2026-08-11T00:00:00.000Z\nQC Report SHA-256: ${sha256(report)}\nQC Evidence SHA-256: ${sha256(row)}\n`);
    }
  } else if (marker) {
    writeFileSync(path.join(feature, '.qc-passed'), 'malformed\n');
  }

  return { root, feature: 'specs/00001-test' };
}

test('CST-001: every tasks/implementation/report/marker combination fails closed', () => {
  for (const tasksComplete of [false, true]) {
    for (const completed of [false, true]) {
      for (const verdict of [null, 'FAIL', 'PASS']) {
        for (const marker of [false, true]) {
          const { root, feature } = fixture({ tasksComplete, completed, verdict, marker });
          const state = deriveCompletionState(feature, root);
          const expectedQc = tasksComplete && completed && verdict === 'PASS' && marker;
          strictEqual(state.QC_COMPLETE, expectedQc, JSON.stringify({ tasksComplete, completed, verdict, marker }));
          strictEqual(state.IMPLEMENTATION_COMPLETE, tasksComplete && completed);
          if (expectedQc) deepStrictEqual(state.COMPLETION_ISSUES, []);
        }
      }
    }
  }
});

test('CST-002: implementation-complete and QC-pending is a clean resume state', () => {
  const { root, feature } = fixture({ tasksComplete: true, completed: true, verdict: null, marker: false });
  deepStrictEqual(deriveCompletionState(feature, root), {
    IMPLEMENTATION_COMPLETE: true,
    QC_COMPLETE: false,
    COMPLETION_STATE: 'qc-pending',
    COMPLETION_ISSUES: [],
  });
});

test('CST-003: stale report and evidence digests are inconsistent', () => {
  const { root, feature } = fixture({ tasksComplete: true, completed: true, verdict: 'PASS', marker: true });
  writeFileSync(path.join(root, feature, 'tasks.md'), '- [X] T001 [P1] Changed after QC\n');
  const state = deriveCompletionState(feature, root);
  strictEqual(state.QC_COMPLETE, false);
  strictEqual(state.COMPLETION_STATE, 'inconsistent');
  ok(state.COMPLETION_ISSUES.some((issue) => issue.includes('evidence digest mismatch')));
});

test('CST-004: deferred warnings are allowed but deferred errors block implementation', () => {
  const warning = fixture({ tasksComplete: true, completed: true, verdict: null, marker: false });
  writeFileSync(path.join(warning.root, warning.feature, 'tasks.md'), '- [ ] T001 [BUG:WARNING] [DEFERRED] warning\n');
  strictEqual(deriveCompletionState(warning.feature, warning.root).IMPLEMENTATION_COMPLETE, true);

  const error = fixture({ tasksComplete: true, completed: true, verdict: null, marker: false });
  writeFileSync(path.join(error.root, error.feature, 'tasks.md'), '- [X] T001 [BUG:ERROR] [DEFERRED] error\n');
  const state = deriveCompletionState(error.feature, error.root);
  strictEqual(state.IMPLEMENTATION_COMPLETE, false);
  match(state.COMPLETION_ISSUES.join('\n'), /tasks are incomplete/);
});

test('CST-005: consumers use separate completion fields and QC-only resume', () => {
  const context = read('../.github/agents/_context-gatherer.md');
  const specify = read('../.github/skills/specify-feature/SKILL.md');
  const autopilot = read('../.github/skills/autopilot-pipeline/SKILL.md');
  const all = `${context}\n${specify}\n${autopilot}`;

  ok(!all.includes(`FEATURE_${'COMPLETE'}`));
  match(context, /IMPLEMENTATION_COMPLETE/);
  match(context, /QC_COMPLETE/);
  match(context, /COMPLETION_ISSUES/);
  match(specify, /IMPLEMENTATION_COMPLETE = true/);
  match(autopilot, /RESUME_AT_QC = true/);
  match(autopilot, /quality-control\/SKILL\.md.*passing `PIPELINE_CONTEXT` unchanged/);
});

test('CST-006: PASS cannot coexist with pending manual attestation', () => {
  const { root, feature } = fixture({ tasksComplete: true, completed: true, verdict: 'PASS', marker: true });
  const reportPath = path.join(root, feature, 'qc-report.md');
  const report = readFileSync(reportPath, 'utf8') + '\n## Manual Testing\n- Attestation: PENDING\n';
  writeFileSync(reportPath, report);
  const row = `| specs/00001-test/tasks.md | ${sha256(readFileSync(path.join(root, feature, 'tasks.md')))} |\n`;
  writeFileSync(path.join(root, feature, '.qc-passed'), `QC Passed: 2026-08-11T00:00:00.000Z\nQC Report SHA-256: ${sha256(report)}\nQC Evidence SHA-256: ${sha256(row)}\n`);

  const state = deriveCompletionState(feature, root);
  strictEqual(state.QC_COMPLETE, false);
  match(state.COMPLETION_ISSUES.join('\n'), /incomplete manual attestation/);
});
