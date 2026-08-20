import { readFileSync } from "node:fs";
import { test } from "node:test";
import { doesNotMatch, match, ok } from "node:assert/strict";
import { fileURLToPath } from "node:url";

const read = (relative) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const workflow = read("../.github/skills/system-design/SKILL.md");
const template = read("../.github/skills/system-design/assets/sad-template.md");

test("SDC-001: complexity evidence automatically selects the collaborative path", () => {
  match(workflow, /## 2\. Profile System Complexity/);
  match(workflow, /`0-2` → `SIMPLE`/);
  match(workflow, /`3-4` → `COMPOUND`/);
  match(workflow, /`5\+` → `COMPLEX`/);
  match(workflow, /`COLLABORATIVE_PATH = true` for `COMPOUND` or `COMPLEX`/);
});

test("SDC-002: collaborative systems require decomposition, flow, and candidate approval", () => {
  const decomposition = workflow.indexOf("## 3. Propose and Approve Decomposition");
  const flows = workflow.indexOf("## 6. Inventory and Approve Major Flows");
  const preview = workflow.indexOf("## 8. Preview the Architecture");
  const write = workflow.indexOf("## 9. Author ADRs and Build the SAD Candidate");
  ok(decomposition >= 0 && flows > decomposition && preview > flows && write > preview);
  match(workflow, /Do not continue until explicitly answered/);
  match(workflow, /Do not draft diagrams until explicitly answered/);
  match(workflow, /Silence is not approval/);
});

test("SDC-003: C4 remains the overview while concerns select portable diagrams", () => {
  match(workflow, /C4 System Context: always/);
  match(workflow, /C4 Container: always/);
  match(workflow, /Sequence diagram: critical synchronous journeys/);
  match(workflow, /Flowchart: asynchronous\/event\/data pipelines/);
  match(workflow, /State diagram: meaningful lifecycle/);
  match(workflow, /ER diagram: project-level conceptual/);
  doesNotMatch(workflow, /Use Mermaid `C4Context`\/`C4Container`\/`C4Component` only/);
});

test("SDC-004: template provides decomposition, view, flow, and traceability contracts", () => {
  for (const heading of ["## System Decomposition", "## Architecture View Catalog", "## Major Data Flow Catalog", "## Major Data Flow Diagrams", "## Architecture Traceability"]) match(template, new RegExp(heading));
  match(template, /\| Flow ID \| Trigger \| Source \/ Actor \| Processing Boundaries/);
  match(template, /### FLOW-001:/);
  doesNotMatch(template, /All project source code must reside in the `\/src` directory/);
});

test("SDC-005: system design validates a candidate before publishing and validates live registration", () => {
  const candidate = workflow.indexOf('node scripts/validate-sad.mjs "<candidate-path>"');
  const replace = workflow.indexOf("replace `CANONICAL_SAD`");
  const live = workflow.indexOf('node scripts/validate-sad.mjs "CANONICAL_SAD"');
  ok(candidate >= 0 && replace > candidate && live > replace);
  match(workflow, /restore the prior SAD\/config bytes/);
});
