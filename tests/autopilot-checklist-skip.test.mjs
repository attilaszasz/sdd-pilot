import { test } from 'node:test';
import { match, ok } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const autopilot = read('../.github/sddp/workflows/autopilot-pipeline/WORKFLOW.md');
const plan = read('../.github/sddp/workflows/plan-feature/WORKFLOW.md');

test('ACS-001: risk-bearing skip_checklist run suppresses a new queue before Checklist', () => {
  match(autopilot, /SKIP_CHECKLIST_QUEUE = \[HINT_SKIP_CHECKLIST\]/);
  match(plan, /If `SKIP_CHECKLIST_QUEUE = true`, run `node scripts\/checklist-state\.mjs "FEATURE_DIR"`[\s\S]*`overallStatus = "N\/A"` or `"PASS"` → do not create, append to, or otherwise mutate `checklists\/` or `\.checklists`/);
  match(autopilot, /Plan suppressed new queue generation; live state is non-blocking/);
});

test('ACS-002: an existing incomplete or malformed checklist blocks skip_checklist before Tasks', () => {
  match(plan, /Existing incomplete checklist state remains authoritative/);
  match(plan, /skip_checklist cannot bypass an existing pending or malformed checklist/);
  match(autopilot, /Checklist skip conflict: existing checklist state blocks/);
  match(autopilot, /\*\*HALT\*\* before Tasks/);
  ok(!autopilot.includes('HINT_SKIP_CHECKLIST = true` → log `phase_skip` row: Detail="Pipeline hint: skip_checklist", Artifacts'));
});
