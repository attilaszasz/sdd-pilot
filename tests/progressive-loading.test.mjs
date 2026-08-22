import { test } from "node:test";
import { doesNotMatch, match } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (relativePath) => readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

const implement = read("../.github/sddp/workflows/implement-tasks/WORKFLOW.md");
const selfHealing = read("../.github/sddp/workflows/implement-tasks/references/self-healing-amendments.md");
const microQc = read("../.github/sddp/workflows/implement-tasks/references/micro-qc.md");
const parallelBatches = read("../.github/sddp/workflows/implement-tasks/references/parallel-batches.md");
const implementPrompt = read("../.github/prompts/sddp-implement.prompt.md");
const autopilotPrompt = read("../.github/prompts/sddp-autopilot.prompt.md");
const softwareEngineer = read("../.github/agents/software-engineer.md");

test("PL-001: divergence amendments are handwritten and loaded only on Divergence", () => {
  match(implement, /one or more `Divergence` blocks.*read and execute `references\/self-healing-amendments\.md`/);
  match(implement, /Do not load that reference when no divergence was reported/);
  match(selfHealing, /Load condition.*only after the Developer returns `Status: SUCCESS` with one or more `Divergence` blocks/);
  match(selfHealing, /Re-parse `COVERAGE_MATRIX`/);
  match(selfHealing, /Delegate: ADR Author/);
  doesNotMatch(implement, /append one row per divergence to `FEATURE_DIR\/divergence-log\.md`/);
});

test("PL-002: Micro-QC is handwritten and loaded only for delivery phases", () => {
  match(implement, /Delivery work-item phase \(`\[US#\]`\/`\[OBJ#\]`\).*`references\/micro-qc\.md`/);
  match(implement, /Setup, Foundational, or Polish.*skip Micro-QC without loading the reference/);
  match(microQc, /Load condition.*only after Phase Review for a delivery work-item phase/);
  match(microQc, /Never load it for Setup, Foundational, or Polish phases/);
  match(microQc, /Delegate: QC Auditor/);
  doesNotMatch(implement, /`PHASE_END_FILES` = `git diff --name-only HEAD`/);
});

test("PL-003: parallel batching is handwritten and loaded only for consecutive P tasks", () => {
  match(implement, /consecutive incomplete `\[P\]` tasks.*`references\/parallel-batches\.md`/);
  match(implement, /Do not load it for ordinary sequential tasks/);
  match(parallelBatches, /Load condition.*only when the current phase contains consecutive incomplete `\[P\]` tasks/);
  match(parallelBatches, /producer first and then the consumer/);
  doesNotMatch(implement, /Group consecutive `\[P\]` tasks in the same phase into a batch/);
});

test("PL-004: Copilot prompts keep targets and remove duplicated inventories", () => {
  match(implementPrompt, /^agent: Software Engineer$/m);
  match(implementPrompt, /\.github\/sddp\/workflows\/implement-tasks\/WORKFLOW\.md/);
  doesNotMatch(implementPrompt, /Delegate:/);
  doesNotMatch(implementPrompt, /Report progress/);

  match(autopilotPrompt, /^agent: Software Engineer$/m);
  match(autopilotPrompt, /\.github\/sddp\/workflows\/autopilot-pipeline\/WORKFLOW\.md/);
  match(autopilotPrompt, /Set `AUTOPILOT = true`/);
  doesNotMatch(autopilotPrompt, /\*\*Specify\*\*/);
  doesNotMatch(autopilotPrompt, /^- \*\*Delegate:/m);
});

test("PL-005: shared Copilot agent does not override orchestration prompt targets", () => {
  match(softwareEngineer, /Never replace a canonical workflow named by the active prompt/);
  match(softwareEngineer, /Default only when the active prompt does not name another canonical workflow/);
  doesNotMatch(softwareEngineer, /^Implement all remaining tasks/m);
});
