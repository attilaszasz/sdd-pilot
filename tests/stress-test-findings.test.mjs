import { test } from 'node:test';
import { match } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const scanner = read('../.github/agents/_adversarial-scanner.md');
const clarify = read('../.github/skills/clarify-spec/SKILL.md');
const validator = read('../.github/agents/_spec-validator.md');

test('STF-001: repeated scans allocate above persisted IDs without filling gaps', () => {
  match(scanner, /`ExistingFindingIds`: Ordered unique `STF-###` IDs already persisted/);
  match(scanner, /`HighestFindingNumber`: Highest numeric suffix.*or `0`/);
  match(scanner, /start at `HighestFindingNumber \+ 1`/);
  match(scanner, /Never reuse a gap or any ID in `ExistingFindingIds`/);
  match(clarify, /Extract every persisted `STF-###` ID from the live spec/);
});

test('STF-002: malformed, stale, and colliding allocations fail without writes', () => {
  match(scanner, /input IDs are malformed or duplicated/);
  match(scanner, /`HighestFindingNumber` disagrees with their maximum/);
  match(scanner, /"error": "STF_ID_COLLISION"/);
  match(clarify, /duplicates another returned ID.*exists in `ExistingFindingIds`.*halt without writing/s);
  match(clarify, /re-read the live spec and recheck all proposed IDs/);
  match(clarify, /Any collision halts the write atomically/);
});

test('STF-003: marker cap manages questions but cannot waive critical findings', () => {
  match(clarify, /marker cap never resolves, waives, or lowers its severity/);
  match(clarify, /Every CRITICAL\/HIGH finding has an inline resolution/);
  match(validator, /contains no unresolved CRITICAL\/HIGH findings/);
  match(validator, /FAILS independently at every ordinary-marker count, including 0 through 3/);
});

test('STF-004: Clarify handles marker boundary counts and reports overflow exactly', () => {
  match(clarify, /At counts 0, 1, or 2: add `\[NEEDS CLARIFICATION: STF-###\]`/);
  match(clarify, /At count 3 or greater: do NOT add another marker/);
  match(clarify, /warn with the exact marker count/);
  match(clarify, /counts 0 through 3 satisfy the ordinary-marker cap and count 4 or greater requires another clarification pass/);
});

test('STF-005: resolved findings retain stable traceability', () => {
  match(clarify, /resolved prior finding keeps its existing ID and entry/);
  match(validator, /Resolved findings retain their persisted IDs and traceability/);
});
