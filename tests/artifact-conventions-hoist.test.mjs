import { test } from 'node:test';
import { match, ok } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const agents = read('../AGENTS.md');
const reference = read('../.github/skills/artifact-conventions/SKILL.md');
const driftReport = read('../scripts/drift-report.mjs');
const skillFiles = [
  '../.github/skills/analyze-compliance/SKILL.md',
  '../.github/skills/autopilot-pipeline/SKILL.md',
  '../.github/skills/clarification-strategies/SKILL.md',
  '../.github/skills/clarify-spec/SKILL.md',
  '../.github/skills/implement-qc-loop/SKILL.md',
  '../.github/skills/implement-tasks/SKILL.md',
  '../.github/skills/plan-authoring/SKILL.md',
  '../.github/skills/prototype-regen/SKILL.md',
  '../.github/skills/quality-control/SKILL.md',
  '../.github/skills/spec-authoring/SKILL.md',
  '../.github/skills/task-generation/SKILL.md',
].map(read);

const primerSentinels = [
  '- [ ] T### [P?] [US#|OBJ#?] {(FR|TR|OR|RR)-###?} [COMPLETES req?] Description [after:T###?] [← T###:Symbol?] [→ exports: Symbol?] [VERIFY: <command>]?*',
  '- **(FR|TR|OR|RR)-###** [US#|OBJ#]: ...',
  'SC-### [US#|OBJ#]: [Measurable, technology-agnostic outcome]',
  '- [ ] CHK### <question> [Quality Dimension, Spec §X.Y]',
  '- [ ] T### [BUG:severity] [RECURRING?] [ESCALATED?] [DEFERRED?] {(FR|TR|OR|RR)-###} [category] Description — file:line',
  'STF-###: [Category] (Severity) — Affected: [IDs] — [summary]',
  'T###`, `CHK###`, `FR-###`, `TR-###`, `OR-###`, `RR-###`, `SC-###`, `AD-###`, `ADR-NNNN`, or `STF-###',
  '- [ ]` → `- [X]',
  'Product specs require `Problem Statement`, `Scope`, `User Scenarios & Testing`, `Requirements`, `Assumptions & Risks`, `Implementation Signals`, and `Success Criteria`; technical specs use `Technical Objectives` and `Integration Points`; operational specs use `Operational Objectives` and `Integration Points`.',
  'Size limit: ≤ **10KB**',
  'Size limit: ≤ **6KB**',
];

test('ACH-001: AGENTS.md contains the runtime artifact convention contract', () => {
  match(agents, /^## Artifact Conventions/m);
  for (const sentinel of primerSentinels) {
    ok(agents.includes(sentinel), `missing artifact convention sentinel: ${sentinel}`);
  }
});

test('ACH-002: expanded conventions point to the ambient primer', () => {
  match(reference, /> Runtime primer: `AGENTS\.md` §Artifact Conventions/);
  match(driftReport, /checkArtifactConventionsHoist/);
  match(driftReport, /Artifact Conventions Hoist/);
});

test('ACH-003: workflow skills do not reload the expanded conventions', () => {
  const target = 'artifact-conventions/SKILL.md';
  const loadInstruction = /\b(?:read|re-?read|load|execute|follow|acquire)\b/i;

  for (const skill of skillFiles) {
    for (const line of skill.split(/\r?\n/)) {
      ok(!(line.includes(target) && loadInstruction.test(line)), `skill reintroduced a convention load: ${line}`);
    }
  }
});
