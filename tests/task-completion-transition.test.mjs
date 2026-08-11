import { test } from 'node:test';
import { match, ok } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const implement = read('../.github/skills/implement-tasks/SKILL.md');
const microQc = read('../.github/skills/implement-tasks/references/micro-qc.md');
const parallel = read('../.github/skills/implement-tasks/references/parallel-batches.md');

test('TC-001: successful tasks transition once only after every required check', () => {
  match(implement, /Keep successful tasks unchecked in the in-memory `IN_REVIEW_TASKS`/);
  match(implement, /"inReview": \[\]/);
  match(implement, /"reviewResults":/);
  match(implement, /Commit completion state.*only after every required check passes.*change each passing task exactly once from `- \[ \]` to `- \[X\]`/s);
  match(implement, /Developer, confidence, VERIFY, export, Phase Review, or Micro-QC failure/);
});

test('TC-002: TENTATIVE pass and failure never require checkbox rollback', () => {
  match(implement, /TENTATIVE.*keep `\[ \]`.*extra verification/s);
  match(implement, /extra verification fails.*still unchecked/s);
  ok(!/remove the `\[X\]`|`- \[X\]`.*`- \[ \]`/i.test(implement));
});

test('TC-003: UNCERTAIN and failed review paths remain unchecked and block completion', () => {
  match(implement, /UNCERTAIN.*keep `\[ \]`/);
  match(implement, /unrecovered failure moves the task from `IN_REVIEW_TASKS` to `BLOCKED_TASKS`/);
  match(microQc, /unrecovered failure moves the task from `IN_REVIEW_TASKS` to `BLOCKED_TASKS`/i);
  match(implement, /0 blocked, every current-run Phase Review passed, every required current-run Micro-QC passed or was legitimately skipped/);
});

test('TC-004: parallel and sequential paths share the delayed-commit invariant', () => {
  match(parallel, /Add passing tasks to `IN_REVIEW_TASKS` without mutating their checkboxes/);
  match(parallel, /same completion invariant as sequential tasks/);
  match(parallel, /only the phase-level commit step changes `\[ \]` to `\[X\]`/);
});

test('TC-005: setup phases accept legitimate Micro-QC skip but missing review results fail closed', () => {
  match(implement, /Setup, Foundational, or Polish.*skip Micro-QC/);
  match(implement, /review result is missing, failed, or unrecovered.*`BLOCKED_TASKS`/);
});
