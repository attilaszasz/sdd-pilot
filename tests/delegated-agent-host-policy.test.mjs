import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";

import {
  compareDeclaredTargets,
  compareWorkflowTaskGrants,
  diffHostExecutionPolicy,
  effectiveTaskAction,
  missingHostCapabilities,
  requiredCapabilitiesFor,
} from "../scripts/lib/delegated-agent-host-policy.mjs";

test("DAH-001: registered capabilities override synthetic fallback capabilities", () => {
  const contract = { requiredCapabilities: ["bash/runCommand"] };
  deepEqual(requiredCapabilitiesFor({ contract, fallbackCapabilities: [] }), ["bash/runCommand"]);
  deepEqual(requiredCapabilitiesFor({ contract: null, fallbackCapabilities: ["fallback"] }), ["fallback"]);
});

test("DAH-002: capability bindings retain host-specific Bash semantics", () => {
  deepEqual(missingHostCapabilities({ host: "claude", requiredCapabilities: ["bash/runCommand"], actual: { tools: ["Read"] } }), ["bash/runCommand"]);
  deepEqual(missingHostCapabilities({ host: "opencode", requiredCapabilities: ["bash/runCommand"], actual: { bash: "deny" } }), ["bash/runCommand"]);
  deepEqual(missingHostCapabilities({ host: "codex", requiredCapabilities: ["bash/runCommand"], actual: {} }), []);
});

test("DAH-003: Claude and Codex comparisons preserve exact host policy", () => {
  deepEqual(diffHostExecutionPolicy({
    host: "claude",
    expected: { tools: ["Read", "Bash"], handoff: null },
    actual: { tools: ["Bash", "Read"], handoff: "structured-parent" },
  }).map((diff) => diff.field), ["tools", "handoff"]);
  deepEqual(diffHostExecutionPolicy({ host: "codex", expected: { sandboxMode: "read-only" }, actual: { sandboxMode: "workspace-write" } }).map((diff) => diff.field), ["sandboxMode"]);
  deepEqual(diffHostExecutionPolicy({ host: "codex", expected: null, actual: { sandboxMode: "workspace-write" } }), []);
});

test("DAH-004: OpenCode comparisons preserve scalar, map, and task defaults", () => {
  const expected = { edit: "allow", bash: { "*": "deny", "node test": "allow" }, task: "workflow-reachable" };
  deepEqual(diffHostExecutionPolicy({
    host: "opencode",
    expected,
    actual: {
      permissionKeys: ["bash", "edit", "task"],
      edit: "allow",
      bash: { "node test": "allow", "*": "deny" },
      taskEntries: [["*", "deny"]],
    },
  }), []);
  deepEqual(diffHostExecutionPolicy({
    host: "opencode",
    expected: { edit: "deny", bash: "deny", task: "deny-all" },
    actual: { permissionKeys: ["edit", "task"], edit: "allow", bash: "allow", taskEntries: [["*", "deny"], ["extra", "allow"]] },
  }).map((diff) => diff.field), ["permissionKeys", "edit", "bash", "taskDefault"]);
});

test("DAH-005: declared target comparison preserves missing, excess, and duplicate order", () => {
  deepEqual(compareDeclaredTargets({ expected: ["one", "two"], actual: ["two", "extra", "two"] }), {
    missing: ["one"],
    unexpected: ["extra"],
    duplicates: ["two"],
  });
});

test("DAH-006: task rule evaluation remains last-match-wins", () => {
  equal(effectiveTaskAction([{ pattern: "*", action: "deny" }, { pattern: "target", action: "allow" }], "target"), "allow");
  equal(effectiveTaskAction([{ pattern: "target", action: "allow" }, { pattern: "*", action: "deny" }], "target"), "deny");
});

test("DAH-007: denied expected workflow grants are both missing and excess", () => {
  deepEqual(compareWorkflowTaskGrants({ taskEntries: [["*", "deny"], ["expected", "deny"], ["extra", "allow"]], expectedTargets: ["expected"] }), {
    defaultDenied: true,
    missing: ["expected"],
    excess: ["expected", "extra"],
  });
  deepEqual(compareWorkflowTaskGrants({ taskEntries: [["expected", "allow"], ["*", "deny"]], expectedTargets: ["expected"] }), {
    defaultDenied: true,
    missing: ["expected"],
    excess: [],
  });
});
