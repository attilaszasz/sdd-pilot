import { test } from "node:test";
import { equal, ok } from "node:assert/strict";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { collectCanonicalWorkflowGraph } from "../scripts/lib/canonical-workflow-graph.mjs";
import { publicCommands } from "../scripts/lib/public-commands.mjs";
import { commandSurfaces, validateWrapperInventory } from "../scripts/lib/wrapper-inventory.mjs";
import { summarizeReport } from "../scripts/drift-report.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

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
    const skill = join(root, ".github/skills/root/SKILL.md");
    mkdirSync(dirname(skill), { recursive: true });
    writeFileSync(skill, "Read and execute `references/missing.md`.\n");
    const result = await collectCanonicalWorkflowGraph(root, [{ command: "root", skill: "root" }]);
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
