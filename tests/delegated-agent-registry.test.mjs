import { test } from "node:test";
import { deepEqual, equal, ok } from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import { delegatedAgents, openCodeCoordinatorAgents, validateDelegatedAgentContracts } from "../scripts/lib/delegated-agents.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

test("DAR-001: delegated-agent contracts are complete, unique, and deeply immutable", () => {
  equal(delegatedAgents.length, 36);
  equal(delegatedAgents.filter((agent) => agent.kind === "methodology").length, 20);
  equal(delegatedAgents.filter((agent) => agent.kind === "role").length, 16);
  equal(new Set(delegatedAgents.map((agent) => agent.id)).size, delegatedAgents.length);
  equal(validateDelegatedAgentContracts(delegatedAgents, openCodeCoordinatorAgents).length, 0);
  ok(Object.isFrozen(delegatedAgents));
  for (const agent of delegatedAgents) {
    ok(Object.isFrozen(agent));
    ok(Object.isFrozen(agent.hosts));
    ok(Object.isFrozen(agent.requiredCapabilities));
    if (agent.executionPolicy) {
      ok(Object.isFrozen(agent.executionPolicy));
      if (agent.executionPolicy.claude) {
        ok(Object.isFrozen(agent.executionPolicy.claude));
        ok(Object.isFrozen(agent.executionPolicy.claude.tools));
      }
      if (agent.executionPolicy.codex) ok(Object.isFrozen(agent.executionPolicy.codex));
      ok(Object.isFrozen(agent.executionPolicy.opencode));
      if (typeof agent.executionPolicy.opencode.bash === "object") ok(Object.isFrozen(agent.executionPolicy.opencode.bash));
    }
  }
  for (const agent of openCodeCoordinatorAgents) {
    ok(Object.isFrozen(agent));
    ok(Object.isFrozen(agent.executionPolicy));
    ok(Object.isFrozen(agent.executionPolicy.opencode));
  }
});

test("DAR-002: registry identity and capabilities match every canonical agent", () => {
  const actualPaths = readdirSync(join(repoRoot, ".github/agents"))
    .filter((file) => file.endsWith(".md"))
    .map((file) => `.github/agents/${file}`)
    .sort();
  deepEqual(actualPaths, delegatedAgents.map((agent) => agent.canonicalPath).sort());

  for (const agent of delegatedAgents) {
    const source = readFileSync(join(repoRoot, agent.canonicalPath), "utf8");
    equal(source.match(/^name:\s*(.+?)\s*$/m)?.[1], agent.name, agent.id);
    const capabilities = [...(source.match(/^required-capabilities:\s*(.+?)\s*$/m)?.[1] ?? "").matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
    deepEqual(capabilities, agent.requiredCapabilities, agent.id);
    if (agent.kind === "role") ok(source.includes(`\`${agent.workflow}\``), `${agent.id}: ${agent.workflow}`);
  }
});

test("DAR-003: registry host paths characterize the supported delegated-agent inventories", () => {
  for (const agent of delegatedAgents) {
    for (const hostPath of Object.values(agent.hosts).filter(Boolean)) ok(existsSync(join(repoRoot, hostPath)), `${agent.id}: ${hostPath}`);
  }
  const expectedClaude = delegatedAgents.map((agent) => agent.hosts.claude).filter(Boolean).sort();
  const actualClaude = readdirSync(join(repoRoot, ".claude/agents")).filter((file) => file.endsWith(".md")).map((file) => `.claude/agents/${file}`).sort();
  deepEqual(actualClaude, expectedClaude);
  const expectedCodex = delegatedAgents.map((agent) => agent.hosts.codex).filter(Boolean).sort();
  const actualCodex = readdirSync(join(repoRoot, ".codex/agents")).filter((file) => file.endsWith(".toml")).map((file) => `.codex/agents/${file}`).sort();
  deepEqual(actualCodex, expectedCodex);
});

test("DAR-004: OpenCode inventory includes only registered delegated agents and coordinators", () => {
  equal(openCodeCoordinatorAgents.length, 2);
  ok(Object.isFrozen(openCodeCoordinatorAgents));
  const expected = [
    ...delegatedAgents.map((agent) => agent.hosts.opencode),
    ...openCodeCoordinatorAgents.map((agent) => agent.path),
  ].sort();
  const actual = readdirSync(join(repoRoot, ".opencode/agents")).filter((file) => file.endsWith(".md")).map((file) => `.opencode/agents/${file}`).sort();
  deepEqual(actual, expected);
});

test("DAR-005: malformed identities, kinds, targets, and duplicate paths fail closed", () => {
  const malformed = [
    { id: "Bad ID", name: "Bad", kind: "unknown", canonicalPath: "elsewhere.md", workflow: null, requiredCapabilities: [], hosts: {} },
    { id: "Bad ID", name: "Duplicate", kind: "role", canonicalPath: ".github/agents/Bad ID.md", workflow: "wrong", requiredCapabilities: ["bash/runCommand"], hosts: { copilot: "wrong", claude: "wrong", codex: "wrong", opencode: ".opencode/agents/shared.md" } },
    { id: "broken", name: "Broken", kind: "methodology", canonicalPath: ".github/agents/_broken.md", workflow: null, requiredCapabilities: [], executionPolicy: null, hosts: { copilot: ".github/agents/_broken.md", claude: ".claude/agents/sddp-broken.md", codex: ".codex/agents/sddp-broken.toml", opencode: ".opencode/agents/sddp-broken.md" } },
  ];
  const issues = validateDelegatedAgentContracts(malformed, [{ id: "duplicate", path: ".opencode/agents/shared.md", workflow: "wrong" }]);
  ok(issues.some((issue) => issue.startsWith("Invalid agent ID")));
  ok(issues.some((issue) => issue.startsWith("Duplicate agent ID")));
  ok(issues.some((issue) => issue.includes("unsupported kind")));
  ok(issues.some((issue) => issue.includes("invalid workflow target")));
  ok(issues.some((issue) => issue.includes("Duplicate agent host path")));
  ok(issues.some((issue) => issue.includes("invalid Claude tools")));
  ok(issues.some((issue) => issue.includes("invalid Codex sandbox mode")));
  ok(issues.some((issue) => issue.includes("invalid OpenCode policy")));
});

test("DAR-006: methodology execution policies preserve current host boundaries", () => {
  const methodology = delegatedAgents.filter((agent) => agent.kind === "methodology");
  equal(methodology.filter((agent) => agent.executionPolicy.codex.sandboxMode === "workspace-write").length, 13);
  equal(methodology.filter((agent) => agent.executionPolicy.codex.sandboxMode === "read-only").length, 7);
  equal(methodology.filter((agent) => agent.executionPolicy.opencode.edit === "allow").length, 13);
  equal(methodology.filter((agent) => agent.executionPolicy.opencode.bash === "allow").length, 7);
  equal(methodology.filter((agent) => agent.executionPolicy.claude.handoff === "structured-parent").length, 3);
  ok(methodology.every((agent) => agent.executionPolicy.opencode.task === "deny-all"));
});

test("DAR-007: role and coordinator execution policies preserve OpenCode boundaries", () => {
  const roles = delegatedAgents.filter((agent) => agent.kind === "role");
  equal(roles.filter((agent) => agent.executionPolicy.opencode.bash === "allow").length, 4);
  equal(roles.filter((agent) => agent.executionPolicy.opencode.bash === "deny").length, 11);
  equal(roles.filter((agent) => typeof agent.executionPolicy.opencode.bash === "object").length, 1);
  ok(roles.every((agent) => agent.executionPolicy.opencode.edit === "allow"));
  ok(roles.every((agent) => agent.executionPolicy.opencode.task === "workflow-reachable"));
  deepEqual(roles.find((agent) => agent.id === "solution-architect").executionPolicy.opencode.bash, {
    "*": "deny",
    "node scripts/validate-sad.mjs *": "allow",
  });
  ok(openCodeCoordinatorAgents.every((agent) => agent.executionPolicy.opencode.edit === "allow"));
  ok(openCodeCoordinatorAgents.every((agent) => agent.executionPolicy.opencode.bash === "allow"));
  ok(openCodeCoordinatorAgents.every((agent) => agent.executionPolicy.opencode.task === "workflow-reachable"));
});

test("DAR-008: malformed coordinator IDs fail closed", () => {
  const coordinator = {
    ...openCodeCoordinatorAgents[0],
    id: "Bad ID",
    path: ".opencode/agents/Bad ID.md",
  };
  const issues = validateDelegatedAgentContracts(delegatedAgents, [coordinator]);
  ok(issues.includes("Invalid OpenCode coordinator ID: Bad ID"));
});

test("DAR-009: duplicate coordinator IDs and delegated OpenCode identity collisions fail closed", () => {
  const duplicate = { ...openCodeCoordinatorAgents[0] };
  const delegatedCollision = {
    ...openCodeCoordinatorAgents[0],
    id: "sddp-developer",
    path: ".opencode/agents/sddp-developer.md",
  };
  const issues = validateDelegatedAgentContracts(delegatedAgents, [openCodeCoordinatorAgents[0], duplicate, delegatedCollision]);
  ok(issues.includes("Duplicate OpenCode coordinator ID: sddp-autopilot-pipeline"));
  ok(issues.includes("Duplicate OpenCode coordinator ID: sddp-developer"));
});

test("DAR-010: coordinator paths must exactly match their IDs", () => {
  const coordinator = {
    ...openCodeCoordinatorAgents[0],
    path: ".opencode/agents/wrong-id.md",
  };
  const issues = validateDelegatedAgentContracts(delegatedAgents, [coordinator]);
  ok(issues.includes("OpenCode coordinator sddp-autopilot-pipeline has an invalid path"));
});

test("DAR-011: coordinator workflows must target a complete workflow file", () => {
  const coordinator = {
    ...openCodeCoordinatorAgents[0],
    workflow: ".github/sddp/workflows/autopilot-pipeline/",
  };
  const issues = validateDelegatedAgentContracts(delegatedAgents, [coordinator]);
  ok(issues.includes("OpenCode coordinator sddp-autopilot-pipeline has an invalid workflow target"));
});
