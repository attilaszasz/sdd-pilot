import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { equal, throws } from "node:assert/strict";
import { test } from "node:test";

import { reconcileTasksFile, rejectDestructiveMigration, reserveChecklistPath } from "../scripts/lib/workflow-state.mjs";

test("FRP-001: reconciliation preserves checked lines, BUG history, IDs, and phase bytes", () => {
  const root = mkdtempSync(join(tmpdir(), "sddp-rerun-"));
  try {
    const file = join(root, "tasks.md");
    const original = "## Phase 1: Delivery [US1]\n\n- [X] T001 [US1] {FR-001} Done\n- [ ] T002 [BUG:WARNING] [coverage-gap] Keep history\n";
    writeFileSync(file, original);
    const candidate = `${original}- [ ] T003 [US1] {FR-001} New work\n`;
    reconcileTasksFile(file, candidate);
    equal(readFileSync(file, "utf8"), candidate);
    throws(() => reconcileTasksFile(file, candidate.replace("[X] T001", "[ ] T001")), /alter/);
    equal(readFileSync(file, "utf8"), candidate);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("FRP-002: checklist collisions and unapproved destructive migration fail without writes", () => {
  const root = mkdtempSync(join(tmpdir(), "sddp-rerun-reject-"));
  try {
    const checklist = join(root, "requirements-001.md");
    writeFileSync(checklist, "- [X] CHK001 Preserved [Completeness, Spec §1]\n");
    const before = readFileSync(checklist, "utf8");
    throws(() => reserveChecklistPath(checklist), /collision/);
    throws(() => rejectDestructiveMigration(false, [{ from: "T001", to: "T002" }]), /requires/);
    throws(() => rejectDestructiveMigration(true, []), /requires/);
    equal(readFileSync(checklist, "utf8"), before);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
