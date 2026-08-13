import { test } from 'node:test';
import { deepEqual, equal, match, ok } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const loop = readFileSync(
  fileURLToPath(new URL('../.github/skills/implement-qc-loop/SKILL.md', import.meta.url)),
  'utf8',
);

const section = (start, end) => loop.slice(loop.indexOf(start), loop.indexOf(end));

function runLoop(fixtures, maxIterations = 10) {
  const log = [];
  let zeroProgress = 0;
  let endReason = '';
  let finalStatus = 'NOT_RUN';

  for (let index = 0; index < Math.min(maxIterations, 10); index += 1) {
    const fixture = fixtures[index] ?? { entering: [], remaining: [], qc: 'FAIL' };
    const attempts = Object.fromEntries(fixture.entering.map((id) => [
      id,
      log.filter((iteration) => iteration.bugsAttempted.includes(id)).length + 1,
    ]));
    const exhausted = fixture.entering.find((id) => attempts[id] >= 4 && fixture.severity?.[id] !== 'WARNING');
    const deferred = fixture.entering.filter((id) => attempts[id] >= 4 && fixture.severity?.[id] === 'WARNING');
    const implementRan = !exhausted && !fixture.skipImplement;
    const bugsAttempted = implementRan ? fixture.entering.filter((id) => !deferred.includes(id)) : [];
    const escalated = fixture.entering.filter((id) => attempts[id] === 3);
    const resolved = fixture.entering.filter((id) => !fixture.remaining.includes(id));
    finalStatus = exhausted ? 'NOT_RUN' : fixture.qc;
    const ordinaryFailure = finalStatus === 'FAIL' && !fixture.pendingEndReason && !exhausted;
    const progress = resolved.length || fixture.regressionsFixed || escalated.length || deferred.length;
    zeroProgress = ordinaryFailure && bugsAttempted.length && !progress ? zeroProgress + 1 : 0;
    log.push({ attempts, bugsAttempted, resolved, remaining: fixture.remaining, finalStatus, zeroProgress });

    endReason = fixture.pendingEndReason || (exhausted ? 'retry policy exhausted' : '') ||
      (zeroProgress >= 2 ? 'zero progress' : '') ||
      (finalStatus === 'PASS' ? 'qc passed' : '') ||
      (index + 1 >= Math.min(maxIterations, 10) ? 'safety limit' : '');
    if (endReason) break;
  }

  return { endReason, finalStatus, log, zeroProgress };
}

test('IQL-001: discovery-only QC gives a new bug its first actual Implement attempt', () => {
  const result = runLoop([
    { entering: [], remaining: ['T010'], qc: 'FAIL' },
    { entering: ['T010'], remaining: ['T010'], qc: 'FAIL' },
  ]);

  equal(result.log[0].bugsAttempted.length, 0);
  equal(result.log[1].attempts.T010, 1);
  equal(result.log[0].zeroProgress, 0);
  equal(result.log[1].zeroProgress, 1);
});

test('IQL-002: escalation and WARNING deferral follow completed fix attempts', () => {
  const result = runLoop([
    { entering: ['T010'], remaining: ['T010'], qc: 'FAIL', severity: { T010: 'WARNING' }, regressionsFixed: true },
    { entering: ['T010'], remaining: ['T010'], qc: 'FAIL', severity: { T010: 'WARNING' }, regressionsFixed: true },
    { entering: ['T010'], remaining: ['T010'], qc: 'FAIL', severity: { T010: 'WARNING' } },
    { entering: ['T010'], remaining: [], qc: 'PASS', severity: { T010: 'WARNING' }, regressionsFixed: true },
  ]);

  equal(result.log[2].attempts.T010, 3);
  equal(result.log[3].attempts.T010, 4);
  deepEqual(result.log[3].bugsAttempted, []);
  equal(result.endReason, 'qc passed');
});

test('IQL-003: CRITICAL and ERROR retry exhaustion fails closed without another Implement attempt', () => {
  for (const severity of ['CRITICAL', 'ERROR']) {
    const result = runLoop(Array.from({ length: 4 }, () => ({
      entering: ['T010'], remaining: ['T010'], qc: 'FAIL', severity: { T010: severity }, regressionsFixed: true,
    })));
    equal(result.log[3].attempts.T010, 4);
    deepEqual(result.log[3].bugsAttempted, []);
    equal(result.endReason, 'retry policy exhausted');
    equal(result.finalStatus, 'NOT_RUN');
  }
});

test('IQL-004: zero progress ignores discovery-only QC but stops after two failed fix attempts', () => {
  const result = runLoop([
    { entering: [], remaining: ['T010'], qc: 'FAIL' },
    { entering: ['T010'], remaining: ['T010'], qc: 'FAIL' },
    { entering: ['T010'], remaining: ['T010'], qc: 'FAIL' },
  ]);

  equal(result.log.length, 3);
  equal(result.endReason, 'zero progress');
});

test('IQL-005: bookkeeping records every entered iteration and manual BLOCKED is final', () => {
  const result = runLoop([
    { entering: ['T010'], remaining: ['T010'], qc: 'BLOCKED', pendingEndReason: 'manual test needed' },
  ]);

  equal(result.log.length, 1);
  equal(result.log[0].finalStatus, 'BLOCKED');
  equal(result.endReason, 'manual test needed');
});

test('IQL-006: the hard safety limit remains ten and final status follows current QC', () => {
  const result = runLoop(Array.from({ length: 11 }, (_, index) => ({
    entering: [], remaining: [`T${String(index + 10).padStart(3, '0')}`], qc: 'FAIL',
  })), 99);

  equal(result.log.length, 10);
  equal(result.endReason, 'safety limit');
  equal(result.finalStatus, 'FAIL');
});

test('IQL-007: workflow text retains the executable state-machine contract', () => {
  const execution = section('WHILE ITERATION < MAX_ITERATIONS:', 'END WHILE');
  ok(execution.indexOf('── 2c. Iteration Bookkeeping') < execution.indexOf('── 2d. Decision'));
  match(loop, /count prior iterations in `bugs_attempted`/);
  match(loop, /Discovery-only QC failures do not increment the count/);
  match(loop, /CRITICAL\/ERROR bugs are never deferred or waived unattended/);
  match(loop, /MAX_ITERATIONS = MIN\(N, 10\)/);
});
