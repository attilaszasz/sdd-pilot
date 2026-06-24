import { test } from 'node:test';
import { ok, match } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const developerAgent = read('../.github/agents/_developer.md');
const implementSkill = read('../.github/skills/implement-tasks/SKILL.md');
const dryRunChecklist = read('../.github/skills/implement-tasks/references/dry-run-review-checklist.md');
const reference = read('../docs/reference.md');

test('TR-001: Step 3.5 greps test locations for reqID/symbol and fails requirement-gap on no match', () => {
  match(developerAgent, /Happy-path test coverage/, 'Step 3.5 must add a happy-path test coverage sub-check');
  match(developerAgent, /requirement-gap/, 'Step 3.5 must keep the requirement-gap errorType on a miss');
  match(developerAgent, /\*\.test\.\*|\*_test\.\*/, 'Step 3.5 must enumerate co-located test file patterns');
  match(developerAgent, /tests\/.*__tests__\//, 'Step 3.5 must enumerate tests/ and __tests__/ locations');
  match(developerAgent, /reqID tag/, 'Step 3.5 must accept a reqID tag match as coverage');
});

test('TR-002: Step 3.5 skips happy-path grep when AcceptanceStub present for reqID', () => {
  match(
    developerAgent,
    /skip this sub-check when an `AcceptanceStub` exists for this `reqID`/,
    'Step 3.5 must skip the happy-path grep when an AcceptanceStub exists for the reqID',
  );
});

test('TR-003: Report notes happy-path test verified for reqIDs on pass', () => {
  ok(
    developerAgent.includes('happy-path test verified for [reqID(s)]'),
    'Report must include the "happy-path test verified for [reqID(s)]" success note',
  );
});

test('TR-004: implement-tasks SKILL ExpectedEvidence description states the happy-path test check', () => {
  match(
    implementSkill,
    /happy-path test coverage sub-check/,
    'ExpectedEvidence description must mention the happy-path test coverage sub-check',
  );
  match(
    implementSkill,
    /skipped when an `AcceptanceStub` exists for the reqID/,
    'ExpectedEvidence description must state the AcceptanceStub skip condition',
  );
});

test('TR-005: dry-run review checklist includes a Requirement Self-Verification happy-path item', () => {
  match(
    dryRunChecklist,
    /## Requirement Self-Verification \(Step 3\.5\)/,
    'Checklist must have a Requirement Self-Verification (Step 3.5) section',
  );
  match(
    dryRunChecklist,
    /greps conventional test locations.*\*\.test\.\*.*\*_test\.\*.*tests\/.*__tests__\//s,
    'Checklist item must enumerate conventional test locations for the happy-path grep',
  );
  match(
    dryRunChecklist,
    /skips the happy-path grep when an `AcceptanceStub` exists/,
    'Checklist item must assert the AcceptanceStub skip behavior',
  );
});

test('TR-006: reference docs document the happy-path test coverage check', () => {
  match(
    reference,
    /### Requirement self-verification \(Step 3\.5\)/,
    'reference.md must have a Requirement self-verification (Step 3.5) section',
  );
  match(
    reference,
    /happy-path test coverage sub-check/,
    'reference.md must document the happy-path test coverage sub-check',
  );
  match(
    reference,
    /skipped when an `AcceptanceStub` exists for the reqID/,
    'reference.md must document the AcceptanceStub skip condition',
  );
});
