import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { equal, match, rejects } from "node:assert/strict";

import { applyBugTasks, preflightBugTasks } from "../scripts/lib/qc-bug-tasks.mjs";

const roots = [];
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

function task(id) {
  return `- [X] T${String(id).padStart(3, "0")} [US1] {FR-001} Complete task ${id} in src/task-${id}.mjs`;
}

function bug(id, suffix = "") {
  return `- [ ] T${String(id).padStart(3, "0")} [BUG:ERROR] {FR-001} [test-failure] Repair regression in src/bug-${id}.mjs${suffix}`;
}

function document(count, padding = "") {
  const delivery = count === 0 ? "" : `## Phase 1: Delivery [US1]\n${Array.from({ length: count }, (_, index) => task(index + 1)).join("\n")}\n`;
  return `# Tasks\n\n${delivery}${padding}`;
}

function temporaryTasks(content) {
  const root = mkdtempSync(path.join(tmpdir(), "sddp-qc-bugs-"));
  roots.push(root);
  const tasksPath = path.join(root, "tasks.md");
  writeFileSync(tasksPath, content);
  return tasksPath;
}

test("QBT-001: 0, 1, and 39 existing tasks accept one complete in-budget BUG mutation", async () => {
  for (const count of [0, 1, 39]) {
    const tasksPath = temporaryTasks(document(count));
    const result = await applyBugTasks(tasksPath, ["## Phase: Bug Fixes", bug(count + 1)]);
    equal(result.written, true, `count ${count}`);
    equal(result.taskCount, count + 1, `count ${count}`);
  }
});

test("QBT-002: 40+1, byte overflow, and T999 overflow are blocked without mutating tasks.md", async () => {
  const cases = [
    [document(40), ["## Phase: Bug Fixes", bug(41)], "task-limit"],
    [document(1, "x".repeat(6144)), ["## Phase: Bug Fixes", bug(2)], "file-size-limit"],
    [`# Tasks\n\n## Phase 1: Delivery [US1]\n${task(998)}\n${task(999)}\n`, ["## Phase: Bug Fixes", bug(1000)], "invalid-task-id"],
  ];
  for (const [content, additions, code] of cases) {
    const tasksPath = temporaryTasks(content);
    const before = readFileSync(tasksPath, "utf8");
    const result = await applyBugTasks(tasksPath, additions);
    equal(result.written, false, code);
    equal(result.errors.some((error) => error.code === code), true, code);
    equal(readFileSync(tasksPath, "utf8"), before, code);
  }
});

test("QBT-003: T998 accepts T999, while no four-digit task ID can be generated", async () => {
  const tasksPath = temporaryTasks(`# Tasks\n\n## Phase 1: Delivery [US1]\n${task(998)}\n`);
  const accepted = await applyBugTasks(tasksPath, ["## Phase: Bug Fixes", bug(999)]);
  equal(accepted.written, true);
  match(readFileSync(tasksPath, "utf8"), /T999/);
});

test("QBT-004: 6143 and 6144 byte candidates pass while 6145 bytes fail closed", () => {
  const additions = ["## Phase: Bug Fixes", bug(2)];
  for (const bytes of [6143, 6144, 6145]) {
    const base = document(1);
    const candidateBytes = Buffer.byteLength(preflightBugTasks(base, additions).candidate);
    const padded = `${base.slice(0, -1)}${"x".repeat(bytes - candidateBytes)}\n`;
    const result = preflightBugTasks(padded, additions);
    equal(result.bytes, bytes);
    equal(result.valid, bytes <= 6144);
  }
});

test("QBT-005: multiple BUG tasks are one atomic mutation and preserve existing IDs", async () => {
  const tasksPath = temporaryTasks(document(1));
  const before = readFileSync(tasksPath, "utf8");
  const result = await applyBugTasks(tasksPath, ["## Phase: Bug Fixes", bug(2), "  > Error: first", bug(3), "  > Error: second"]);
  const after = readFileSync(tasksPath, "utf8");
  equal(result.written, true);
  equal(result.taskCount, 3);
  equal(after.startsWith(before), true);
  match(after, /T002[\s\S]*T003/);
});

test("QBT-006: recurring tasks and deduplicated failures preserve BUG history without rewriting it", async () => {
  const existing = `${document(1)}\n## Phase: Bug Fixes\n${bug(2, " [RECURRING]")}\n`;
  const tasksPath = temporaryTasks(existing);
  const result = await applyBugTasks(tasksPath, [bug(3)]);
  const after = readFileSync(tasksPath, "utf8");
  equal(result.written, true);
  equal(after.startsWith(existing), true);
  match(after, /T002[\s\S]*\[RECURRING\]/);
  match(after, /T003/);
});

test("QBT-007: an interrupted atomic write leaves the original file intact", async () => {
  const tasksPath = temporaryTasks(document(1));
  const before = readFileSync(tasksPath, "utf8");
  await rejects(
    applyBugTasks(tasksPath, ["## Phase: Bug Fixes", bug(2)], { rename: async () => { throw new Error("simulated interruption"); } }),
    /simulated interruption/,
  );
  equal(readFileSync(tasksPath, "utf8"), before);
});
