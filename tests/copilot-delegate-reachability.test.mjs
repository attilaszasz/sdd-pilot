import { test } from "node:test";
import { deepEqual, match, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { missingCopilotDelegates, validateCopilotDelegateGraph } from "../scripts/lib/copilot-delegate-graph.mjs";
import { publicCommands } from "../scripts/lib/public-commands.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const read = (relativePath) => readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");

test("CDR-001: every public Copilot prompt has an explicit agent and complete transitive delegate graph", async () => {
  const result = await validateCopilotDelegateGraph(repoRoot, publicCommands);
  deepEqual(result.findings, []);
  deepEqual(result.rows.map((row) => row.command), publicCommands.map((command) => command.command));
});

test("CDR-002: all mandatory validators are reachable from their invoking commands", async () => {
  const { rows } = await validateCopilotDelegateGraph(repoRoot, publicCommands);
  const byCommand = new Map(rows.map((row) => [row.command, row.reachableAgents]));
  ok(byCommand.get("sddp-plan").includes("SpecValidator"));
  ok(byCommand.get("sddp-tasks").includes("PlanValidator"));
  for (const validator of ["SpecValidator", "PlanValidator", "TasksValidator"]) {
    ok(byCommand.get("sddp-implement").includes(validator));
    ok(byCommand.get("sddp-autopilot").includes(validator));
  }
});

test("CDR-003: Autopilot reaches every delegate exposed by its inline pipeline", async () => {
  const { rows } = await validateCopilotDelegateGraph(repoRoot, publicCommands);
  const autopilot = rows.find((row) => row.command === "sddp-autopilot");
  deepEqual(autopilot.reachableAgents, [
    "ADRAuthor", "APIDesigner", "AdversarialScanner", "ChecklistReader", "ContextGatherer",
    "DatabaseAdministrator", "Developer", "PlanValidator", "PolicyAuditor", "QCAuditor",
    "RequirementsScanner", "SpecValidator", "StoryVerifier", "TaskTracker", "TasksValidator",
    "TechnicalResearcher", "TestEvaluator", "TestPlanner", "WBSGenerator",
  ].sort());
});

test("CDR-004: removing any reachable role is detected", async () => {
  const { rows } = await validateCopilotDelegateGraph(repoRoot, publicCommands);
  const reachable = rows.find((row) => row.command === "sddp-autopilot").reachableAgents;
  const agent = read(".github/agents/software-engineer.md").replace("'TasksValidator', ", "");
  match(missingCopilotDelegates(agent, reachable).join(","), /TasksValidator/);
});

test("CDR-005: prompts do not rely on implicit self-performance fallback", () => {
  for (const command of publicCommands) {
    const prompt = read(`.github/prompts/${command.command}.prompt.md`);
    ok(!/perform the task yourself|execute the delegated work/i.test(prompt), command.command);
  }
});
