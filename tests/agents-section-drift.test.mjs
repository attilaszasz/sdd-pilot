import { test } from 'node:test';
import { deepEqual, equal } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { AGENTS_SECTION_ALLOWLIST, findAgentsSectionDrift } from '../scripts/drift-report.mjs';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const agents = read('../AGENTS.md');
const initSkill = read('../.github/sddp/workflows/init-project/WORKFLOW.md');

test('ASD-001: current AGENTS.md contains only reviewed universal sections', () => {
  equal(findAgentsSectionDrift(agents).length, 0);
});

test('ASD-002: unallowlisted top-level sections are reported for maintainer review', () => {
  const findings = findAgentsSectionDrift(`${agents}\n## Project-Specific Exceptions\n\nThese rules belong elsewhere.`);

  deepEqual(findings.at(-1), {
    heading: 'Project-Specific Exceptions',
    lineNumber: agents.split(/\r?\n/).length + 1,
  });
});

test('ASD-003: every reviewed universal section is accepted by the allowlist', () => {
  for (const heading of AGENTS_SECTION_ALLOWLIST.keys()) {
    equal(findAgentsSectionDrift(`## ${heading}`).length, 0, `unexpected drift for ${heading}`);
  }
});

test('ASD-004: init-project keeps project-specific instructions out of AGENTS.md', () => {
  equal(initSkill.includes('Never read, create, or modify it'), true);
  equal(initSkill.includes('Never write `AGENTS.md`'), true);
});
