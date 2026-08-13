import { equal, match, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { evaluatePlanGate, evaluateSpecGate, evaluateTasksGate } from "../scripts/phase-gates.mjs";

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
    ["## Success Criteria", "[NEEDS CLARIFICATION: a]\n[NEEDS CLARIFICATION: b]\n[NEEDS CLARIFICATION: c]\n[NEEDS CLARIFICATION: d]\n\n## Success Criteria", /marker count 4/],
    ["## Success Criteria", "STF-001: [cross-requirement-contradiction] (CRITICAL) — Affected: FR-001 — open\n[NEEDS CLARIFICATION: STF-001]\n\n## Success Criteria", /unresolved CRITICAL/],
  ]) {
    const result = evaluateSpecGate(source.replace(needle, replacement));
    equal(result.valid, false);
    match(result.issues.join("\n"), expected);
  }
  equal(evaluateSpecGate(source.replace("## Success Criteria", "STF-001: [cross-requirement-contradiction] (CRITICAL) — Affected: FR-001 — fixed\n\n## Success Criteria")).valid, true);
});

test("PG-003: Plan gate rejects missing coverage, placeholders, duplicate/orphan decisions, and oversized input", () => {
  const source = plan().toString("utf8");
  for (const [replacement, expected] of [
    [source.replace("| FR-001 | src/fixture.mjs | runFixture | AD-001 |", ""), /FR-001/],
    [source.replace("src/fixture.mjs", "TBD"), /file path/],
    [source.replace("| FR-001 | src/fixture.mjs | runFixture | AD-001 |", "| FR-001 | src/fixture.mjs | runFixture | — |").replace("AD-001 is consumed by `runFixture`.", ""), /orphaned/],
    [source.replace("| AD-001 | Keep fixture behavior deterministic. |", "| AD-001 | Keep fixture behavior deterministic. |\n| AD-001 | Duplicate |"), /duplicate/],
    [`${source}\n${"x".repeat(10241)}`, /exceeds/],
  ]) {
    const result = evaluatePlanGate(replacement, ["FR-001"]);
    equal(result.valid, false);
    match(result.issues.join("\n"), expected);
  }
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
