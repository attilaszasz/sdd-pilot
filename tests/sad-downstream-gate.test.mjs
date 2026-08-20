import { readFileSync } from "node:fs";
import { test } from "node:test";
import { doesNotMatch, match, ok } from "node:assert/strict";
import { fileURLToPath } from "node:url";

const read = (relative) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const autopilot = read("../.github/skills/autopilot-pipeline/SKILL.md");
const planning = read("../.github/skills/project-planning/SKILL.md");
const command = "node scripts/validate-sad.mjs <sad> --profile planning-ready --config .github/sddp-config.md";

test("SDG-001: Project Planning gates SAD parsing on planning-ready validation", () => {
  match(planning, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const resolution = planning.indexOf("### 1.2 Resolve Technical Context Document");
  const validation = planning.indexOf("### 1.5 Validate Planning-Ready Technical Context Document");
  const parsing = planning.indexOf("## 2. Read and Parse All Inputs");
  ok(resolution >= 0 && validation > resolution && parsing > validation);
  match(planning, /never substitute keyword counting or inferred sufficiency/);
});

test("SDG-002: Autopilot replaces keyword SAD sufficiency with the validator", () => {
  match(autopilot, /node scripts\/validate-sad\.mjs "TECH_CONTEXT_DOC" --profile planning-ready --config \.github\/sddp-config\.md/);
  const technicalGate = autopilot.slice(autopilot.indexOf("**Technical Context Document:**"), autopilot.indexOf("### 1c. Feature Complete Check"));
  match(technicalGate, /Never replace this with keyword counting/);
  doesNotMatch(technicalGate, /≥3 of 5|Need ≥3\/5|postgres.*mysql.*mongo/);
});
