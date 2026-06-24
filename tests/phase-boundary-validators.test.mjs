import { test } from 'node:test';
import { ok, match } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const specValidator = read('../.github/agents/_spec-validator.md');
const planValidator = read('../.github/agents/_plan-validator.md');
const tasksValidator = read('../.github/agents/_tasks-validator.md');
const planFeature = read('../.github/skills/plan-feature/SKILL.md');
const generateTasks = read('../.github/skills/generate-tasks/SKILL.md');
const gates = read('../.github/skills/implement-tasks/references/gates.md');
const autopilot = read('../.github/skills/autopilot-pipeline/SKILL.md');
const agentsMd = read('../AGENTS.md');
const reference = read('../docs/reference.md');

// --- Canonical sub-agents ---

test('PV-001: _plan-validator.md exists with correct frontmatter and non-invocable', () => {
  match(planValidator, /^---[\s\S]*name: PlanValidator/, 'Plan Validator must have name frontmatter');
  match(planValidator, /user-invocable: false/, 'Plan Validator must be non-user-invocable');
  match(planValidator, /agents: \[\]/, 'Plan Validator must declare no sub-agents');
});

test('PV-002: _tasks-validator.md exists with correct frontmatter and non-invocable', () => {
  match(tasksValidator, /^---[\s\S]*name: TasksValidator/, 'Tasks Validator must have name frontmatter');
  match(tasksValidator, /user-invocable: false/, 'Tasks Validator must be non-user-invocable');
  match(tasksValidator, /agents: \[\]/, 'Tasks Validator must declare no sub-agents');
});

test('PV-003: both validators return a PASS/FAIL verdict with failing-items table', () => {
  match(planValidator, /\*\*Result\*\*: PASS \/ FAIL/, 'Plan Validator must return a PASS/FAIL verdict');
  match(planValidator, /### Failing Items/, 'Plan Validator must include a Failing Items table');
  match(tasksValidator, /\*\*Result\*\*: PASS \/ FAIL/, 'Tasks Validator must return a PASS/FAIL verdict');
  match(tasksValidator, /### Failing Items/, 'Tasks Validator must include a Failing Items table');
});

// --- Plan Validator criteria ---

test('PV-004: Plan Validator enforces 100% P1 requirement coverage in the coverage map', () => {
  match(planValidator, /Every P1 requirement ID from `spec\.md` appears as a row in the Requirement Coverage Map/, 'Must require every P1 req appears in coverage map');
  match(planValidator, /non-empty `File Path\(s\)` column/, 'Must require non-empty File Path(s) for P1 rows');
  match(planValidator, /non-empty `Function\(s\)\/Symbol\(s\)` column/, 'Must require non-empty Function(s)/Symbol(s) for P1 rows');
});

test('PV-005: Plan Validator enforces no orphaned Architecture Decisions', () => {
  match(planValidator, /no orphaned decisions with no consumer/, 'Must flag orphaned Architecture Decisions');
  match(planValidator, /Every `AD-###` row is referenced/, 'Must require every AD row to be referenced');
});

test('PV-006: Plan Validator enforces declared dependencies installable (runs for real)', () => {
  match(planValidator, /Declared Dependencies Installable/, 'Must have a declared-dependencies-installable section');
  match(planValidator, /npm install --dry-run|npm ls/, 'Must document the npm installability check');
  match(planValidator, /pip check|pip install --dry-run/, 'Must document the pip installability check');
  match(planValidator, /cargo fetch/, 'Must document the cargo installability check');
  match(planValidator, /go mod download/, 'Must document the go installability check');
  match(planValidator, /never simulate a pass/, 'Execution rules must forbid simulating a pass');
});

// --- Tasks Validator criteria ---

test('PV-007: Tasks Validator enforces every P1 requirement has >=1 task', () => {
  match(tasksValidator, /Every P1 requirement ID from `spec\.md` is tagged on at least one task/, 'Must require every P1 req has at least one task');
});

test('PV-008: Tasks Validator enforces no circular after: chains', () => {
  match(tasksValidator, /No circular `after:` chains/, 'Must forbid circular after chains');
  match(tasksValidator, /cycle detection|topological sort/, 'Must specify a cycle detection method');
});

test('PV-009: Tasks Validator enforces tasks.md <= 6 KB', () => {
  match(tasksValidator, /tasks\.md.*<= ?6144 bytes|tasks\.md.*≤ ?6 ?KB|≤ 6144 bytes/, 'Must enforce the 6 KB size limit');
});

test('PV-010: Tasks Validator enforces valid phase structure', () => {
  match(tasksValidator, /Setup.*Foundational.*Delivery.*Polish/, 'Must enforce the phase order');
  match(tasksValidator, /No empty optional phases/, 'Must forbid empty optional phases');
  match(tasksValidator, /`T###` IDs are unique and sequential/, 'Must enforce unique sequential task IDs');
});

// --- Spec Validator tightened ---

test('PV-011: Spec Validator now enforces frontmatter completeness', () => {
  match(specValidator, /### Frontmatter Completeness/, 'Spec Validator must have a Frontmatter Completeness section');
  match(specValidator, /`spec_type`.*product.*technical.*operational/, 'Must check spec_type frontmatter');
  match(specValidator, /`spec_maturity` field present/, 'Must check spec_maturity frontmatter');
});

test('PV-012: Spec Validator enforces concrete acceptance criteria for all P1 stories', () => {
  match(specValidator, /Concrete acceptance criteria present for every P1 user story or objective/, 'Must enforce concrete P1 acceptance criteria');
  match(specValidator, /at least one measurable success criterion per P1 item/, 'Must require measurable success criteria per P1 item');
});

test('PV-013: Spec Validator keeps the <=3 unresolved markers rule', () => {
  match(specValidator, /No unresolved `\[NEEDS CLARIFICATION\]` markers \(max 3/, 'Must keep the max-3 markers rule');
});

// --- Gate steps in canonical skills ---

test('PV-014: plan-feature has a Spec -> Plan gate delegating the Spec Validator with block-on-FAIL', () => {
  match(planFeature, /## 1\.6\. Spec → Plan Gate/, 'plan-feature must have a Step 1.6 Spec -> Plan gate');
  match(planFeature, /\*\*Delegate: Spec Validator\*\*.*`\.github\/agents\/_spec-validator\.md`/, 'Gate must delegate to the Spec Validator');
  match(planFeature, /Blocks the Plan phase on FAIL/, 'Gate must state it blocks the Plan phase on FAIL');
  match(planFeature, /Autopilot guard \(P0\).*HALT/, 'Gate must halt on autopilot FAIL');
  match(planFeature, /Proceed anyway/, 'Gate must offer an interactive Proceed-anyway override');
});

test('PV-015: generate-tasks has a Plan -> Tasks gate delegating the Plan Validator with block-on-FAIL', () => {
  match(generateTasks, /## 1\.5\. Plan → Tasks Gate/, 'generate-tasks must have a Step 1.5 Plan -> Tasks gate');
  match(generateTasks, /\*\*Delegate: Plan Validator\*\*.*`\.github\/agents\/_plan-validator\.md`/, 'Gate must delegate to the Plan Validator');
  match(generateTasks, /Blocks the Tasks phase on FAIL/, 'Gate must state it blocks the Tasks phase on FAIL');
  match(generateTasks, /Autopilot guard \(PM0\).*HALT/, 'Gate must halt on autopilot FAIL');
  match(generateTasks, /Proceed anyway/, 'Gate must offer an interactive Proceed-anyway override');
});

test('PV-016: gates.md has a Tasks -> Implement gate delegating the Tasks Validator with block-on-FAIL', () => {
  match(gates, /## Tasks → Implement Gate/, 'gates.md must have a Tasks -> Implement gate section');
  match(gates, /\*\*Delegate: Tasks Validator\*\*.*`\.github\/agents\/_tasks-validator\.md`/, 'Gate must delegate to the Tasks Validator');
  match(gates, /Blocks implementation on FAIL/, 'Gate must state it blocks implementation on FAIL');
  match(gates, /Autopilot guard \(I0\).*HALT/, 'Gate must halt on autopilot FAIL');
  match(gates, /Proceed anyway/, 'Gate must offer an interactive Proceed-anyway override');
});

// --- Autopilot pipeline ---

test('PV-017: autopilot pipeline notes the three boundary gates and extends halt condition #4', () => {
  match(autopilot, /Spec → Plan gate.*Spec Validator.*P0/, 'Phase 3 must note the Spec -> Plan gate');
  match(autopilot, /Plan → Tasks gate.*Plan Validator.*PM0/, 'Phase 5 must note the Plan -> Tasks gate');
  match(autopilot, /Tasks → Implement gate.*Tasks Validator.*I0/, 'Phase 7 must note the Tasks -> Implement gate');
  match(autopilot, /phase-boundary validator FAIL/, 'Halt condition #4 must cover phase-boundary validator FAIL');
});

// --- AGENTS.md and reference docs ---

test('PV-018: AGENTS.md Phase Gates documents the three mandatory validators', () => {
  match(agentsMd, /Spec → Plan gate.*Spec Validator.*≤3 unresolved.*P1.*frontmatter/s, 'AGENTS.md must document the Spec -> Plan gate');
  match(agentsMd, /Plan → Tasks gate.*Plan Validator.*100% P1.*orphaned.*installable/s, 'AGENTS.md must document the Plan -> Tasks gate');
  match(agentsMd, /Tasks → Implement gate.*Tasks Validator.*≥1 task.*circular.*6 ?KB.*phase structure/s, 'AGENTS.md must document the Tasks -> Implement gate');
  match(agentsMd, /FAIL blocks the next phase/, 'AGENTS.md must state FAIL blocks the next phase');
});

test('PV-019: reference.md Gate column updated for the three validators', () => {
  match(reference, /\*\*Plan\*.*Spec Validator.*PASS/, 'reference.md Plan gate must reference Spec Validator PASS');
  match(reference, /\*\*Tasks\*.*Plan Validator.*PASS/, 'reference.md Tasks gate must reference Plan Validator PASS');
  match(reference, /\*\*Implement\*.*Tasks Validator.*PASS/, 'reference.md Implement gate must reference Tasks Validator PASS');
});

test('PV-020: reference.md has a Phase-Boundary Validators prose section', () => {
  match(reference, /### Phase-Boundary Validators/, 'reference.md must have a Phase-Boundary Validators section');
  match(reference, /Spec → Plan.*Spec Validator.*`_spec-validator\.md`/, 'Must document the Spec -> Plan validator sub-agent');
  match(reference, /Plan → Tasks.*Plan Validator.*`_plan-validator\.md`/, 'Must document the Plan -> Tasks validator sub-agent');
  match(reference, /Tasks → Implement.*Tasks Validator.*`_tasks-validator\.md`/, 'Must document the Tasks -> Implement validator sub-agent');
  match(reference, /Analyze phase remains optional and is not made mandatory by a gate bypass/, 'Must note the Analyze-mandatory deferral');
});
