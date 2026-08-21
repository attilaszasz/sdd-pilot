import { test } from "node:test";
import { match, ok, strictEqual } from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { publicCommands } from "../scripts/lib/public-commands.mjs";
import { validateCodexDelegateGraph } from "../scripts/lib/codex-delegate-graph.mjs";

const repoPath = (relativePath) => fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
const read = (relativePath) => readFileSync(repoPath(relativePath), "utf8");

const interactiveCommands = new Set([
  "sddp-amend",
  "sddp-checklist",
  "sddp-clarify",
  "sddp-devops",
  "sddp-implement",
  "sddp-implement-qc-loop",
  "sddp-init",
  "sddp-plan",
  "sddp-prd",
  "sddp-qc",
  "sddp-regen",
  "sddp-specify",
  "sddp-systemdesign",
]);

test("CWC-001: every public command has one directly editable Codex wrapper", () => {
  strictEqual(publicCommands.length, 18);

  for (const command of publicCommands) {
    const relativePath = `.agents/skills/${command.command}/SKILL.md`;
    ok(existsSync(repoPath(relativePath)), `missing ${relativePath}`);

    const wrapper = read(relativePath);
    match(wrapper, new RegExp(`^name: ${command.command}$`, "m"));
    match(wrapper, new RegExp(command.canonicalWorkflow.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    match(wrapper, /Report[^\n]*progress/i);
  }
});

test("CWC-002: Codex wrappers preserve interaction and host-specific behavior", () => {
  for (const command of publicCommands) {
    const wrapper = read(`.agents/skills/${command.command}/SKILL.md`);
    if (interactiveCommands.has(command.command)) {
      match(wrapper, /Ask the user explicitly in chat and wait for the reply/);
      match(wrapper, /do not choose it on the user's behalf/i);
    }
  }

  match(read(".agents/skills/sddp-autopilot/SKILL.md"), /real unattended execution/);
  match(read(".agents/skills/sddp-autopilot/SKILL.md"), /never prompt the user/);
  match(read(".agents/skills/sddp-devsetup/SKILL.md"), /installation, mutation, or destructive commands require explicit user confirmation/);
  match(read(".agents/skills/sddp-qc/SKILL.md"), /does not declare a native browser tool/);
});

test("CWC-003: Codex delegation follows canonical paths without duplicate inventories", () => {
  for (const command of publicCommands) {
    const wrapper = read(`.agents/skills/${command.command}/SKILL.md`);
    ok(!/^- \*\*Delegate:/m.test(wrapper), `${command.command} duplicates the canonical delegate inventory`);

    const canonical = read(command.canonicalWorkflow);
    for (const match of canonical.matchAll(/`(\.github\/agents\/_?[a-z0-9-]+\.md)`/g)) {
      ok(existsSync(repoPath(match[1])), `${command.workflow} references missing ${match[1]}`);
    }
  }

  const driftReport = read("scripts/drift-report.mjs");
  match(driftReport, /const expectedDelegates = extractCanonicalDelegateIds\(canonicalContent\)/);
  ok(!/baselineDocument\.exists\s*\?\s*baselineDocument\.delegates/.test(driftReport));
});

test("CWC-004: every public Codex entry recursively resolves one exact delegate file", async () => {
  const result = await validateCodexDelegateGraph(repoPath("."), publicCommands);
  strictEqual(result.findings.length, 0, result.findings.map((finding) => `${finding.command}: ${finding.detail}`).join("\n"));

  const byCommand = new Map(result.rows.map((row) => [row.command, row]));
  ok(byCommand.get("sddp-qc").delegates.includes(".github/agents/_story-verifier.md"));
  ok(byCommand.get("sddp-clarify").delegates.includes(".github/agents/_adversarial-scanner.md"));
  ok(byCommand.get("sddp-checklist").delegates.includes(".github/agents/_test-evaluator.md"));
  ok(byCommand.get("sddp-implement-qc-loop").delegates.includes(".github/agents/_tasks-validator.md"));
  ok(byCommand.get("sddp-autopilot").delegates.includes(".github/agents/_developer.md"));
});

test("CWC-005: recursive resolution fails closed on missing, stale, and ambiguous delegates", async () => {
  const root = mkdtempSync(join(tmpdir(), "codex-delegates-"));
  try {
    mkdirSync(join(root, ".github/agents"), { recursive: true });
    mkdirSync(join(root, ".github/sddp/workflows/root/references"), { recursive: true });
    writeFileSync(join(root, ".github/agents/_alpha.md"), "---\nname: Alpha\n---\n");
    writeFileSync(join(root, ".github/agents/_alpha-copy.md"), "---\nname: Alpha\n---\n");
    writeFileSync(join(root, ".github/agents/_beta.md"), "---\nname: Beta\n---\n");
    writeFileSync(join(root, ".github/sddp/workflows/root/WORKFLOW.md"), "Read and execute `references/nested.md`.\n");
    writeFileSync(join(root, ".github/sddp/workflows/root/references/nested.md"), [
      "**Delegate: Alpha** (`.github/agents/_alpha.md`)",
      "**Delegate: Beta** (`.github/agents/_alpha.md`)",
      "**Delegate: Missing**",
    ].join("\n"));

    const result = await validateCodexDelegateGraph(root, [{ command: "root", canonicalWorkflow: ".github/sddp/workflows/root/WORKFLOW.md" }]);
    ok(result.findings.some((finding) => /Ambiguous delegate name Alpha/.test(finding.detail)));
    ok(result.findings.some((finding) => /Delegate Beta resolves to .*_beta\.md, not .*_alpha\.md/.test(finding.detail)));
    ok(result.findings.some((finding) => /Delegate Missing must reference exactly one canonical agent path; found 0/.test(finding.detail)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CWC-006: recursive resolution handles cycles and ignores fenced examples", async () => {
  const root = mkdtempSync(join(tmpdir(), "codex-delegates-"));
  try {
    mkdirSync(join(root, ".github/agents"), { recursive: true });
    mkdirSync(join(root, ".github/sddp/workflows/root/references"), { recursive: true });
    writeFileSync(join(root, ".github/agents/_alpha.md"), "---\nname: Alpha\n---\n");
    writeFileSync(join(root, ".github/sddp/workflows/root/WORKFLOW.md"), "Read and execute `references/nested.md`.\n");
    writeFileSync(join(root, ".github/sddp/workflows/root/references/nested.md"), [
      "Read and execute `../WORKFLOW.md`.",
      "**Delegate: Alpha** (`.github/agents/_alpha.md`)",
      "```markdown",
      "**Delegate: Missing**",
      "```",
    ].join("\n"));

    const result = await validateCodexDelegateGraph(root, [{ command: "root", canonicalWorkflow: ".github/sddp/workflows/root/WORKFLOW.md" }]);
    strictEqual(result.findings.length, 0);
    strictEqual(result.rows[0].visited.length, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
