import { test } from "node:test";
import { ok, strictEqual } from "node:assert/strict";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { validateClaudeAgentGraph } from "../scripts/lib/claude-agent-graph.mjs";
import { delegatedAgents } from "../scripts/lib/delegated-agents.mjs";
import { publicCommands } from "../scripts/lib/public-commands.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

test("CAW-001: every delegated Claude agent has a valid wrapper and target", async () => {
  const result = await validateClaudeAgentGraph(repoRoot, publicCommands);
  strictEqual(result.findings.length, 0, result.findings.map((finding) => `${finding.agent}: ${finding.detail}`).join("\n"));
  strictEqual(result.rows.length, delegatedAgents.filter((agent) => agent.kind === "methodology").length);

  const byAgent = new Map(result.rows.map((row) => [row.agent, row]));
  strictEqual(byAgent.get("sddp-adversarial-scanner").target, ".github/agents/_adversarial-scanner.md");
  strictEqual(byAgent.get("sddp-plan-validator").target, ".github/agents/_plan-validator.md");
  strictEqual(byAgent.get("sddp-tasks-validator").target, ".github/agents/_tasks-validator.md");
});

test("CAW-002: missing wrappers and stale targets fail closed", async () => {
  const fixture = createFixture();
  try {
    rmSync(join(fixture, ".claude/agents/sddp-adversarial-scanner.md"));
    const planPath = join(fixture, ".claude/agents/sddp-plan-validator.md");
    writeFileSync(planPath, readFileSync(planPath, "utf8").replace("_plan-validator.md", "_tasks-validator.md"));

    const result = await validateClaudeAgentGraph(fixture, publicCommands);
    ok(result.findings.some((finding) => finding.agent === "sddp-adversarial-scanner" && finding.status === "missing"));
    ok(result.findings.some((finding) => finding.agent === "sddp-plan-validator" && finding.status === "stale-reference"));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("CAW-003: malformed frontmatter, excess tools, and missing handoff fail closed", async () => {
  const fixture = createFixture();
  try {
    const adversarialPath = join(fixture, ".claude/agents/sddp-adversarial-scanner.md");
    writeFileSync(adversarialPath, readFileSync(adversarialPath, "utf8").replace("tools: Read", "tools: Read, Write"));
    const planPath = join(fixture, ".claude/agents/sddp-plan-validator.md");
    writeFileSync(planPath, readFileSync(planPath, "utf8").replace(/\nDo not ask[\s\S]*$/, "\n"));
    const tasksPath = join(fixture, ".claude/agents/sddp-tasks-validator.md");
    writeFileSync(tasksPath, readFileSync(tasksPath, "utf8").replace("name: sddp-tasks-validator", "name: sddp-tasks-validator\nname: duplicate"));

    const result = await validateClaudeAgentGraph(fixture, publicCommands);
    ok(result.findings.some((finding) => finding.agent === "sddp-adversarial-scanner" && /Expected tools/.test(finding.detail)));
    ok(result.findings.some((finding) => finding.agent === "sddp-plan-validator" && /handoff/.test(finding.detail)));
    ok(result.findings.some((finding) => finding.agent === "sddp-tasks-validator" && /frontmatter/.test(finding.detail)));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("CAW-004: canonical Bash requirements fail closed when a wrapper omits Bash", async () => {
  const fixture = createFixture();
  try {
    const trackerPath = join(fixture, ".claude/agents/sddp-task-tracker.md");
    writeFileSync(trackerPath, readFileSync(trackerPath, "utf8").replace(", Bash", ""));

    const result = await validateClaudeAgentGraph(fixture, publicCommands);
    ok(result.findings.some((finding) => finding.agent === "sddp-task-tracker" && /capability requires Claude Bash/.test(finding.detail)));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("CAW-005: registry capabilities remain authoritative when canonical prose drifts", async () => {
  const fixture = createFixture();
  try {
    const canonicalPath = join(fixture, ".github/agents/_task-tracker.md");
    writeFileSync(canonicalPath, readFileSync(canonicalPath, "utf8").replace("required-capabilities: ['bash/runCommand']\n", ""));
    const trackerPath = join(fixture, ".claude/agents/sddp-task-tracker.md");
    writeFileSync(trackerPath, readFileSync(trackerPath, "utf8").replace(", Bash", ""));

    const result = await validateClaudeAgentGraph(fixture, publicCommands);
    ok(result.findings.some((finding) => finding.agent === "sddp-task-tracker" && /capability requires Claude Bash/.test(finding.detail)));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("CAW-006: registry tool profiles apply to every methodology agent", async () => {
  const fixture = createFixture();
  try {
    const contextPath = join(fixture, ".claude/agents/sddp-context-gatherer.md");
    writeFileSync(contextPath, readFileSync(contextPath, "utf8").replace(", Glob", ""));
    const result = await validateClaudeAgentGraph(fixture, publicCommands);
    ok(result.findings.some((finding) => finding.agent === "sddp-context-gatherer" && /Expected tools/.test(finding.detail)));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

function createFixture() {
  const fixture = mkdtempSync(join(tmpdir(), "claude-agents-"));
  mkdirSync(join(fixture, ".claude"), { recursive: true });
  mkdirSync(join(fixture, ".github"), { recursive: true });
  cpSync(join(repoRoot, ".claude/agents"), join(fixture, ".claude/agents"), { recursive: true });
  cpSync(join(repoRoot, ".claude/skills"), join(fixture, ".claude/skills"), { recursive: true });
  cpSync(join(repoRoot, ".github/agents"), join(fixture, ".github/agents"), { recursive: true });
  return fixture;
}
