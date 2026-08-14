import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";

import { selectQcScope } from "../scripts/lib/workflow-state.mjs";

const git = (root, args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
test("QRB-001: real Git baselines scope reachable history and fail closed otherwise", () => {
  const root = mkdtempSync(join(tmpdir(), "sddp-qc-baseline-"));
  try {
    git(root, ["init"]); git(root, ["config", "user.email", "test@example.com"]); git(root, ["config", "user.name", "Test"]);
    writeFileSync(join(root, "a.txt"), "one"); git(root, ["add", "."]); git(root, ["commit", "-m", "base"]);
    const baseline = git(root, ["rev-parse", "HEAD"]);
    writeFileSync(join(root, "a.txt"), "two"); writeFileSync(join(root, "untracked.txt"), "u");
    equal(selectQcScope(root, baseline).mode, "scoped");
    deepEqual(selectQcScope(root, baseline).changedFiles, ["a.txt", "untracked.txt"]);
    equal(selectQcScope(root, "0".repeat(40)).mode, "full");
    equal(selectQcScope(root, baseline.slice(1)).mode, "full");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("QRB-002: no-Git and malformed baselines force full QC", () => {
  const root = mkdtempSync(join(tmpdir(), "sddp-qc-nogit-"));
  try { equal(selectQcScope(root, "x".repeat(40)).mode, "full"); equal(selectQcScope(root, null).mode, "full"); } finally { rmSync(root, { recursive: true, force: true }); }
});

test("QRB-003: a shallow clone rejects a baseline outside its available history", () => {
  const root = mkdtempSync(join(tmpdir(), "sddp-qc-shallow-source-"));
  const clone = mkdtempSync(join(tmpdir(), "sddp-qc-shallow-clone-"));
  try {
    git(root, ["init"]); git(root, ["config", "user.email", "test@example.com"]); git(root, ["config", "user.name", "Test"]);
    writeFileSync(join(root, "a.txt"), "one"); git(root, ["add", "."]); git(root, ["commit", "-m", "base"]);
    const baseline = git(root, ["rev-parse", "HEAD"]);
    writeFileSync(join(root, "a.txt"), "two"); git(root, ["commit", "-am", "next"]);
    rmSync(clone, { recursive: true, force: true });
    execFileSync("git", ["clone", "--depth", "1", `file://${root}`, clone]);
    equal(selectQcScope(clone, baseline).mode, "full");
  } finally { rmSync(root, { recursive: true, force: true }); rmSync(clone, { recursive: true, force: true }); }
});
