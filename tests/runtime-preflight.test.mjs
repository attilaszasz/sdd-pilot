import { test } from "node:test";
import { deepEqual, equal, match, ok } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { minimumNodeMajor, prerequisitesUrl, evaluateRuntime } from "../scripts/runtime-preflight.mjs";
import { publicCommands } from "../scripts/lib/public-commands.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(`${root}/${path}`, "utf8");

test("RPF-001: runtime evaluation is deterministic for unsupported and supported Node versions", () => {
  deepEqual(evaluateRuntime("v21.9.0"), {
    ok: false,
    minimumNodeMajor: 22,
    detected: "21.9.0",
    message: `SDD Pilot requires Node.js 22 or newer available as node. Detected: 21.9.0. Install a supported Node.js LTS release: ${prerequisitesUrl}. No SDD Pilot artifact was modified.`,
  });
  deepEqual(evaluateRuntime("22.0.0"), { ok: true, minimumNodeMajor: 22, detected: "22.0.0" });
  deepEqual(evaluateRuntime("24.0.0"), { ok: true, minimumNodeMajor: 22, detected: "24.0.0" });
});

test("RPF-002: the executable preflight reports JSON and accepts the current supported runtime", () => {
  const result = spawnSync(process.execPath, ["scripts/runtime-preflight.mjs"], { cwd: root, encoding: "utf8" });
  equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  equal(output.ok, true);
  equal(output.minimumNodeMajor, minimumNodeMajor);
  ok(/^\d+\.\d+\.\d+$/.test(output.detected));
});

test("RPF-003: every public command inherits one shared preflight before artifacts or nested phases", () => {
  const contract = read("AGENTS.md");
  match(read("README.md"), /Node\.js 22 or newer installed and available as `node`; use a supported LTS release/);
  match(contract, /Every public `\/sddp-\*` command must run this preflight exactly once before reading or writing any SDD Pilot artifact, delegating a phase, or running another SDD Pilot script/);
  match(contract, /command -v node/);
  match(contract, /node scripts\/runtime-preflight\.mjs/);
  match(contract, /Nested phases inherit the successful in-turn result and must not run it again/);
  match(contract, /Do not install Node or use an editor-bundled runtime/);
  for (const command of publicCommands) equal(command.runtimePreflight, "runtime-preflight", command.command);
  match(read(".github/sddp/workflows/autopilot-pipeline/WORKFLOW.md"), /executes each sub-skill inline/);
  match(read(".github/sddp/workflows/implement-qc-loop/WORKFLOW.md"), /nested sub-skill/);
});

test("RPF-004: host command policies permit the shared preflight", () => {
  for (const command of publicCommands) {
    const claude = read(`.claude/skills/${command.command}/SKILL.md`);
    match(claude, /^allowed-tools:.*\bBash\b/m, `${command.command} Claude wrapper lacks Bash`);
  }
  match(read(".claude/settings.json"), /"Bash\(node \*\)"/);

  const copilotRoles = new Map([
    ["Product Strategist", "product-strategist.md"], ["Solution Architect", "solution-architect.md"], ["DevOps Strategist", "devops-strategist.md"],
    ["Project Planner", "project-planner.md"], ["Project Amender", "project-amender.md"], ["Project Initializer", "project-initializer.md"],
    ["Prototype Retrospective Analyst", "prototype-retrospective-analyst.md"], ["Product Manager", "product-manager.md"], ["Business Analyst", "business-analyst.md"],
    ["Software Architect", "software-architect.md"], ["QA Engineer", "qa-engineer.md"], ["Project Manager", "project-manager.md"],
    ["Compliance Auditor", "compliance-auditor.md"], ["Software Engineer", "software-engineer.md"], ["QC Agent", "qc-agent.md"], ["Onboarding & Environment Setup Analyst", "environment-setup.md"],
  ]);
  for (const command of publicCommands) {
    if (!copilotRoles.has(command.hostRoles.copilot)) continue;
    match(read(`.github/agents/${copilotRoles.get(command.hostRoles.copilot)}`), /execute\/(?:runInTerminal|getTerminalOutput)|'execute'/, `${command.command} Copilot role lacks a terminal capability`);
  }
  match(read(".opencode/commands/sddp-prd.md"), /^agent: build$/m);
});
