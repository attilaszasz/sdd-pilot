import { test } from "node:test";
import { deepEqual, equal, ok } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { collectCanonicalWorkflowGraph } from "../scripts/lib/canonical-workflow-graph.mjs";
import { publicCommands } from "../scripts/lib/public-commands.mjs";
import { delegatedAgents } from "../scripts/lib/delegated-agents.mjs";
import { commandSurfaces, validateWrapperInventory } from "../scripts/lib/wrapper-inventory.mjs";
import { summarizeReport } from "../scripts/drift-report.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const analyzeMutationPolicy = publicCommands.find((command) => command.command === "sddp-analyze").mutationPolicy;
const prdCommand = publicCommands.find((command) => command.command === "sddp-prd");
const prdDescriptionLine = `Command description: ${prdCommand.description}`;
const prdArgumentHintLine = `Argument hint: \`${prdCommand.arguments.hint}\``;
const prdCategoryLine = `Command category: \`${prdCommand.category}\``;
const projectPlanCommand = publicCommands.find((command) => command.command === "sddp-projectplan");
const projectPlanPrerequisitesLine = `Prerequisites: ${projectPlanCommand.prerequisites.map((prerequisite) => `\`${prerequisite}\``).join(", ")}`;

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "drift-inventory-"));
  for (const relative of [".github/prompts", ".github/agents", ".claude/skills", ".claude/agents", ".agents/skills", ".agents/workflows", ".opencode/commands", ".opencode/agents", ".windsurf/workflows", ".codex/agents", ".vscode/settings.json"]) {
    cpSync(join(repoRoot, relative), join(root, relative), { recursive: true });
  }
  return root;
}

test("DRI-001: every public command has exactly one wrapper on every claimed surface", async () => {
  const result = await validateWrapperInventory(repoRoot, publicCommands);
  equal(result.findings.length, 0, result.findings.map((finding) => finding.detail).join("\n"));
  for (const surface of commandSurfaces) equal(result.rows.filter((row) => row.surface === surface.key).length, publicCommands.length);
});

test("DRI-002: missing, extra, stale alias, and malformed wrappers fail closed", async () => {
  const root = fixture();
  try {
    rmSync(join(root, ".github/prompts/sddp-prd.prompt.md"));
    writeFileSync(join(root, ".opencode/commands/sddp-extra.md"), "---\ndescription: extra\n---\n");
    writeFileSync(join(root, ".agents/skills/sddp-prd/SKILL.md"), "---\nname: sddp-prd\nname: duplicate\n---\n");
    writeFileSync(join(root, ".codex/agents/sddp-context-gatherer.toml"), "name = \"duplicate\"\nname = \"duplicate\"\n");
    const result = await validateWrapperInventory(root, publicCommands);
    ok(result.findings.some((finding) => finding.status === "missing"));
    ok(result.findings.some((finding) => finding.status === "unsupported-extra" && finding.surface === "OpenCode"));
    ok(result.findings.some((finding) => finding.status === "normalized-drift" && finding.surface === "Codex"));
    ok(result.findings.some((finding) => finding.status === "normalized-drift" && finding.surface === "Codex Agent"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("DRI-003: malformed and stale Codex TOML fails closed", async () => {
  const root = fixture();
  try {
    const target = join(root, ".codex/agents/sddp-context-gatherer.toml");
    writeFileSync(target, readFileSync(target, "utf8").replace("_context-gatherer.md", "_task-tracker.md"));
    const result = await validateWrapperInventory(root, publicCommands);
    ok(result.findings.some((finding) => finding.surface === "Codex Agent" && /TOML/.test(finding.detail)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("DRI-006: Copilot recommendations match the public-command inventory", async () => {
  const root = fixture();
  try {
    const target = join(root, ".vscode/settings.json");
    const settings = readFileSync(target, "utf8");
    writeFileSync(target, settings
      .replace('        "sddp-regen": true,\n', "")
      .replace('        "sddp-prd": true,', '        "sddp-prd": false,\n        "sddp-prd": true,')
      .replace('        "sddp-systemdesign": true,', '        "sddp-systemdesign": true,\n        "sddp-extra": true,'));
    const result = await validateWrapperInventory(root, publicCommands);
    ok(result.findings.some((finding) => finding.surface === "Copilot Recommendation" && finding.status === "normalized-drift" && /duplicate JSONC key/.test(finding.detail)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("DRI-007: complete wrapper documents reject malformed syntax, types, and unsupported metadata", async () => {
  const cases = [
    [".vscode/settings.json", (source) => source.replace(/^\{/, ""), "Malformed Copilot JSONC"],
    [".vscode/settings.json", (source) => source.replace(/\}\s*$/, ""), "Malformed Copilot JSONC"],
    [".vscode/settings.json", (source) => source.replace('"sddp-prd": true', '"sddp-prd": [true]'), "Malformed Copilot JSONC"],
    [".vscode/settings.json", (source) => source.replace('"sddp-prd": true,', '"sddp-prd": true,\n        "sddp-prd": true,'), "duplicate JSONC key"],
    [".opencode/commands/sddp-prd.md", (source) => source.replace("agent: build", "agent: [build]"), "unsupported YAML scalar"],
    [".opencode/commands/sddp-prd.md", (source) => source.replace("agent: build", "agent: build\nagent: build"), "duplicate YAML key"],
    [".opencode/commands/sddp-prd.md", (source) => source.replace("subtask: false", "unknown: value\nsubtask: false"), "unsupported metadata"],
    [".claude/skills/sddp-prd/SKILL.md", (source) => source.replace("disable-model-invocation: true", "disable-model-invocation: false"), "User-only invocation requires disable-model-invocation: true"],
    [".agents/skills/sddp-prd/SKILL.md", (source) => source.replace("Direct command-bar dispatch only; do not select for general queries.", ""), "User-only invocation requires the direct-command description guard"],
    [".opencode/commands/sddp-prd.md", (source) => source.replace("subtask: false", "subtask: true"), "User-only invocation requires subtask: false"],
    [".github/prompts/sddp-analyze.prompt.md", (source) => source.replace(analyzeMutationPolicy, ""), "Conditional-write wrapper is missing its metadata mutation policy"],
    [".claude/skills/sddp-analyze/SKILL.md", (source) => source.replace(analyzeMutationPolicy, ""), "Conditional-write wrapper is missing its metadata mutation policy"],
    [".agents/skills/sddp-analyze/SKILL.md", (source) => source.replace(analyzeMutationPolicy, ""), "Conditional-write wrapper is missing its metadata mutation policy"],
    [".agents/workflows/sddp-analyze.md", (source) => source.replace(analyzeMutationPolicy, ""), "Conditional-write wrapper is missing its metadata mutation policy"],
    [".opencode/commands/sddp-analyze.md", (source) => source.replace(analyzeMutationPolicy, ""), "Conditional-write wrapper is missing its metadata mutation policy"],
    [".windsurf/workflows/sddp-analyze.md", (source) => source.replace(analyzeMutationPolicy, ""), "Conditional-write wrapper is missing its metadata mutation policy"],
    [".github/prompts/sddp-prd.prompt.md", (source) => source.replace(prdDescriptionLine, "Command description: stale"), "Wrapper body metadata must match public command metadata: Command description"],
    [".claude/skills/sddp-prd/SKILL.md", (source) => source.replace(prdCommand.description, "stale"), "Wrapper metadata description must match public command metadata"],
    [".agents/skills/sddp-prd/SKILL.md", (source) => source.replace(prdCommand.description, "stale"), "Wrapper metadata description must match public command metadata"],
    [".agents/workflows/sddp-prd.md", (source) => source.replace(prdCommand.description, "stale"), "Wrapper metadata description must match public command metadata"],
    [".opencode/commands/sddp-prd.md", (source) => source.replace(prdCommand.description, "stale"), "Wrapper metadata description must match public command metadata"],
    [".windsurf/workflows/sddp-prd.md", (source) => source.replace(prdDescriptionLine, "Command description: stale"), "Wrapper body metadata must match public command metadata: Command description"],
    [".github/prompts/sddp-prd.prompt.md", (source) => source.replace(prdArgumentHintLine, "Argument hint: `stale`"), "Wrapper body metadata must match public command metadata: Argument hint"],
    [".claude/skills/sddp-prd/SKILL.md", (source) => source.replace(prdCommand.arguments.hint, "stale"), "Wrapper metadata argument-hint must match public command metadata"],
    [".agents/skills/sddp-prd/SKILL.md", (source) => source.replace(prdArgumentHintLine, "Argument hint: `stale`"), "Wrapper body metadata must match public command metadata: Argument hint"],
    [".agents/workflows/sddp-prd.md", (source) => source.replace(prdArgumentHintLine, "Argument hint: `stale`"), "Wrapper body metadata must match public command metadata: Argument hint"],
    [".opencode/commands/sddp-prd.md", (source) => source.replace(prdArgumentHintLine, "Argument hint: `stale`"), "Wrapper body metadata must match public command metadata: Argument hint"],
    [".windsurf/workflows/sddp-prd.md", (source) => source.replace(prdArgumentHintLine, "Argument hint: `stale`"), "Wrapper body metadata must match public command metadata: Argument hint"],
    [".github/prompts/sddp-prd.prompt.md", (source) => source.replace(prdCategoryLine, "Command category: `stale`"), "Wrapper body metadata must match public command metadata: Command category"],
    [".claude/skills/sddp-prd/SKILL.md", (source) => source.replace(prdCategoryLine, "Command category: `stale`"), "Wrapper body metadata must match public command metadata: Command category"],
    [".agents/skills/sddp-prd/SKILL.md", (source) => source.replace(prdCategoryLine, "Command category: `stale`"), "Wrapper body metadata must match public command metadata: Command category"],
    [".agents/workflows/sddp-prd.md", (source) => source.replace(prdCategoryLine, "Command category: `stale`"), "Wrapper body metadata must match public command metadata: Command category"],
    [".opencode/commands/sddp-prd.md", (source) => source.replace(prdCategoryLine, "Command category: `stale`"), "Wrapper body metadata must match public command metadata: Command category"],
    [".windsurf/workflows/sddp-prd.md", (source) => source.replace(prdCategoryLine, "Command category: `stale`"), "Wrapper body metadata must match public command metadata: Command category"],
    [".github/prompts/sddp-projectplan.prompt.md", (source) => source.replace(projectPlanPrerequisitesLine, "Prerequisites: `stale`"), "Wrapper body metadata must match public command metadata: Prerequisites"],
    [".claude/skills/sddp-projectplan/SKILL.md", (source) => source.replace(projectPlanPrerequisitesLine, "Prerequisites: `stale`"), "Wrapper body metadata must match public command metadata: Prerequisites"],
    [".agents/skills/sddp-projectplan/SKILL.md", (source) => source.replace(projectPlanPrerequisitesLine, "Prerequisites: `stale`"), "Wrapper body metadata must match public command metadata: Prerequisites"],
    [".agents/workflows/sddp-projectplan.md", (source) => source.replace(projectPlanPrerequisitesLine, "Prerequisites: `stale`"), "Wrapper body metadata must match public command metadata: Prerequisites"],
    [".opencode/commands/sddp-projectplan.md", (source) => source.replace(projectPlanPrerequisitesLine, "Prerequisites: `stale`"), "Wrapper body metadata must match public command metadata: Prerequisites"],
    [".windsurf/workflows/sddp-projectplan.md", (source) => source.replace(projectPlanPrerequisitesLine, "Prerequisites: `stale`"), "Wrapper body metadata must match public command metadata: Prerequisites"],
    [".codex/agents/sddp-context-gatherer.toml", (source) => `${source}\n[unterminated`, "invalid TOML syntax"],
    [".codex/agents/sddp-context-gatherer.toml", (source) => source.replace('description = "', 'description = "\\q'), "invalid TOML string"],
    [".codex/agents/sddp-context-gatherer.toml", (source) => source.replace(/\n"""\s*$/, "\nunterminated"), "unterminated TOML multiline string"],
    [".codex/agents/sddp-context-gatherer.toml", (source) => source.replace('name = "sddp_context_gatherer"', 'name = ["sddp_context_gatherer"]'), "unsupported TOML value"],
  ];
  for (const [relative, mutate, expected] of cases) {
    const root = fixture();
    try {
      const target = join(root, relative);
      writeFileSync(target, mutate(readFileSync(target, "utf8")));
      const result = await validateWrapperInventory(root, publicCommands);
      ok(result.findings.some((finding) => finding.status === "normalized-drift" && finding.detail.includes(expected)), `${relative}: ${expected}\n${result.findings.map((finding) => finding.detail).join("\n")}`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("DRI-004: missing transitive references fail the canonical graph", async () => {
  const root = mkdtempSync(join(tmpdir(), "drift-graph-"));
  try {
    const workflow = join(root, ".github/sddp/workflows/root/WORKFLOW.md");
    mkdirSync(dirname(workflow), { recursive: true });
    writeFileSync(workflow, "Read and execute `references/missing.md`.\n");
    const result = await collectCanonicalWorkflowGraph(root, [{ command: "root", canonicalWorkflow: ".github/sddp/workflows/root/WORKFLOW.md" }]);
    ok(result.findings.some((finding) => /Missing or invalid reachable document/.test(finding.detail)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("DRI-005: summary counts matrix cells and independent findings", () => {
  const workflowRows = [{ id: "one", surfaces: { copilot: { status: "in-sync" }, claude: { status: "missing" } } }];
  const agentRows = [{ id: "agent", surfaces: { openCodeAgent: { status: "in-sync" }, codex: { status: "n/a" } } }];
  const summary = summarizeReport(workflowRows, agentRows, [{ status: "unsupported-extra", scope: "workflow", surface: "Inventory", row: "extra" }]);
  equal(summary.byStatus["in-sync"], 2);
  equal(summary.byStatus.missing, 1);
  equal(summary.byStatus["n/a"], 1);
  equal(summary.byStatus["unsupported-extra"], 1);
});

test("DRI-008: canonical entries stay in the workflow root while support skills remain reachable", async () => {
  const root = mkdtempSync(join(tmpdir(), "drift-roots-"));
  try {
    const workflow = join(root, ".github/sddp/workflows/root/WORKFLOW.md");
    const supportSkill = join(root, ".github/skills/support/SKILL.md");
    mkdirSync(dirname(workflow), { recursive: true });
    mkdirSync(dirname(supportSkill), { recursive: true });
    writeFileSync(workflow, "Read `.github/skills/support/SKILL.md`.\n");
    writeFileSync(supportSkill, "Read and execute `references/missing.md`.\n");

    const reachable = await collectCanonicalWorkflowGraph(root, [{ command: "root", canonicalWorkflow: ".github/sddp/workflows/root/WORKFLOW.md" }]);
    ok(reachable.findings.some((finding) => /Missing or invalid reachable document/.test(finding.detail)));

    const invalidEntry = await collectCanonicalWorkflowGraph(root, [{ command: "support", canonicalWorkflow: ".github/skills/support/SKILL.md" }]);
    ok(invalidEntry.findings.some((finding) => /entry escapes workflow root/.test(finding.detail)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("DRI-009: generated reports expose command and delegated-agent registry metadata", () => {
  const output = mkdtempSync(join(tmpdir(), "drift-report-metadata-"));
  try {
    const result = spawnSync(process.execPath, [join(repoRoot, "scripts/drift-report.mjs"), "--output", output, "--strict"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    equal(result.status, 0, result.stderr || result.stdout);

    const report = JSON.parse(readFileSync(join(output, "drift-report.json"), "utf8"));
    const projectPlan = report.workflowRows.find((row) => row.id === "sddp-projectplan");
    equal(projectPlan.category, projectPlanCommand.category);
    deepEqual(projectPlan.prerequisites, projectPlanCommand.prerequisites);
    deepEqual(report.agentRows.map((row) => row.id), delegatedAgents.map((agent) => agent.id));
    const planValidator = report.agentRows.find((row) => row.id === "plan-validator");
    equal(planValidator.kind, "methodology");
    equal(planValidator.name, "PlanValidator");
    deepEqual(planValidator.requiredCapabilities, ["bash/runCommand"]);
    equal(planValidator.executionPolicy.codex.sandboxMode, "workspace-write");
    deepEqual(planValidator.executionPolicy.claude.tools, ["Read", "Bash"]);
    equal(planValidator.executionPolicy.opencode.task, "deny-all");
    deepEqual(planValidator.registryIssues, []);

    const markdown = readFileSync(join(output, "drift-report.md"), "utf8");
    ok(markdown.includes("| Workflow | Category | Prerequisites | Canonical Workflow |"));
    ok(markdown.includes("| sddp-projectplan | project-bootstrap | product-document:planning-ready<br>technical-context:planning-ready |"));
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});

test("DRI-010: host inventory expectations do not depend on canonical directory discovery", async () => {
  const root = fixture();
  try {
    rmSync(join(root, ".github/agents/_plan-validator.md"));
    const result = await validateWrapperInventory(root, publicCommands);
    equal(result.findings.length, 0, result.findings.map((finding) => finding.detail).join("\n"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
