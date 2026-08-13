import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { deepStrictEqual, equal, match } from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { parseTasks } from '../scripts/parse-tasks.mjs';

const fixture = (name) => readFileSync(fileURLToPath(new URL(`fixtures/task-parser/${name}.md`, import.meta.url)));

test('TP-001: 40 tasks pass and 41 tasks fail at the boundary', () => {
  const forty = parseTasks(fixture('forty'));
  const fortyOne = parseTasks(fixture('forty-one'));
  equal(forty.valid, true);
  equal(forty.taskCount, 40);
  equal(fortyOne.valid, false);
  equal(fortyOne.taskCount, 41);
  deepStrictEqual(fortyOne.errors.map(({ line, code }) => [line, code]), [[43, 'task-limit']]);
});

test('TP-002: valid annotations retain stable structured task data', () => {
  const result = parseTasks(fixture('valid-annotations'));
  equal(result.valid, true);
  equal(result.taskCount, 3);
  deepStrictEqual(result.tasks[0].exports, ['Model(id,email,role)']);
  deepStrictEqual(result.tasks[1], {
    id: 'T002', status: 'pending', parallel: false, bugSeverity: null, bugCategory: null,
    modifiers: [], deferred: false, workItem: 'US1', story: 'US1', objective: null,
    filePath: 'src/service.mjs', requirements: ['FR-001', 'FR-002'], completesRequirement: 'FR-001',
    dependencies: ['T001'], imports: [{ sourceTask: 'T001', filePath: 'src/model.mjs', symbols: ['Model'] }],
    exports: ['Service.run()'], verify: ['node --test tests/service.test.mjs'],
    description: 'Implement service in src/service.mjs', phase: 'Phase 1: Delivery [US1]',
  });
  equal(result.tasks[2].bugSeverity, 'ERROR');
  deepStrictEqual(result.tasks[2].modifiers, ['RECURRING', 'DEFERRED']);
});

test('TP-003: malformed checkbox, ID, and annotations return actionable line errors', () => {
  const result = parseTasks(fixture('malformed'));
  equal(result.valid, false);
  deepStrictEqual(result.errors.map(({ line, code }) => [line, code]), [
    [3, 'invalid-checkbox'],
    [4, 'invalid-task-id'],
    [5, 'invalid-requirements'],
    [6, 'invalid-dependency'],
    [7, 'invalid-import'],
    [8, 'invalid-export'],
    [9, 'invalid-verify'],
    [10, 'invalid-annotation'],
  ]);
  for (const item of result.errors) {
    match(item.message, /invalid|malformed|non-empty/);
    match(item.source, /^- /);
  }
});

test('TP-004: prose, headings, and non-task checklists remain safely ignorable', () => {
  const result = parseTasks(fixture('non-task-content'));
  equal(result.valid, true);
  equal(result.taskCount, 1);
  deepStrictEqual(result.tasks.map(({ id }) => id), ['T001']);
});

test('TP-005: malformed task candidates fail closed beside valid tasks', () => {
  const valid = '- [ ] T001 [US1] {FR-001} Valid task';
  for (const malformed of [
    '- [ T002 missing-close',
    '- [ ]T002 no-space',
    '- [x] T002 lowercase state',
    '- [ ] t002 lowercase ID',
    '- [ ] T0002 long ID',
    '- [ ] T002 [US1] [US1] duplicate annotation',
    '- [ ] T002 [BUG:ERROR] {FR-001} Missing category',
    '- [ ] T002 [BUG:ERROR] [RECURRING] [RECURRING] {FR-001} [runtime-error] Duplicate modifier',
  ]) {
    const result = parseTasks(`${valid}\n${malformed}`);
    equal(result.valid, false, malformed);
    equal(result.taskCount >= 1, true, malformed);
    equal(result.errors.some(({ line }) => line === 2), true, malformed);
  }
});
