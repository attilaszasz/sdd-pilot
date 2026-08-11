import { test } from 'node:test';
import { match, ok, strictEqual } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const autopilot = read('../.github/skills/autopilot-pipeline/SKILL.md');
const implementQc = read('../.github/skills/implement-qc-loop/SKILL.md');
const implement = read('../.github/skills/implement-tasks/SKILL.md');
const gates = read('../.github/skills/implement-tasks/references/gates.md');
const generateTasks = read('../.github/skills/generate-tasks/SKILL.md');
const qualityControl = read('../.github/skills/quality-control/SKILL.md');
const checklist = read('../.github/skills/generate-checklist/SKILL.md');
const analyze = read('../.github/skills/analyze-compliance/SKILL.md');
const reference = read('../docs/reference.md');

const phaseSkills = [
  '../.github/skills/specify-feature/SKILL.md',
  '../.github/skills/clarify-spec/SKILL.md',
  '../.github/skills/plan-feature/SKILL.md',
  '../.github/skills/generate-checklist/SKILL.md',
  '../.github/skills/generate-tasks/SKILL.md',
  '../.github/skills/analyze-compliance/SKILL.md',
  '../.github/skills/implement-qc-loop/SKILL.md',
  '../.github/skills/implement-tasks/SKILL.md',
  '../.github/skills/quality-control/SKILL.md',
].map(read);

const autopilotSurfaces = [
  '../.agents/workflows/sddp-autopilot.md',
  '../.agents/skills/sddp-autopilot/SKILL.md',
  '../.opencode/commands/sddp-autopilot.md',
  '../.claude/skills/sddp-autopilot/SKILL.md',
  '../.windsurf/workflows/sddp-autopilot.md',
].map(read);
const copilotAutopilotPrompt = read('../.github/prompts/sddp-autopilot.prompt.md');

test('PCH-001: autopilot captures one context report and passes it through every phase', () => {
  match(autopilot, /initial full Context Gatherer report is the only context resolution/);
  match(autopilot, /Store the exact full Context Report as `PIPELINE_CONTEXT`/);
  strictEqual((autopilot.match(/PIPELINE_CONTEXT = PIPELINE_CONTEXT/g) ?? []).length, 7);
  match(autopilot, /nested Implement\/QC skill/);
});

test('PCH-002: phase skills consume valid handoff context and preserve standalone fallback', () => {
  for (const skill of phaseSkills) {
    match(skill, /Optional `PIPELINE_CONTEXT` input/);
    match(skill, /reports `CONTEXT_BLOCKED` as `false`, has a non-empty `FEATURE_DIR`/);
    match(skill, /without delegating Context Gatherer|Do not delegate Context Gatherer again/);
    match(skill, /re-?check|Re-check|Re-read|re-read/i);
    match(skill, /If `PIPELINE_CONTEXT` is absent or invalid/);
    match(skill, /Delegate: Context Gatherer/);
  }
});

test('PCH-003: mutable gate state is read live instead of trusted from the initial report', () => {
  match(checklist, /current `FEATURE_DIR\/checklists\/\.checklists` file on disk/);
  match(checklist, /overrides any `HAS_CHECKLIST_QUEUE` snapshot/);
  match(implement, /derive `HAS_SPEC`, `HAS_PLAN`, and `HAS_TASKS` from their current contents/);
  match(gates, /context handoff or Context Gatherer returns, re-read `spec\.md`, `plan\.md`, and `tasks\.md`/);
  match(qualityControl, /Re-check `.completed` and current task completion state from disk/);
  match(analyze, /Re-check `spec\.md`, `plan\.md`, and `tasks\.md` on disk/);
});

test('PCH-004: Implement+QC forwards the same context to nested Implement and QC', () => {
  match(implementQc, /for every loop iteration and nested sub-skill/);
  match(implementQc, /implement-tasks\/SKILL\.md.*passing `PIPELINE_CONTEXT` unchanged/);
  match(implementQc, /quality-control\/SKILL\.md.*passing `PIPELINE_CONTEXT` unchanged/);
});

test('PCH-005: all autopilot entry surfaces describe the shared handoff', () => {
  for (const surface of autopilotSurfaces) {
    match(surface, /initial full Context Gatherer report as `PIPELINE_CONTEXT`/);
    match(surface, /re-check mutable artifacts/);
  }
});

test('PCH-006: context handoff is in-turn only and standalone commands retain delegation', () => {
  match(reference, /exact full Context Report as the in-turn `PIPELINE_CONTEXT` value/);
  match(reference, /Standalone commands omit the value and retain normal Context Gatherer delegation/);
  match(reference, /`PIPELINE_CONTEXT` is not persisted to a feature workspace/);
  ok(!reference.includes('.context-cache'), 'the implementation must not introduce a durable context cache');
});

test('PCH-007: autopilot captures a separate post-Clarify P1 snapshot', () => {
  match(autopilot, /### 2\.5 Capture P1 requirement snapshot/);
  match(autopilot, /exact UTF-8 bytes of `FEATURE_DIR\/spec\.md`/);
  match(autopilot, /lowercase SHA-256 digest/);
  match(autopilot, /This value is not logged, persisted, or added to `PIPELINE_CONTEXT`/);
  strictEqual((autopilot.match(/P1_REQUIREMENT_SNAPSHOT = P1_REQUIREMENT_SNAPSHOT/g) ?? []).length, 2);
});

test('PCH-008: the snapshot is forwarded separately to Tasks and fresh Implement, not QC', () => {
  match(autopilot, /generate-tasks\/SKILL\.md.*P1_REQUIREMENT_SNAPSHOT = P1_REQUIREMENT_SNAPSHOT/);
  match(autopilot, /implement-qc-loop\/SKILL\.md.*P1_REQUIREMENT_SNAPSHOT = P1_REQUIREMENT_SNAPSHOT/);
  match(generateTasks, /Optional `P1_REQUIREMENT_SNAPSHOT` input/);
  match(implementQc, /forward it separately to fresh `implement-tasks` runs/);
  match(implementQc, /Do not pass `P1_REQUIREMENT_SNAPSHOT` to QC/);
  match(implement, /pass it to `references\/gates\.md` only on fresh runs/);
  match(gates, /pass only the IDs from a checksum-matching `P1_REQUIREMENT_SNAPSHOT`/);
});

test('PCH-009: all autopilot entry surfaces describe the separate snapshot boundary', () => {
  for (const surface of autopilotSurfaces) {
    match(surface, /separate ephemeral `P1_REQUIREMENT_SNAPSHOT`/);
    match(surface, /not part of `PIPELINE_CONTEXT`/);
    match(surface, /after checksum verification/);
  }
});

test('PCH-010: Copilot autopilot prompt delegates handoff details to the canonical skill', () => {
  match(copilotAutopilotPrompt, /\.github\/skills\/autopilot-pipeline\/SKILL\.md/);
  match(copilotAutopilotPrompt, /Set `AUTOPILOT = true`/);
  match(copilotAutopilotPrompt, /Never prompt the user/);
  ok(!copilotAutopilotPrompt.includes('PIPELINE_CONTEXT'), 'Copilot prompt must not duplicate canonical context handoff details');
  ok(!copilotAutopilotPrompt.includes('P1_REQUIREMENT_SNAPSHOT'), 'Copilot prompt must not duplicate canonical snapshot details');
});
