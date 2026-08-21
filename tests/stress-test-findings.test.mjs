import { test } from 'node:test';
import { deepEqual, equal, match } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseStressTestFindings, validateScannerFindings } from '../scripts/parse-stress-test-findings.mjs';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const clarify = read('../.github/sddp/workflows/clarify-spec/WORKFLOW.md');
const validator = read('../.github/agents/_spec-validator.md');

const finding = (id = 'STF-001', overrides = {}) => ({
  id, summary: 'Conflict', category: 'cross-requirement-contradiction', severity: 'HIGH',
  affected_ids: ['FR-001'], scenario: 'Given load, When sync runs, Then limits conflict',
  recommended_resolution: 'Bound sync work', ...overrides,
});
const withRequirement = (findings) => `- **FR-001** [US1]: bounded work\n${findings}`;

test('STF-001: canonical definitions are distinct from markers and prose references', () => {
  const parsed = parseStressTestFindings('- **FR-001** [US1]: bounded work [NEEDS CLARIFICATION: STF-001]\nSTF-001: [cross-requirement-contradiction] (HIGH) — Affected: FR-001 — Conflict\nSee STF-001 for details.');
  equal(parsed.valid, true);
  deepEqual(parsed.definitions.map(({ id, resolution }) => ({ id, resolution })), [{ id: 'STF-001', resolution: 'unresolved' }]);
  equal(parsed.references.length, 3);
  equal(validateScannerFindings({ findings: [finding('STF-002')] }, parsed).valid, true);
});

test('STF-002: definitions allocate monotonically and never fill gaps across sessions', () => {
  const none = parseStressTestFindings('- **FR-001** [US1]: bounded work');
  const one = parseStressTestFindings(withRequirement('STF-003: [boundary-scale-stress] (MEDIUM) — Affected: FR-001 — Boundary'));
  const many = parseStressTestFindings(withRequirement('STF-001: [boundary-scale-stress] (MEDIUM) — Affected: FR-001 — First\nSTF-003: [constraint-impossibility] (HIGH) — Affected: FR-001 — Third'));
  equal(validateScannerFindings({ findings: [finding('STF-001')] }, none).valid, true);
  equal(validateScannerFindings({ findings: [finding('STF-004')] }, one).valid, true);
  equal(validateScannerFindings({ findings: [finding('STF-004')] }, many).valid, true);
  equal(validateScannerFindings({ findings: [finding('STF-002')] }, many).valid, false);
});

test('STF-003: duplicate or malformed definitions fail closed while resolved findings retain traceability', () => {
  const duplicate = parseStressTestFindings(withRequirement('STF-001: [boundary-scale-stress] (MEDIUM) — Affected: FR-001 — First\nSTF-001: [boundary-scale-stress] (MEDIUM) — Affected: FR-001 — Second'));
  const malformed = parseStressTestFindings(withRequirement('STF-001: [unknown] (LOW) — Affected: NOPE — Bad'));
  const unknownAffected = parseStressTestFindings(withRequirement('STF-002: [boundary-scale-stress] (MEDIUM) — Affected: FR-999 — Unknown'));
  const resolved = parseStressTestFindings(withRequirement('STF-007: [boundary-scale-stress] (MEDIUM) — Affected: FR-001 — Kept'));
  equal(duplicate.valid, false);
  equal(malformed.valid, false);
  equal(unknownAffected.valid, false);
  deepEqual(resolved.definitions.map(({ id, resolution }) => ({ id, resolution })), [{ id: 'STF-007', resolution: 'resolved' }]);
  const deferred = parseStressTestFindings(withRequirement('STF-008: [boundary-scale-stress] (HIGH) — Affected: FR-001 — Deferred [DEFERRED TO NEXT CLARIFY]'));
  equal(deferred.definitions[0].resolution, 'unresolved');
});

test('STF-004: malformed scanner output fails before persistence', () => {
  const persisted = parseStressTestFindings(withRequirement('STF-001: [boundary-scale-stress] (MEDIUM) — Affected: FR-001 — Existing'));
  for (const output of [null, { findings: [finding('STF-002', { severity: 'LOW' })] }, { findings: [finding('STF-002', { category: 'unknown' })] }, { findings: [finding('STF-002', { affected_ids: ['FR-999'] })] }, { findings: Array.from({ length: 6 }, (_, index) => finding(`STF-00${index + 2}`)) }]) equal(validateScannerFindings(output, persisted).valid, false);
  equal(validateScannerFindings({ findings: Array.from({ length: 5 }, (_, index) => finding(`STF-00${index + 2}`)) }, persisted).valid, true);
});

test('STF-005: severe unresolved findings remain independently blocking', () => {
  match(clarify, /parse-stress-test-findings\.mjs/);
  match(clarify, /markers and prose references remain traceability data/);
  match(clarify, /Every CRITICAL\/HIGH finding has an inline resolution/);
  match(validator, /contains no unresolved CRITICAL\/HIGH findings/);
  match(validator, /FAILS independently at every ordinary-marker count, including 0 through 3/);
});
