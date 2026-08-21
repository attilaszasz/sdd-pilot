import { test } from 'node:test';
import { match, ok, strictEqual } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const implement = read('../.github/sddp/workflows/implement-tasks/WORKFLOW.md');
const gates = read('../.github/sddp/workflows/implement-tasks/references/gates.md');
const analyze = read('../.github/sddp/workflows/analyze-compliance/WORKFLOW.md');
const evaluator = read('../.github/agents/_test-evaluator.md');
const selfHealing = read('../.github/sddp/workflows/implement-tasks/references/self-healing-amendments.md');

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
  for (const [surface, text] of [['Implement', implement], ['gates', gates], ['Analyze', analyze], ['Test Evaluator', evaluator], ['self-healing', selfHealing]]) {
    ok(!/\.gate-(?:passed|cache)|gate-cache\.json/i.test(text), `${surface} must not introduce a mutable gate cache`);
  }
  match(gates, /Checkbox state, `\.implement-state`, and prior verdicts never substitute for validation/);
  match(evaluator, /Never use checked tasks, checked checklist items, or a prior verdict as proof of validation/);
});

test('GR-006: self-healing tracks every divergence mutation and validates exact current bytes', () => {
  match(selfHealing, /AMENDED_ARTIFACTS.*before\/after byte snapshots/s);
  for (const artifact of ['`plan.md`', '`data-model.md`', '`contracts/` files', 'feature-local architecture', '`specs\/sad.md`', 'created ADR files', '`divergence-log.md`', '`autopilot-log.md`']) {
    match(selfHealing, new RegExp(artifact.replaceAll('/', '\\/')), `self-healing must track ${artifact}`);
  }
  match(selfHealing, /Plan Validator[\s\S]*Tasks Validator[\s\S]*Run in that order/);
  match(selfHealing, /PASS verdicts cover the exact bytes that the next task will consume/);
  ok(!selfHealing.includes('Never halt on a divergence'));
});

test('GR-007: self-healing fails closed for every divergence category and amendment failure', () => {
  for (const category of ['file-path', 'symbol', 'api-shape', 'architecture']) {
    match(selfHealing, new RegExp(`\`${category}\``), `self-healing must retain ${category} handling`);
  }
  for (const failure of ['missing artifact', 'partial write', 'validator failure', 'malformed validator verdict', 'changes again during its revalidation']) {
    match(selfHealing, new RegExp(failure), `self-healing must block ${failure}`);
  }
  match(selfHealing, /Keep the current task `\[ \]`/);
  match(selfHealing, /do not start another task or Phase Review, and do not create `\.completed`/);
  match(selfHealing, /`AUTOPILOT = true` must halt/);
  match(implement, /post-amendment gate failure overrides this SUCCESS/);
});
