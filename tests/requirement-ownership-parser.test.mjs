import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { deepStrictEqual, equal, match } from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { parseRequirementOwnership, verifyRequirementSnapshot } from '../scripts/parse-requirement-ownership.mjs';

const fixture = (name) => readFileSync(fileURLToPath(new URL(`fixtures/requirement-ownership/${name}.md`, import.meta.url)));

test('RO-001: canonical product requirements preserve ordered P1 IDs', () => {
  const result = parseRequirementOwnership(fixture('product'));
  equal(result.valid, true);
  deepStrictEqual(result.p1RequirementIds, ['FR-001', 'FR-002']);
  deepStrictEqual(result.requirements.map(({ owner, priority }) => [owner, priority]), [['US1', 'P1'], ['US1', 'P1'], ['US2', 'P2']]);
});

test('RO-002: technical and operational ownership derive objective priority', () => {
  const technical = parseRequirementOwnership(fixture('technical'));
  const operational = parseRequirementOwnership(fixture('operational'));
  equal(technical.valid, true);
  equal(operational.valid, true);
  deepStrictEqual(technical.p1RequirementIds, ['TR-001']);
  deepStrictEqual(operational.p1RequirementIds, ['OR-001', 'RR-001']);
});

test('RO-003: malformed canonical ownership is rejected', () => {
  const result = parseRequirementOwnership(fixture('malformed-ownership'));
  equal(result.valid, false);
  match(result.errors.join('\n'), /FR-001 must use/);
});

test('RO-004: duplicate requirement IDs are rejected', () => {
  const result = parseRequirementOwnership(fixture('duplicate-id'));
  equal(result.valid, false);
  match(result.errors.join('\n'), /duplicate requirement TR-001/);
});

test('RO-005: a P1 work item cannot yield an accepted empty P1 set', () => {
  const result = parseRequirementOwnership(fixture('empty-p1'));
  equal(result.valid, false);
  deepStrictEqual(result.p1RequirementIds, []);
  match(result.errors.join('\n'), /P1 work item US1 has no owned requirements/);
});

test('RO-006: snapshot IDs must exactly match live parser output', () => {
  const bytes = fixture('product');
  const specSha256 = createHash('sha256').update(bytes).digest('hex');
  equal(verifyRequirementSnapshot(bytes, { specSha256, requirementIds: ['FR-001', 'FR-002'] }).valid, true);
  equal(verifyRequirementSnapshot(bytes, { specSha256, requirementIds: [] }).valid, false);
  equal(verifyRequirementSnapshot(bytes, { specSha256, requirementIds: ['FR-001'] }).valid, false);
});

test('RO-007: checksum mismatch rejects an otherwise exact snapshot', () => {
  const bytes = fixture('technical');
  const staleSha = createHash('sha256').update(fixture('product')).digest('hex');
  equal(verifyRequirementSnapshot(bytes, { specSha256: staleSha, requirementIds: ['TR-001'] }).valid, false);
});

test('RO-008: malformed requirement candidates fail closed beside valid requirements', () => {
  const valid = '### User Story 1 - Checkout (Priority: P1)\n- **FR-001** [US1]: Valid requirement';
  for (const malformed of [
    '- **FR-002** [US1] Missing colon',
    '- FR-002 [US1]: Missing bold marker',
    '- **FR-002** US1: Missing owner brackets',
    '- **FR-002** []: Missing owner value',
    '- **FR-002** [US1]:',
    '-  **FR-002** [US1]: Invalid spacing',
  ]) {
    const result = parseRequirementOwnership(`${valid}\n${malformed}`);
    equal(result.valid, false, malformed);
    match(result.errors.join('\n'), /FR-002/);
  }
});

test('RO-009: non-canonical requirement IDs fail closed without rejecting prose', () => {
  const valid = '### User Story 1 - Checkout (Priority: P1)\n- **FR-001** [US1]: Valid requirement';
  for (const malformed of [
    '- **FR-01** [US1]: Short ID',
    '- **FR-0001** [US1]: Long ID',
    '- **TR-01** [US1]: Wrong family and short ID',
    '- **FR-002** [USER1]: Malformed owner',
  ]) {
    const result = parseRequirementOwnership(`${valid}\n${malformed}`);
    equal(result.valid, false, malformed);
    match(result.errors.join('\n'), new RegExp(`line 3: ${malformed.match(/(?:FR|TR)-\d+/)[0]} must use`));
  }

  equal(parseRequirementOwnership(`${valid}\nA prose reference to FR-01 is not a requirement declaration.`).valid, true);
  equal(parseRequirementOwnership(`${valid}\n- An example mentions FR-01 but does not declare a requirement.`).valid, true);
});
