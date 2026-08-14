import { deepEqual, equal, match } from "node:assert/strict";
import { test } from "node:test";

import { commitTaskCompletion } from "../scripts/lib/workflow-state.mjs";

const tasks = "## Phase 1: Delivery [US1]\n\n- [ ] T001 [US1] {FR-001} First\n- [ ] T002 [P] [US1] {FR-001} Parallel second\n";
const pass = (confidence, extraVerification = "PASS") => ({ developer: "PASS", confidence, extraVerification, verify: "PASS", exports: "PASS", review: "PASS", microQc: "PASS" });

test("TC-001: sequential and parallel confidence paths commit only complete tasks", () => {
  const result = commitTaskCompletion(tasks, { T001: pass("CONFIDENT"), T002: pass("TENTATIVE") });
  deepEqual(result.completed, ["T001", "T002"]);
  match(result.source, /- \[X\] T001/);
  match(result.source, /- \[X\] T002/);
});

test("TC-002: tentative failure, uncertain confidence, and failed review remain unchecked", () => {
  const result = commitTaskCompletion(tasks, { T001: pass("TENTATIVE", "FAIL"), T002: { ...pass("UNCERTAIN"), review: "FAIL" } });
  deepEqual(result.blocked, ["T001", "T002"]);
  equal(result.source, tasks);
});

test("TC-003: setup Micro-QC may skip, but missing results fail closed", () => {
  const skipped = commitTaskCompletion(tasks, { T001: { ...pass("CONFIDENT"), microQc: "SKIPPED" } });
  deepEqual(skipped.completed, ["T001"]);
  const missing = commitTaskCompletion(tasks, { T001: { ...pass("CONFIDENT"), review: undefined } });
  deepEqual(missing.blocked, ["T001", "T002"]);
});
