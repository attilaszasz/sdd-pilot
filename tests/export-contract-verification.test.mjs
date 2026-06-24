import { test } from 'node:test';
import { ok, match } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const developerAgent = read('../.github/agents/_developer.md');
const implementSkill = read('../.github/skills/implement-tasks/SKILL.md');
const dryRunChecklist = read('../.github/skills/implement-tasks/references/dry-run-review-checklist.md');
const analyzeCompliance = read('../.github/skills/analyze-compliance/SKILL.md');
const reference = read('../docs/reference.md');

test('TR-001: Step 3.8 exists, gated on non-empty Exports, runs after Step 3.7', () => {
  match(developerAgent, /## 3\.8 Export Contract Verification/, 'Section 3.8 header must exist');
  match(developerAgent, /Only when `Exports` provided \(non-empty array\): run AFTER Step 3\.7/, 'Section 3.8 must be gated on non-empty Exports and run after Step 3.7');
});

test('TR-002: Step 3.8 covers the three sub-checks — existence, importability, signature match', () => {
  match(developerAgent, /\*\*Existence\*\*.*grep the task `FilePath` for the `Symbol` declaration/, 'Existence sub-check must grep FilePath for the symbol declaration');
  match(developerAgent, /for JS\/TS require an `export` keyword/, 'Existence must require an export keyword for JS/TS so a declared-but-not-exported symbol fails');
  match(developerAgent, /\*\*Importability\*\*.*stack-aware/, 'Importability sub-check must be stack-aware');
  match(developerAgent, /\*\*Signature match\*\*/, 'Signature match sub-check must exist');
});

test('TR-003: Importability is stack-aware with build/typecheck fallback for compiled languages', () => {
  match(developerAgent, /python -c "from <module> import <Symbol>/, 'Python one-liner import must be documented');
  match(developerAgent, /node --input-type=module.*import\('<module>'\)/, 'JS ESM one-liner import must be documented');
  match(developerAgent, /tsc --noEmit/, 'TypeScript build/typecheck fallback must be documented');
  match(developerAgent, /go build/, 'Go package-level build fallback must be documented');
  match(developerAgent, /cargo check/, 'Rust crate-level check fallback must be documented');
  match(developerAgent, /Other compiled languages.*build\/typecheck/, 'A generic build/typecheck fallback for other compiled languages must be documented');
});

test('TR-004: Signature match is param-count for untyped, + return type for typed where statically determinable', () => {
  match(developerAgent, /Untyped stacks.*compare parameter count only/, 'Signature match must compare param count only for untyped stacks');
  match(developerAgent, /compare parameter count only/, 'Param-count-only rule for untyped stacks must be stated');
  match(developerAgent, /Typed stacks.*return type.*statically/, 'Signature match must compare return type for typed stacks where statically determinable');
  match(developerAgent, /skip it when the actual return type cannot be statically determined/, 'Signature match must skip return-type comparison (not fail) when the actual return type cannot be statically determined');
});

test('TR-005: Step 3.8 failure routes to errorType: export-contract and does not mark the task complete', () => {
  match(developerAgent, /errorType: export-contract/, 'Section 3.8 must report errorType: export-contract on failure');
  match(developerAgent, /Do NOT mark the task complete/, 'Section 3.8 must not mark the task complete on failure');
  match(developerAgent, /parent implementation agent routes the failure into its error-recovery loop/, 'Section 3.8 must hand the failure to the orchestrator error-recovery loop');
});

test('TR-006: Step 3.8 success notes "export contracts verified for [symbol(s)]" and skip-when-empty rule', () => {
  ok(
    developerAgent.includes('export contracts verified for [symbol(s)]'),
    'Section 3.8 must note "export contracts verified for [symbol(s)]" on success',
  );
  match(developerAgent, /When `Exports` is absent or empty.*skip this section/, 'Section 3.8 must skip when Exports is absent or empty');
});

test('TR-007: export-contract added to the Step 4 Error Details errorType enum', () => {
  match(
    developerAgent,
    /errorType`?: dependency \| import \| type \| test \| lint \| compilation \| requirement-gap \| verify-failure \| export-contract \| unknown/,
    'The errorType enum must include export-contract',
  );
});

test('TR-008: Step 4 CONFIDENT guidance counts Step 3.8 among the objective checks', () => {
  match(
    developerAgent,
    /CONFIDENT.*default when all objective checks pass.*Step 3\.8 export contracts verified.*when `Exports` present/,
    'CONFIDENT guidance must list Step 3.8 export contracts verified (when Exports present) among the objective checks',
  );
});

test('TR-009: implement-tasks rules block documents Section 3.8 per-task run, export-contract errorType, and trace-back routing', () => {
  match(implementSkill, /\*\*Export contract verification\*\*/, 'Rules block must have an Export contract verification entry');
  match(implementSkill, /Section 3\.8 after Section 3\.7 for every task with a non-empty `exports` array/, 'Rules block must state Section 3.8 runs after 3.7 for tasks with exports');
  match(implementSkill, /errorType: export-contract/, 'Rules block must name the export-contract errorType');
  match(implementSkill, /consumer→producer trace-back/, 'Rules block must reference the consumer→producer trace-back rule');
});

test('TR-010: implement-tasks Exports Developer-input bullet references Section 3.8', () => {
  match(
    implementSkill,
    /`Exports`.*parsed `exports` array from Task Tracker.*runs the Section 3\.8 export-contract verification.*existence, importability, signature match/,
    'The Exports Developer-input bullet must reference Section 3.8 and its three sub-checks',
  );
});

test('TR-011: implement-tasks On FAILURE adds export-contract to the auto-fix list', () => {
  match(
    implementSkill,
    /`export-contract` → analyze the failing Section 3\.8 sub-check/,
    'On FAILURE auto-fix list must include an export-contract branch referencing Section 3.8',
  );
});

test('TR-012: implement-tasks On FAILURE has a consumer→producer trace-back step that fixes the producer first', () => {
  match(implementSkill, /Consumer→producer trace-back.*errorType`? is `import` or `export-contract`/, 'On FAILURE must have a trace-back step triggered by import or export-contract errors');
  match(implementSkill, /inspect its `imports\[\]` for a `sourceTask` referencing a producer task/, 'Trace-back must inspect imports[] for a producer sourceTask');
  match(implementSkill, /If the producer's export contract FAILS → fix the producer first/, 'Trace-back must fix the producer first when its export contract fails');
  match(implementSkill, /Do NOT retry the consumer in isolation when its producer is broken/, 'Trace-back must not retry the consumer in isolation when the producer is broken');
  match(implementSkill, /generalizes the existing parallel-batch trace-back rule/, 'Trace-back must state it generalizes the existing parallel-batch rule to sequential tasks');
});

test('TR-013: implement-tasks notes Phase Review step 5 and Micro-QC remain as safety nets', () => {
  match(implementSkill, /Phase Review step 5 and Micro-QC export conformance remain as safety nets/, 'Rules block must state Phase Review and Micro-QC remain as safety nets');
  match(implementSkill, /Section 3\.8 is the early-warning per-task layer/, 'Rules block must call Section 3.8 the early-warning per-task layer');
});

test('TR-014: dry-run review checklist has an Export Contract Verification (Step 3.8) section', () => {
  match(dryRunChecklist, /## Export Contract Verification \(Step 3\.8\)/, 'Checklist must have an Export Contract Verification (Step 3.8) section');
});

test('TR-015: dry-run checklist covers existence, importability, signature match, and trace-back', () => {
  match(dryRunChecklist, /\*\*Existence\*\*.*grep the task `FilePath`.*export.*keyword/, 'Checklist must assert the Existence sub-check with the JS/TS export-keyword requirement');
  match(dryRunChecklist, /\*\*Importability\*\*.*stack-aware one-liner/, 'Checklist must assert the Importability sub-check is stack-aware');
  match(dryRunChecklist, /python -c.*node --input-type=module.*tsc --noEmit.*go build.*cargo check/, 'Checklist must enumerate the stack-aware importability commands');
  match(dryRunChecklist, /\*\*Signature match\*\*.*param count only.*untyped.*return type.*typed/, 'Checklist must assert the signature-match strictness split between untyped and typed stacks');
  match(dryRunChecklist, /Consumer→producer trace-back/, 'Checklist must assert the consumer→producer trace-back rule');
  match(dryRunChecklist, /errorType: export-contract/, 'Checklist must assert export-contract is in the errorType enum');
  match(dryRunChecklist, /export contracts verified for \[symbol\(s\)\]/, 'Checklist must assert the success note');
});

test('TR-016: reference docs document Export contract verification (Step 3.8)', () => {
  match(reference, /### Export contract verification \(Step 3\.8\)/, 'reference.md must have an Export contract verification (Step 3.8) section');
  match(reference, /Three sub-checks.*existence.*importability.*signature match/s, 'reference.md must name the three sub-checks');
  match(reference, /consumer→producer trace-back/, 'reference.md must document the consumer→producer trace-back rule');
  match(reference, /early-warning per-task layer/, 'reference.md must call Section 3.8 the early-warning per-task layer');
  match(reference, /Phase Review step 5.*safety nets/, 'reference.md must note Phase Review and Micro-QC remain as safety nets');
});

test('TR-017: analyze-compliance notes the runtime enforcement by Section 3.8 + trace-back', () => {
  match(analyzeCompliance, /Cross-phase dependency edges.*← T###:Symbol.*→ exports:/, 'analyze-compliance must keep its existing cross-phase dependency edge check');
  match(analyzeCompliance, /enforced at runtime by the Developer's Section 3\.8 export-contract verification/, 'analyze-compliance must note runtime enforcement by Section 3.8');
  match(analyzeCompliance, /orchestrator's consumer→producer trace-back/, 'analyze-compliance must note the orchestrator trace-back rule');
});
