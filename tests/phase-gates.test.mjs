import { equal, match, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { evaluateCheckedTaskProvenance, evaluatePlanGate, evaluateSpecGate, evaluateTasksGate } from "../scripts/phase-gates.mjs";

const spec = () => readFileSync(new URL("fixtures/lifecycle-release/feature/spec.md", import.meta.url));
const plan = () => readFileSync(new URL("fixtures/lifecycle-release/feature/plan.md", import.meta.url));
const tasks = () => readFileSync(new URL("fixtures/lifecycle-release/feature/tasks.md", import.meta.url));

test("PG-001: canonical executable gates accept the complete fixture", () => {
  const specResult = evaluateSpecGate(spec());
  equal(specResult.valid, true, specResult.issues.join("\n"));
  equal(evaluatePlanGate(plan(), specResult.p1RequirementIds).valid, true);
  equal(evaluateTasksGate(tasks(), specResult.p1RequirementIds).valid, true);
});

test("PG-002: Spec gate rejects malformed frontmatter, scope, P1 criteria, markers, and unresolved STF", () => {
  const source = spec().toString("utf8");
  for (const [needle, replacement, expected] of [
    ["spec_maturity: resolved", "spec_maturity:", /spec_maturity/],
    ["### Included\n\nOne independently testable lifecycle fixture.", "", /Scope missing/],
    ["SC-001 [US1]:", "SC-001 [US2]:", /US1 has no success criterion/],
    ["**FR-001** [US1]:", "**FR-01** [US1]:", /FR-01 must use/],
    ["## Success Criteria", "[NEEDS CLARIFICATION: a]\n[NEEDS CLARIFICATION: b]\n[NEEDS CLARIFICATION: c]\n[NEEDS CLARIFICATION: d]\n\n## Success Criteria", /marker count 4/],
    ["## Success Criteria", "STF-001: [cross-requirement-contradiction] (CRITICAL) — Affected: FR-001 — open\n[NEEDS CLARIFICATION: STF-001]\n\n## Success Criteria", /unresolved CRITICAL/],
  ]) {
    const result = evaluateSpecGate(source.replace(needle, replacement));
    equal(result.valid, false);
    match(result.issues.join("\n"), expected);
  }
  equal(evaluateSpecGate(source.replace("## Success Criteria", "STF-001: [cross-requirement-contradiction] (CRITICAL) — Affected: FR-001 — fixed\n\n## Success Criteria")).valid, true);
});

test("PG-003: Plan gate accepts canonical coverage maps and rejects missing paths, symbols, decisions, and oversized input", () => {
  const source = plan().toString("utf8");
  for (const [replacement, expected] of [
    [source.replace("| FR-001 | Fixture runner | src/fixture.mjs | runFixture | AD-001 |", ""), /FR-001/],
    [source.replace("src/fixture.mjs", "TBD"), /file path/],
    [source.replace("runFixture", "—"), /symbol/],
    [source.replace("| FR-001 | Fixture runner | src/fixture.mjs | runFixture | AD-001 |", "| FR-001 | Fixture runner | src/fixture.mjs | runFixture | — |"), /orphaned/],
    [source.replace("| AD-001 | Keep fixture behavior deterministic. |", "| AD-001 | Keep fixture behavior deterministic. |\n| AD-001 | Duplicate |"), /duplicate/],
    [`${source}\n${"x".repeat(10241)}`, /exceeds/],
  ]) {
    const result = evaluatePlanGate(replacement, ["FR-001"]);
    equal(result.valid, false);
    match(result.issues.join("\n"), expected);
  }
  equal(evaluatePlanGate(source.replace("| Req ID | Component(s) | File Path(s) | Function(s)/Symbol(s) | Notes |\n|---|---|---|---|---|\n| FR-001 | Fixture runner | src/fixture.mjs | runFixture | AD-001 |", "| Requirement | File Path(s) | Function(s)/Symbol(s) | Decision |\n|---|---|---|---|\n| FR-001 | src/fixture.mjs | runFixture | AD-001 |"), ["FR-001"]).valid, true);
});

test("PG-003a: Plan gate requires a structural architecture-decision consumer", () => {
  const source = plan().toString("utf8");
  const withoutCoverageConsumer = source.replace("| FR-001 | Fixture runner | src/fixture.mjs | runFixture | AD-001 |", "| FR-001 | Fixture runner | src/fixture.mjs | runFixture | — |");

  const proseOnly = `${withoutCoverageConsumer}\nAD-001 is mentioned only in arbitrary prose.\n`;
  const proseResult = evaluatePlanGate(proseOnly, ["FR-001"]);
  equal(proseResult.valid, false);
  match(proseResult.issues.join("\n"), /orphaned architecture decision AD-001: add it to a coverage-map consumer, Project Structure, or an explicit N\/A\/orphan note/);

  const projectStructure = `${withoutCoverageConsumer}\n## Project Structure\n\n- \`src/fixture.mjs\` implements AD-001.\n`;
  equal(evaluatePlanGate(projectStructure, ["FR-001"]).valid, true);

  const explicitNote = withoutCoverageConsumer.replace("| AD-001 | Keep fixture behavior deterministic. |", "| AD-001 | Keep fixture behavior deterministic. |\n\nN/A — AD-001 is intentionally unconsumed because the fixture has one implementation path.");
  equal(evaluatePlanGate(explicitNote, ["FR-001"]).valid, true);
});

test("PG-004: Tasks gate rejects empty/out-of-order phases, ID gaps, dangling/self/cyclic dependencies, and byte/task limits", () => {
  const source = tasks().toString("utf8");
  const cases = [
    [source.replace("- [X] T001", "- [X] T002"), /not sequential/],
    [source.replace("after:T003", "after:T999"), /does not exist/],
    [source.replace("after:T003", "after:T004"), /circular/],
    [source.replace("## Phase 4: Polish\n\n- [ ] T004", "## Phase 4: Polish"), /empty Polish/],
    [source.replace("## Phase 3: Delivery [US1]", "## Phase 3: Delivery"), /lacks work-item/],
    [source.replace("## Phase 2: Foundational", "## Phase 5: Polish"), /invalid phase structure/],
    [`${source}\n${"x".repeat(6145)}`, /exceeds/],
    [`${source}\n${Array.from({ length: 37 }, (_, index) => `- [ ] T${String(index + 5).padStart(3, "0")} Extra`).join("\n")}`, /task count 41/],
  ];
  for (const [candidate, expected] of cases) {
    const result = evaluateTasksGate(candidate, ["FR-001"]);
    equal(result.valid, false);
    match(result.issues.join("\n"), expected);
  }
  const oneTask = "## Phase 1: Delivery [US1]\n\n- [ ] T001 [US1] {FR-001} Single task\n";
  equal(evaluateTasksGate(oneTask, ["FR-001"]).valid, true);
  ok(evaluateTasksGate("", []).issues.length > 0);
});

test("PG-005: checked-task provenance blocks stale requirements, coverage, imports, and dependencies without changing task state", () => {
  const specSource = spec().toString("utf8");
  const planSource = plan().toString("utf8");
  const tasksSource = tasks().toString("utf8").replace(
    "Exercise fixture lifecycle after:T002",
    "Exercise fixture lifecycle in src/fixture.mjs after:T002 ← T001:runFixture → exports: runFixture",
  );
  equal(evaluateCheckedTaskProvenance(specSource, planSource, tasksSource).valid, true);
  const pathOnlyTask = tasksSource.replace("in src/fixture.mjs after:T002 ← T001:runFixture → exports: runFixture", "in src/fixture.mjs after:T002 ← T001:runFixture");
  equal(evaluateCheckedTaskProvenance(specSource, planSource, pathOnlyTask).valid, true);
  const cases = [
    [evaluateCheckedTaskProvenance(specSource.replace("- **FR-001** [US1]: Complete the fixture lifecycle.\n", ""), planSource, tasksSource), /removed requirement FR-001/],
    [evaluateCheckedTaskProvenance(specSource, planSource.replace("src/fixture.mjs", "src/renamed.mjs"), pathOnlyTask), /path src\/fixture.mjs no longer matches/],
    [evaluateCheckedTaskProvenance(specSource, planSource.replace("runFixture", "runRenamed"), tasksSource), /export runFixture no longer matches/],
    [evaluateCheckedTaskProvenance(specSource, planSource, tasksSource.replace("← T001:runFixture", "← T001:missingExport")), /imports missingExport not exported by T001/],
    [evaluateCheckedTaskProvenance(specSource, planSource, tasksSource.replace("after:T002", "after:T004")), /depends on incomplete T004/],
  ];
  for (const [result, expected] of cases) {
    equal(result.valid, false);
    match(result.issues.join("\n"), expected);
  }
});
