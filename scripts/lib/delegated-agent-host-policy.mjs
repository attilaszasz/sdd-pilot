export function requiredCapabilitiesFor({ contract, fallbackCapabilities = [] }) {
  return [...(contract ? contract.requiredCapabilities : fallbackCapabilities)];
}

export function missingHostCapabilities({ host, requiredCapabilities, actual }) {
  return requiredCapabilities.filter((capability) => {
    if (capability !== "bash/runCommand") return false;
    if (host === "claude") return !actual.tools.includes("Bash");
    if (host === "opencode") return actual.bash !== "allow";
    return false;
  });
}

export function diffHostExecutionPolicy({ host, expected, actual }) {
  if (!expected) return [];
  const diffs = [];
  if (host === "claude") {
    if (!sameArray(actual.tools, expected.tools)) diffs.push({ field: "tools", expected: expected.tools, actual: actual.tools });
    if (actual.handoff !== expected.handoff) diffs.push({ field: "handoff", expected: expected.handoff, actual: actual.handoff });
  } else if (host === "codex") {
    if (actual.sandboxMode !== expected.sandboxMode) diffs.push({ field: "sandboxMode", expected: expected.sandboxMode, actual: actual.sandboxMode });
  } else if (host === "opencode") {
    if (!sameArray(actual.permissionKeys, ["bash", "edit", "task"])) diffs.push({ field: "permissionKeys", expected: ["bash", "edit", "task"], actual: actual.permissionKeys });
    if (actual.edit !== expected.edit) diffs.push({ field: "edit", expected: expected.edit, actual: actual.edit });
    if (!samePolicyValue(actual.bash, expected.bash)) diffs.push({ field: "bash", expected: expected.bash, actual: actual.bash });
    const denyAll = actual.taskEntries.length === 1 && actual.taskEntries[0][0] === "*" && actual.taskEntries[0][1] === "deny";
    const defaultDenied = actual.taskEntries.some(([target, action]) => target === "*" && action === "deny");
    if ((expected.task === "deny-all" && !denyAll) || (expected.task === "workflow-reachable" && !defaultDenied)) {
      diffs.push({ field: "taskDefault", expected: expected.task, actual: actual.taskEntries });
    }
  }
  return diffs;
}

export function compareDeclaredTargets({ expected, actual }) {
  return {
    missing: expected.filter((target) => !actual.includes(target)),
    unexpected: actual.filter((target) => !expected.includes(target)),
    duplicates: actual.filter((target, index) => actual.indexOf(target) !== index),
  };
}

export function effectiveTaskAction(rules, target) {
  let action = null;
  for (const rule of rules) {
    if (rule.pattern === "*" || rule.pattern === target) action = rule.action;
  }
  return action;
}

export function compareWorkflowTaskGrants({ taskEntries, expectedTargets }) {
  const orderedRules = taskEntries.map(([pattern, action]) => ({ pattern, action }));
  const wildcardActions = orderedRules.filter((rule) => rule.pattern === "*").map((rule) => rule.action);
  return {
    defaultDenied: wildcardActions.at(-1) === "deny",
    missing: expectedTargets.filter((target) => effectiveTaskAction(orderedRules, target) !== "allow"),
    excess: taskEntries
      .filter(([target, action]) => target !== "*" && (!expectedTargets.includes(target) || action !== "allow"))
      .map(([target]) => target)
      .sort(),
  };
}

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function samePolicyValue(actual, expected) {
  if (typeof expected !== "object" || expected === null) return actual === expected;
  if (typeof actual !== "object" || actual === null || Array.isArray(actual)) return false;
  return JSON.stringify(Object.entries(actual).sort()) === JSON.stringify(Object.entries(expected).sort());
}
