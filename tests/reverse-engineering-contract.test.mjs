import { test } from "node:test";
import { match, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const read = (file) => readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), "utf8");
const workflow = read(".github/sddp/workflows/reverse-engineering/WORKFLOW.md");
const shared = read(".github/skills/evidence-led-authoring/SKILL.md");

test("REC-001: all hosts expose one interactive command with unchanged controls", () => {
  for (const file of [".github/prompts/sddp-reverseengineer.prompt.md", ".claude/skills/sddp-reverseengineer/SKILL.md", ".agents/skills/sddp-reverseengineer/SKILL.md", ".agents/workflows/sddp-reverseengineer.md", ".opencode/commands/sddp-reverseengineer.md", ".windsurf/workflows/sddp-reverseengineer.md"]) {
    const wrapper = read(file);
    for (const token of ["$ARGUMENTS", "--resume", "--status", ".github/sddp/workflows/reverse-engineering/WORKFLOW.md"]) ok(wrapper.includes(token), file);
    match(wrapper, /[Aa]sk[^\n]*explicitly[^\n]*wait/);
    match(wrapper, /[Rr]ecommendations are guidance only/);
    match(wrapper, /silence or a partial response/);
    match(wrapper, /free-form answers/);
  }
});

test("REC-002: collection stays local/static and uncertainty cannot invent obligations", () => {
  for (const token of ["Static local inspection", "explicit, bounded user approval", "Configured is not deployed", "tests present is not tests passed", "Confidence never upgrades an inference", "untrusted evidence", "Redact incidental secrets", "Available local history", "current source hashes", "3–7", "There is no two-batch total cap", "Before every question persist"]) ok(workflow.includes(token), token);
  for (const token of ["Do not invent", "synthetic", "scope: product-scope", "no-future-work", "future-work", "publication consent", "Unknowns"]) ok(shared.toLowerCase().includes(token.toLowerCase()), token);
});

test("REC-003: the four owners share bounded candidate authoring, not duplicate document formats", () => {
  for (const owner of ["product-document", "system-design", "deployment-operations", "project-planning"]) {
    const source = read(`.github/sddp/workflows/${owner}/WORKFLOW.md`);
    match(source, /EVIDENCE_INPUT/);
    ok(source.includes(".github/skills/evidence-led-authoring/SKILL.md"));
    match(source, /(?:staged|stage).*candidate/i);
  }
  match(workflow, /publication.*requires an explicit decision/i);
  match(workflow, /never a silently refreshed approval/i);
  match(workflow, /referenced\/completed epics go to `\/sddp-amend`/);
  match(shared, /Existing valid canonical inputs can be consumed without republishing/);
});

test("REC-004: lifecycle preserves baseline semantics, source layout, and custom DOD targets", () => {
  match(read(".github/sddp/workflows/init-project/WORKFLOW.md"), /Template placeholders select instruction `MODE`, not repository state/);
  match(read(".github/sddp/workflows/init-project/WORKFLOW.md"), /onboarding-state\.mjs layout/);
  const operations = read(".github/sddp/workflows/deployment-operations/WORKFLOW.md");
  match(operations, /Never write a shadow `specs\/dod\.md`/);
  match(operations, /validate-dod\.mjs/);
  match(read(".github/sddp/workflows/autopilot-pipeline/WORKFLOW.md"), /No planned epics/);
  match(read(".github/sddp/workflows/autopilot-pipeline/WORKFLOW.md"), /record-epic-completion\.mjs/);
  match(read(".github/sddp/workflows/prototype-regen/WORKFLOW.md"), /Zero actual epic checklist entries → \*\*HALT\*\* in every mode/);
  match(read(".github/sddp/workflows/amend-project/WORKFLOW.md"), /Preserve imported-baseline coverage/);
});
