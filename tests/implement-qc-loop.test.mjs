import { test } from 'node:test';
import { match, ok, equal } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const loop = readFileSync(
  fileURLToPath(new URL('../.github/skills/implement-qc-loop/SKILL.md', import.meta.url)),
  'utf8',
);

const section = (start, end) => loop.slice(loop.indexOf(start), loop.indexOf(end));

test('IQL-001: every entered iteration reaches bookkeeping before one decision', () => {
  const execution = section('WHILE ITERATION < MAX_ITERATIONS:', 'END WHILE');
  const bookkeeping = execution.indexOf('── 2c. Iteration Bookkeeping');
  const decision = execution.indexOf('── 2d. Decision');

  ok(bookkeeping > 0 && decision > bookkeeping);
  equal((execution.match(/── 2c\. Iteration Bookkeeping/g) ?? []).length, 1);
  equal((execution.slice(0, bookkeeping).match(/\b(?:BREAK|CONTINUE)\b/g) ?? []).length, 0);
  match(execution, /Run this block exactly once for every entered iteration, including PASS, FAIL, BLOCKED, skipped-QC, and artifact-inconsistency paths/);
});

test('IQL-002: repeated failures persist attempts, errors, escalation, and deferral', () => {
  match(loop, /count prior iterations in `bugs_remaining` and include its persisted prior errors/);
  match(loop, /`ATTEMPT = PRIOR_BUG_ATTEMPTS \+ 1`/);
  match(loop, /Attempt 3: Append `\[ESCALATED\]` tag/);
  match(loop, /Attempt 4\+ for `\[BUG:WARNING\]`/);
  match(loop, /Attempt 4\+ for CRITICAL\/ERROR:[\s\S]*PENDING_END_REASON="retry policy exhausted"/);
  match(loop, /errors_entering: \{ID: error\}, errors_resolved: \{ID: error\}, errors_remaining: \{ID: error\}/);
  match(loop, /never deferred or waived unattended/);
});

test('IQL-003: two ordinary zero-progress failures halt after bookkeeping', () => {
  const execution = section('── 2c. Iteration Bookkeeping', 'END WHILE');
  match(execution, /On an ordinary QC FAIL[\s\S]*`ZERO_PROGRESS_COUNT \+= 1`/);
  match(execution, /`ZERO_PROGRESS_COUNT >= 2` → `LOOP_END_REASON="zero progress"` → BREAK/);
});

test('IQL-004: manual blocks and PI violations have deterministic end reasons', () => {
  match(loop, /report verdict=BLOCKED[\s\S]*FINAL_QC_STATUS="BLOCKED"; PENDING_END_REASON="manual test needed"/);
  match(loop, /Only CRITICAL PI violations[\s\S]*FINAL_QC_STATUS="FAIL"; PENDING_END_REASON="PI violations"/);
  match(loop, /a concrete QC or artifact outcome wins over zero progress, and zero progress wins over the safety limit/);
});

test('IQL-005: configuration is clamped to the inclusive hard maximum of 10', () => {
  match(loop, /MAX_ITERATIONS = MIN\(N, 10\)/);
  match(loop, /missing, zero, negative, or non-integer → `10`/);
  match(loop, /`ITERATION >= MAX_ITERATIONS` → `LOOP_END_REASON="safety limit"`/);
});

test('IQL-006: PASS and non-PASS final statuses cannot diverge from QC', () => {
  match(loop, /FINAL_QC_STATUS="PASS"; PENDING_END_REASON="qc passed"/);
  match(loop, /use `NOT_RUN` when QC was skipped/);
  match(loop, /Never report loop success unless `FINAL_QC_STATUS="PASS"` and the current `\.qc-passed` evidence validates/);
  match(loop, /do not relabel the QC verdict/);
});
