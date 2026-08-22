import { test } from "node:test";
import { deepEqual, ok } from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { validateOpenCodeDelegateGraph, validateOpenCodeRegisteredAgentPolicies } from "../scripts/lib/opencode-delegate-graph.mjs";
import { publicCommands } from "../scripts/lib/public-commands.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "opencode-delegates-"));
  for (const relative of [".github/agents", ".github/sddp", ".github/skills", ".opencode/commands", ".opencode/agents", "opencode.json"]) {
    cpSync(join(repoRoot, relative), join(root, relative), { recursive: true });
  }
  return root;
}

function edit(root, relativePath, mutate) {
  const filePath = join(root, relativePath);
  writeFileSync(filePath, mutate(readFileSync(filePath, "utf8")));
}

test("ODR-001: all public OpenCode commands reach their canonical transitive delegates", async () => {
  const result = await validateOpenCodeDelegateGraph(repoRoot, publicCommands);
  deepEqual(result.findings, []);
  deepEqual(result.rows.map((row) => row.command), publicCommands.map((command) => command.command));
});

test("ODR-002: missing mappings, retargeted commands, denied tasks, extras, duplicates, and comments fail closed", async () => {
  const cases = [
    ["missing", ".opencode/commands/sddp-implement.md", (content) => content.replace("- **Delegate: Spec Validator** → invoke `sddp-spec-validator`\n", ""), /Missing delegate mappings: sddp-spec-validator/],
    ["comment", ".opencode/commands/sddp-implement.md", (content) => content.replace("- **Delegate: Spec Validator** → invoke `sddp-spec-validator`\n", "<!-- invoke `sddp-spec-validator` -->\n"), /Missing delegate mappings: sddp-spec-validator/],
    ["retargeted", ".opencode/commands/sddp-implement.md", (content) => content.replace("agent: build", "agent: sddp-developer"), /Selected agent sddp-developer cannot reach delegates/],
    ["denied", "opencode.json", (content) => content.replace('"sddp-spec-validator": "allow"', '"sddp-spec-validator": "deny"'), /Selected agent build cannot reach delegates: sddp-spec-validator/],
    ["extra", ".opencode/commands/sddp-plan.md", (content) => `${content}\n<!-- invoke \`sddp-developer\` -->\ninvoke \`sddp-developer\`\n`, /Unexpected delegate mappings: sddp-developer/],
    ["duplicate", ".opencode/commands/sddp-plan.md", (content) => `${content}\ninvoke \`sddp-adr-author\`\n`, /Duplicate delegate mappings: sddp-adr-author/],
  ];
  for (const [name, relativePath, mutate, expected] of cases) {
    const root = fixture();
    try {
      edit(root, relativePath, mutate);
      const result = await validateOpenCodeDelegateGraph(root, publicCommands);
      ok(result.findings.some((finding) => expected.test(finding.detail)), name);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("ODR-003: canonical Bash requirements fail closed when a wrapper denies Bash", async () => {
  const root = fixture();
  try {
    edit(root, ".opencode/agents/sddp-task-tracker.md", (content) => content.replace('bash: "allow"', 'bash: "deny"'));
    const result = await validateOpenCodeDelegateGraph(root, publicCommands);
    ok(result.findings.some((finding) => finding.command === "sddp-implement" && /sddp-task-tracker to allow Bash/.test(finding.detail)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ODR-004: registry capabilities remain authoritative when canonical prose drifts", async () => {
  const root = fixture();
  try {
    edit(root, ".github/agents/_task-tracker.md", (content) => content.replace("required-capabilities: ['bash/runCommand']\n", ""));
    edit(root, ".opencode/agents/sddp-task-tracker.md", (content) => content.replace('bash: "allow"', 'bash: "deny"'));
    const result = await validateOpenCodeDelegateGraph(root, publicCommands);
    ok(result.findings.some((finding) => finding.command === "sddp-implement" && /sddp-task-tracker to allow Bash/.test(finding.detail)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ODR-005: registered role and coordinator task grants match canonical workflow reachability", async () => {
  const result = await validateOpenCodeRegisteredAgentPolicies(repoRoot);
  deepEqual(result.findings, []);
  deepEqual(result.rows.map((row) => row.agent), [
    "sddp-business-analyst",
    "sddp-compliance-auditor",
    "sddp-devops-strategist",
    "sddp-devsetup",
    "sddp-product-manager",
    "sddp-product-strategist",
    "sddp-project-amender",
    "sddp-project-initializer",
    "sddp-project-manager",
    "sddp-project-planner",
    "sddp-prototype-retrospective-analyst",
    "sddp-qa-engineer",
    "sddp-qc-agent",
    "sddp-software-architect",
    "sddp-software-engineer",
    "sddp-solution-architect",
    "sddp-autopilot-pipeline",
    "sddp-implement-qc-loop",
  ]);
  deepEqual(result.rows.map((row) => row.expected.length), [4, 4, 1, 0, 4, 1, 3, 2, 4, 0, 3, 4, 4, 7, 12, 2, 19, 13]);
});

test("ODR-006: registered role and coordinator task-policy drift fails closed", async () => {
  const cases = [
    ["missing grant", ".opencode/agents/sddp-software-engineer.md", (content) => content.replace("    sddp-spec-validator: allow\n", ""), /Missing workflow-reachable task grants: sddp-spec-validator/],
    ["excess grant", ".opencode/agents/sddp-software-engineer.md", (content) => content.replace('    "*": deny\n', '    "*": deny\n    sddp-configuration-auditor: allow\n'), /Unexpected OpenCode task grants: sddp-configuration-auditor/],
    ["denied grant", ".opencode/agents/sddp-software-engineer.md", (content) => content.replace("    sddp-spec-validator: allow\n", "    sddp-spec-validator: deny\n"), /Missing workflow-reachable task grants: sddp-spec-validator/],
    ["missing coordinator grant", ".opencode/agents/sddp-autopilot-pipeline.md", (content) => content.replace("    sddp-spec-validator: allow\n", ""), /Missing workflow-reachable task grants: sddp-spec-validator/],
    ["open wildcard", ".opencode/agents/sddp-implement-qc-loop.md", (content) => content.replace('    "*": deny\n', '    "*": allow\n'), /OpenCode task policy must deny unregistered delegation/],
  ];
  for (const [name, relativePath, mutate, expected] of cases) {
    const root = fixture();
    try {
      edit(root, relativePath, mutate);
      const result = await validateOpenCodeRegisteredAgentPolicies(root);
      ok(result.findings.some((finding) => expected.test(finding.detail)), name);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});
