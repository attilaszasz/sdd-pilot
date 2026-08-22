import { test } from "node:test";
import { match } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (relativePath) => readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

const commandParents = [
  {
    command: "clarify",
    workflow: "../.github/sddp/workflows/clarify-spec/WORKFLOW.md",
    requiredCommand: "node scripts/parse-stress-test-findings.mjs",
    copilot: "../.github/agents/business-analyst.md",
    claude: "../.claude/skills/sddp-clarify/SKILL.md",
  },
  {
    command: "tasks",
    workflow: "../.github/sddp/workflows/generate-tasks/WORKFLOW.md",
    requiredCommand: "node scripts/parse-requirement-ownership.mjs",
    copilot: "../.github/agents/project-manager.md",
    claude: "../.claude/skills/sddp-tasks/SKILL.md",
  },
  {
    command: "checklist",
    workflow: "../.github/sddp/workflows/generate-checklist/WORKFLOW.md",
    requiredCommand: "node scripts/checklist-state.mjs",
    copilot: "../.github/agents/qa-engineer.md",
    claude: "../.claude/skills/sddp-checklist/SKILL.md",
  },
];

test("CPC-001: command parents can execute their mandatory canonical commands", () => {
  for (const parent of commandParents) {
    match(read(parent.workflow), new RegExp(parent.requiredCommand.replaceAll(".", "\\.")), `${parent.command} lost its mandatory command`);
    match(read(parent.copilot), /tools: \[[^\n]*'execute\/runInTerminal'[^\n]*'execute\/getTerminalOutput'/, `${parent.command} Copilot parent cannot execute commands`);
    match(read(parent.claude), /^allowed-tools:[^\n]*\bBash\b/m, `${parent.command} Claude parent cannot execute commands`);
  }
});
