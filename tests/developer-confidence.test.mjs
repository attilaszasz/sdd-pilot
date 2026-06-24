import { test } from 'node:test';
import { ok, match } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const developerAgent = read('../.github/agents/_developer.md');
const implementSkill = read('../.github/skills/implement-tasks/SKILL.md');
const dryRunChecklist = read('../.github/skills/implement-tasks/references/dry-run-review-checklist.md');
const reference = read('../docs/reference.md');

test('TR-001: Step 4 Report includes Confidence field + one-line evidence on SUCCESS, omits on FAILURE', () => {
  match(developerAgent, /\*\*Confidence\*\*.*CONFIDENT \| TENTATIVE \| UNCERTAIN/, 'Step 4 must declare the Confidence field with the three levels');
  match(developerAgent, /one-line evidence statement/, 'Step 4 must require a one-line evidence statement');
  match(developerAgent, /required on SUCCESS.*omitted on FAILURE/, 'Step 4 must state the field is required on SUCCESS and omitted on FAILURE');
});

test('TR-002: Step 4 includes level-selection guidance grounded in Step 3/3.5/3.7 outcomes', () => {
  match(developerAgent, /CONFIDENT.*default when all objective checks pass/, 'Guidance must name CONFIDENT as the default when all objective checks pass');
  match(developerAgent, /Step 3.*Step 3\.5.*Step 3\.7/, 'Guidance must reference Step 3/3.5/3.7 outcomes');
});

test('TR-003: Orchestrator routes CONFIDENT to mark [X] with no extra verification', () => {
  match(implementSkill, /CONFIDENT.*mark.*\[X\]/, 'Orchestrator must mark CONFIDENT [X]');
  match(implementSkill, /no extra verification/, 'Orchestrator must state no extra verification for CONFIDENT');
});

test('TR-004: Orchestrator routes TENTATIVE to mark [X] + extra verification + TENTATIVE_TASKS, no re-delegate', () => {
  match(implementSkill, /TENTATIVE.*mark.*\[X\]/, 'Orchestrator must mark TENTATIVE [X]');
  match(implementSkill, /TENTATIVE_TASKS/, 'Orchestrator must add TENTATIVE tasks to TENTATIVE_TASKS');
  match(implementSkill, /do NOT re-delegate.*Developer/, 'Orchestrator must not re-delegate TENTATIVE to the Developer');
  match(implementSkill, /re-run.*test.*verify.*exports.*contracts/, 'Orchestrator must run extra verification (re-run tests, verify exports vs contracts) for TENTATIVE');
});

test('TR-005: Orchestrator routes UNCERTAIN into existing error-recovery with evidence in PriorAttempts', () => {
  match(implementSkill, /UNCERTAIN.*On FAILURE.*Error Recovery/, 'Orchestrator must route UNCERTAIN into the existing On FAILURE error-recovery loop');
  match(implementSkill, /uncertainty.*PriorAttempts/, 'Orchestrator must append uncertainty evidence to PriorAttempts');
});

test('TR-006: Step 6 final summary surfaces TENTATIVE_TASKS and writes them to .review-findings for QC', () => {
  match(implementSkill, /Tentative: \[tentative_count\]/, 'Final summary must list a Tentative count');
  match(implementSkill, /TENTATIVE_TASKS handoff to QC/, 'Step 6 must have a TENTATIVE_TASKS handoff to QC step');
  match(implementSkill, /\.review-findings/, 'Step 6 must write tentative tasks to .review-findings for QC priority checks');
});

test('TR-007: TENTATIVE whose extra verification fails is downgraded to FAILURE + error-recovery', () => {
  match(implementSkill, /extra verification fails.*downgrade to FAILURE/, 'Orchestrator must downgrade TENTATIVE to FAILURE when extra verification fails');
  match(implementSkill, /remove the `\[X\]`/, 'Orchestrator must remove the [X] mark on downgrade');
});

test('TR-008: dry-run review checklist includes Confidence Scoring & Auto-Escalation section', () => {
  match(dryRunChecklist, /## Confidence Scoring & Auto-Escalation/, 'Checklist must have a Confidence Scoring & Auto-Escalation section');
  match(dryRunChecklist, /required.*Confidence.*CONFIDENT \| TENTATIVE \| UNCERTAIN.*one-line evidence.*SUCCESS.*omitted on FAILURE/, 'Checklist item must assert the field exists on SUCCESS/omitted on FAILURE');
  match(dryRunChecklist, /CONFIDENT.*mark.*\[X\].*no extra verification/, 'Checklist item must assert CONFIDENT routing');
  match(dryRunChecklist, /TENTATIVE.*mark.*\[X\].*extra verification.*TENTATIVE_TASKS.*NOT re-delegate/, 'Checklist item must assert TENTATIVE routing');
  match(dryRunChecklist, /UNCERTAIN.*On FAILURE.*error-recovery.*PriorAttempts/, 'Checklist item must assert UNCERTAIN routing');
});

test('TR-009: reference docs document the Confidence field, three levels, and orchestrator escalation', () => {
  match(reference, /### Developer confidence scoring/, 'reference.md must have a Developer confidence scoring section');
  match(reference, /Confidence: CONFIDENT \| TENTATIVE \| UNCERTAIN/, 'reference.md must document the three levels');
  match(reference, /auto-escalates/, 'reference.md must document auto-escalation');
  match(reference, /TENTATIVE_TASKS/, 'reference.md must mention TENTATIVE_TASKS surfacing to QC');
});
