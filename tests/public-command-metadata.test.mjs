import { test } from "node:test";
import { deepEqual, equal, match, ok } from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { publicCommands } from "../scripts/lib/public-commands.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const read = (relativePath) => readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");

const expectedCategories = {
  "project-bootstrap": ["sddp-prd", "sddp-systemdesign", "sddp-devops", "sddp-projectplan", "sddp-amend", "sddp-init", "sddp-regen"],
  "feature-delivery": ["sddp-specify", "sddp-clarify", "sddp-plan", "sddp-checklist", "sddp-tasks", "sddp-analyze", "sddp-implement", "sddp-qc"],
  orchestration: ["sddp-implement-qc-loop", "sddp-autopilot"],
  environment: ["sddp-devsetup"],
};

const expectedPrerequisites = {
  "sddp-projectplan": ["product-document:planning-ready", "technical-context:planning-ready"],
  "sddp-amend": ["project-instructions", "product-document", "technical-context", "project-plan"],
  "sddp-regen": ["project-instructions", "product-document", "technical-context", "project-plan:complete"],
  "sddp-specify": ["project-instructions"],
  "sddp-clarify": ["spec"],
  "sddp-plan": ["spec"],
  "sddp-checklist": ["spec", "plan"],
  "sddp-tasks": ["spec", "plan"],
  "sddp-analyze": ["spec", "plan", "tasks"],
  "sddp-implement": ["spec", "plan", "tasks", "checklists:complete-if-present"],
  "sddp-qc": ["spec", "plan", "tasks", "implementation:complete"],
  "sddp-implement-qc-loop": ["spec", "plan", "tasks"],
  "sddp-autopilot": ["autopilot:enabled", "product-document:planning-ready", "technical-context:planning-ready"],
};

test("PCM-001: public command metadata is complete, immutable, and uniquely keyed", () => {
  equal(publicCommands.length, 18);
  ok(Object.isFrozen(publicCommands));
  equal(new Set(publicCommands.map(({ command }) => command)).size, publicCommands.length);
  equal(new Set(publicCommands.map(({ workflow }) => workflow)).size, publicCommands.length);

  for (const command of publicCommands) {
    deepEqual(Object.keys(command), ["command", "workflow", "category", "prerequisites", "mutability", "mutationPolicy", "invocation", "arguments", "canonicalWorkflow", "hostRoles", "description"]);
    match(command.command, /^sddp-[a-z0-9-]+$/);
    match(command.workflow, /^[a-z0-9-]+$/);
    ok(Object.isFrozen(command));
    ok(Object.isFrozen(command.prerequisites));
    ok(Object.isFrozen(command.arguments));
    ok(Object.isFrozen(command.arguments.controls));
    ok(Object.isFrozen(command.hostRoles));
    equal(command.invocation, "user-only");
    equal(command.arguments.mode, "optional");
    ok(command.arguments.hint.length > 0);
    ok(command.arguments.empty.length > 0);
    ok(["workspace-write", "conditional-write"].includes(command.mutability));
    equal(command.mutability === "conditional-write", typeof command.mutationPolicy === "string");
    equal(command.canonicalWorkflow, `.github/sddp/workflows/${command.workflow}/WORKFLOW.md`);
    equal(command.hostRoles.opencode, "build");
    ok(command.hostRoles.copilot.length > 0);
    match(command.description, /\.$/);
    ok(!Object.hasOwn(command, "skill"));
    ok(!Object.hasOwn(command, "workflowFile"));
    ok(!Object.hasOwn(command, "copilotAgent"));
  }
});

test("PCM-002: command categories and hard prerequisites characterize the current lifecycle", () => {
  for (const [category, expected] of Object.entries(expectedCategories)) {
    deepEqual(publicCommands.filter((command) => command.category === category).map((command) => command.command), expected);
  }

  for (const command of publicCommands) {
    deepEqual(command.prerequisites, expectedPrerequisites[command.command] ?? []);
  }

  deepEqual(publicCommands.filter((command) => command.mutability === "conditional-write").map((command) => command.command), ["sddp-analyze", "sddp-devsetup"]);
  deepEqual(publicCommands.find((command) => command.command === "sddp-prd").arguments.controls, ["--quick", "--discover", "--resume", "--skip-research"]);
  deepEqual(publicCommands.find((command) => command.command === "sddp-init").arguments.controls, ["--quick"]);
  deepEqual(publicCommands.filter((command) => command.arguments.controls.length > 0).map((command) => command.command), ["sddp-prd", "sddp-init"]);
  equal(publicCommands.find((command) => command.command === "sddp-amend").arguments.empty, "prompt");
  equal(publicCommands.find((command) => command.command === "sddp-checklist").arguments.empty, "queue-or-prompt");
  equal(publicCommands.find((command) => command.command === "sddp-autopilot").arguments.empty, "auto-select");
});

test("PCM-003: canonical workflow metadata owns every current command target", () => {
  for (const command of publicCommands) {
    ok(existsSync(`${repoRoot}/${command.canonicalWorkflow}`), `missing ${command.canonicalWorkflow}`);
    const canonical = read(command.canonicalWorkflow);
    match(canonical, new RegExp(`^name: ${command.workflow}$`, "m"));
  }
});

test("PCM-004: host role metadata matches current Copilot and OpenCode selection", () => {
  for (const command of publicCommands) {
    const copilot = read(`.github/prompts/${command.command}.prompt.md`);
    const opencode = read(`.opencode/commands/${command.command}.md`);
    match(copilot, new RegExp(`^agent: ${command.hostRoles.copilot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
    match(opencode, new RegExp(`^agent: ${command.hostRoles.opencode}$`, "m"));
  }
});

test("PCM-005: all six current command surfaces point to the metadata-owned workflow", () => {
  const paths = (command) => [
    `.github/prompts/${command.command}.prompt.md`,
    `.claude/skills/${command.command}/SKILL.md`,
    `.agents/skills/${command.command}/SKILL.md`,
    `.agents/workflows/${command.command}.md`,
    `.opencode/commands/${command.command}.md`,
    `.windsurf/workflows/${command.command}.md`,
  ];

  for (const command of publicCommands) {
    for (const wrapperPath of paths(command)) {
      ok(existsSync(`${repoRoot}/${wrapperPath}`), `missing ${wrapperPath}`);
      ok(read(wrapperPath).includes(command.canonicalWorkflow), `${wrapperPath} does not reference ${command.canonicalWorkflow}`);
    }
  }
});

test("PCM-006: canonical workflows and support skills occupy separate roots", () => {
  const skillRoot = `${repoRoot}/.github/skills`;
  const supportSkills = readdirSync(skillRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(`${skillRoot}/${entry.name}/SKILL.md`))
    .map((entry) => entry.name)
    .sort();
  const workflowRoot = `${repoRoot}/.github/sddp/workflows`;
  const workflows = readdirSync(workflowRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(`${workflowRoot}/${entry.name}/WORKFLOW.md`))
    .map((entry) => entry.name)
    .sort();

  deepEqual(workflows, publicCommands.map((command) => command.workflow).sort());
  equal(workflows.length, 18);
  deepEqual(supportSkills, [
    "adr-authoring",
    "artifact-conventions",
    "clarification-strategies",
    "compact-communication",
    "implementation-standards",
    "instructions-management",
    "markdown-compression",
    "plan-authoring",
    "quality-assurance",
    "sdd-methodology",
    "spec-authoring",
    "task-generation",
    "writing-quality",
  ]);
});

test("PCM-007: current user-only enforcement is explicit on Claude and prose-only on Codex", () => {
  for (const command of publicCommands) {
    const claude = read(`.claude/skills/${command.command}/SKILL.md`);
    const codex = read(`.agents/skills/${command.command}/SKILL.md`);
    match(claude, /^disable-model-invocation: true$/m);
    match(codex, /Direct command-bar dispatch only; do not select for general queries\./);
    ok(!/^disable-model-invocation:/m.test(codex));
  }
});

test("PCM-008: relocated workflows leave no compatibility copies or stale canonical paths", () => {
  const oldRoot = [".github", "skills"].join("/");
  for (const command of publicCommands) {
    ok(!existsSync(`${repoRoot}/${oldRoot}/${command.workflow}`), `old workflow tree remains for ${command.workflow}`);
  }

  const stalePaths = publicCommands.map((command) => `${oldRoot}/${command.workflow}/`);
  const pending = [repoRoot];
  while (pending.length > 0) {
    const directory = pending.pop();
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && [".git", ".build", "node_modules"].includes(entry.name)) continue;
      const filePath = `${directory}/${entry.name}`;
      if (entry.isDirectory()) pending.push(filePath);
      else if (/\.(?:md|mjs|json|toml|ya?ml)$/.test(entry.name)) {
        const source = readFileSync(filePath, "utf8");
        ok(!stalePaths.some((stalePath) => source.includes(stalePath)), `stale workflow path in ${filePath.slice(repoRoot.length + 1)}`);
      }
    }
  }
});
