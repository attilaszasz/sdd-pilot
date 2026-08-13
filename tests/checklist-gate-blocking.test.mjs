import { test } from 'node:test';
import { match, ok } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const gates = read('../.github/skills/implement-tasks/references/gates.md');
const evaluator = read('../.github/agents/_test-evaluator.md');

test('CGB-001: objective PASS and auto-resolved PASS continue through fresh validation', () => {
  match(gates, /If `overallStatus` is now `"PASS"`: Continue/);
  match(gates, /inspect its `amendedFiles`[\s\S]*`spec\.md` amendment → Spec, Plan, Tasks; `plan\.md` amendment → Plan, Tasks; `tasks\.md` amendment → Tasks/);
  match(evaluator, /Only for amendments filling gaps in existing scope/);
  match(evaluator, /Before returning success, route amended phase artifacts through the owning and every downstream structural validator/);
});

test('CGB-002: unattended unresolved checklist failure halts implementation', () => {
  match(gates, /If `AUTOPILOT = true`, \*\*HALT\*\*/);
  match(gates, /Event=`halt`[\s\S]*Outcome="Halt implementation"/);
  match(gates, /Do not execute tasks and do not infer a bypass from defaults, recommendations, prior choices, or unattended mode/);
  ok(!gates.includes('default to **"Proceed anyway"**'));
});

test('CGB-003: interactive bypass requires an explicit current choice', () => {
  match(gates, /Continue only when the user explicitly selects Proceed anyway in the current conversation/);
  match(gates, /silence, an empty response, or any other response halts/);
  ok(!gates.includes('"**Proceed anyway** (recommended)'));
});

test('CGB-004: ambiguous product decisions block unattended evaluation', () => {
  match(evaluator, /If `autopilot = true` → leave the item unchecked and return `status: "blocked"`, `checklistStatus: "FAIL"`/);
  match(evaluator, /Do not select a recommended, first, or default option/);
  match(evaluator, /product and design decisions require explicit user input in an interactive run/);
  ok(!evaluator.includes('auto-select `recommended` option'));
  ok(!evaluator.includes('Resolved via autopilot'));
});
