import { test } from 'node:test';
import { match, ok } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const agents = read('../AGENTS.md');
const specify = read('../.github/skills/specify-feature/SKILL.md');
const plan = read('../.github/skills/plan-feature/SKILL.md');
const tasks = read('../.github/skills/generate-tasks/SKILL.md');
const wbs = read('../.github/agents/_wbs-generator.md');
const checklist = read('../.github/skills/generate-checklist/SKILL.md');
const planner = read('../.github/agents/_test-planner.md');
const database = read('../.github/agents/_database-administrator.md');
const api = read('../.github/agents/_api-designer.md');
const reference = read('../docs/reference.md');

test('FRP-001: unattended spec and plan reruns refine instead of overwrite', () => {
  match(specify, /AUTOPILOT = true.*choose Refine.*never regenerate the spec unattended/s);
  match(plan, /AUTOPILOT = true.*choose Refine.*update the existing plan in place/s);
  ok(!specify.includes('default Overwrite'), 'Specify must not default to overwrite');
  ok(!plan.includes('choose Overwrite'), 'Plan must not default to overwrite');
});

test('FRP-002: checked tasks and traceability survive reconciliation', () => {
  match(tasks, /`RERUN_MODE = reconcile`.*snapshot all `T###` lines, checkbox state, phase headers, BUG tasks\/context/s);
  match(wbs, /Preserve every existing `T###` line in place, including `\[X\]` state, BUG modifiers\/context/);
  match(wbs, /assigning IDs above the highest existing `T###`; never fill gaps, renumber, reuse, delete, or reorder IDs/);
  match(wbs, /every baseline `T###` and phase header remains, every baseline `\[X\]` line is byte-identical/);
  match(wbs, /RERUN_MIGRATION_REQUIRED.*without writing/);
});

test('FRP-003: checklist queues and files preserve IDs, state, and paths', () => {
  match(plan, /Preserve every existing `CHL###` line and checkbox state/);
  match(plan, /append only new domains using IDs above the highest existing `CHL###`/);
  match(checklist, /<CHL###>-<normalized-domain>\.md/);
  match(checklist, /<normalized-domain>-<NNN>\.md/);
  match(checklist, /queued path already exists.*interrupted run.*skip Test Planner.*preserve its `CHK###` IDs\/state/s);
  match(planner, /does not exist.*CHECKLIST_PATH_COLLISION.*never overwrite/s);
});

test('FRP-004: dependent design artifacts refine referenced names', () => {
  match(database, /preserve existing entity names used by plan\/tasks\/contracts/);
  match(database, /verifying every baseline referenced entity remains/);
  match(database, /forbidden under Autopilot/);
  match(api, /preserving referenced operation\/type names; never delete unrelated contract files/);
  match(api, /verify every baseline contract file and referenced operation\/type remains/);
  match(api, /forbidden under Autopilot/);
});

test('FRP-005: destructive migration is explicit, mapped, atomic, and interactive-only', () => {
  match(agents, /Autopilot never authorizes destructive regeneration/);
  match(agents, /interactive-only migration.*complete old-ID → new-ID mapping.*update every downstream reference atomically.*no checked line or unmapped ID was lost/s);
  match(specify, /Missing approval or failed validation leaves all original bytes unchanged/);
  match(plan, /failure leaves original bytes unchanged/);
  match(tasks, /Any unmapped ID, checked-line loss, or validation failure leaves the original file unchanged/);
  match(plan, /verify every baseline `AD-###`.*checked line remains.*downstream task references still resolve/s);
  match(reference, /Feature reruns and migration.*refined, not regenerated.*interactive-only migration/s);
});
