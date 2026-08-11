import { test } from 'node:test';
import { match, ok, strictEqual } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const implement = read('../.github/skills/implement-tasks/SKILL.md');
const gates = read('../.github/skills/implement-tasks/references/gates.md');
const analyze = read('../.github/skills/analyze-compliance/SKILL.md');
const evaluator = read('../.github/agents/_test-evaluator.md');

const assertMutationRouting = (text, surface) => {
  match(text, /`spec\.md`[^\n]*Spec[^\n]*Plan[^\n]*Tasks/i, `${surface} must rerun every downstream gate after spec mutation`);
  match(text, /`plan\.md`[^\n]*Plan[^\n]*Tasks/i, `${surface} must rerun Plan and Tasks gates after plan mutation`);
  match(text, /`tasks\.md`[^\n]*Tasks/i, `${surface} must rerun Tasks validation after task mutation`);
};

test('GR-001: checked tasks never bypass current phase-gate inputs', () => {
  match(implement, /Execute `references\/gates\.md` on every invocation/);
  match(implement, /Checked tasks determine only which tasks Step 5 skips/);
  ok(!implement.includes('Resuming — skipping gate checks'));
  ok(!implement.includes('pass it to `references/gates.md` only on fresh runs'));
  match(gates, /including resumes and runs where every task is checked/);
  ok(!gates.includes('Resume runs skip this file'));
});

test('GR-002: every Implement invocation runs validators in lifecycle order', () => {
  const spec = gates.indexOf('## Spec → Plan Revalidation');
  const plan = gates.indexOf('## Plan → Tasks Revalidation');
  const tasks = gates.indexOf('## Tasks → Implement Gate');
  const checklist = gates.indexOf('## Checklist Gate');
  ok(spec > 0 && spec < plan && plan < tasks && tasks < checklist);
  strictEqual((gates.match(/No verdict is persisted or cached/g) ?? []).length, 1);
  match(gates, /changed `spec\.md` therefore reruns Spec, Plan, and Tasks validation/);
  match(gates, /changed `plan\.md` cannot retain an earlier Plan or Tasks verdict/);
});

test('GR-003: Analyze remediation routes each mutable artifact to owning and downstream gates', () => {
  assertMutationRouting(analyze, 'Analyze');
  match(analyze, /A FAIL blocks remediation completion and autopilot continuation/);
  match(analyze, /only `analysis-report\.md` or `autopilot-log\.md` changed, no phase artifact gate is required/);
});

test('GR-004: checklist evaluation cannot bless mutations without revalidation', () => {
  assertMutationRouting(evaluator, 'Test Evaluator');
  match(evaluator, /If any validator fails, return `status: "blocked"`/);
  match(evaluator, /Checklist-only changes require a fresh Checklist Reader result/);
  match(gates, /inspect its `amendedFiles`/);
  match(gates, /checklist-only checkbox amendment reruns Checklist Reader/);
});

test('GR-005: no mutable gate-pass marker or checkbox cache is introduced', () => {
  for (const [surface, text] of [['Implement', implement], ['gates', gates], ['Analyze', analyze], ['Test Evaluator', evaluator]]) {
    ok(!/\.gate-(?:passed|cache)|gate-cache\.json/i.test(text), `${surface} must not introduce a mutable gate cache`);
  }
  match(gates, /Checkbox state, `\.implement-state`, and prior verdicts never substitute for validation/);
  match(evaluator, /Never use checked tasks, checked checklist items, or a prior verdict as proof of validation/);
});
