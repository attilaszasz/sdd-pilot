import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { isEpicComplete } from "../completion-matching.js";
import type { Epic } from "../types.js";

function createEpic(id: string, title: string): Epic {
  return {
    id,
    title,
    priority: "P1",
    category: "TECHNICAL",
    parallel: false,
    sourceTags: "",
    completed: false,
    wave: 1,
    dependsOn: [],
    specifyInputDescription: title,
    hints: {
      skipClarify: false,
      skipChecklist: false,
      lightweight: false,
    },
  };
}

function withTempWorkspace(run: (workspaceRoot: string) => void): void {
  const workspaceRoot = mkdtempSync(join(tmpdir(), "sdd-orchestrator-"));

  try {
    mkdirSync(join(workspaceRoot, "specs"), { recursive: true });
    run(workspaceRoot);
  } finally {
    rmSync(workspaceRoot, { recursive: true, force: true });
  }
}

function markEpicComplete(workspaceRoot: string, dirName: string): void {
  const featureDir = join(workspaceRoot, "specs", dirName);
  mkdirSync(featureDir, { recursive: true });
  writeFileSync(join(featureDir, ".qc-passed"), "", "utf8");
}

test("isEpicComplete matches an exact completed feature directory", () => {
  withTempWorkspace((workspaceRoot) => {
    const epic = createEpic("E001", "Bootstrap Go CLI foundation and plumbing");
    markEpicComplete(workspaceRoot, "bootstrap-go-cli-foundation-and");

    assert.equal(isEpicComplete(workspaceRoot, epic), true);
  });
});

test("isEpicComplete matches a completed directory with only a numeric prefix", () => {
  withTempWorkspace((workspaceRoot) => {
    const epic = createEpic("E001", "Bootstrap Go CLI foundation and plumbing");
    markEpicComplete(workspaceRoot, "00001-bootstrap-go-cli-foundation-and");

    assert.equal(isEpicComplete(workspaceRoot, epic), true);
  });
});

test("isEpicComplete matches a completed directory with numeric and epic prefixes", () => {
  withTempWorkspace((workspaceRoot) => {
    const epic = createEpic("E001", "Bootstrap Go CLI foundation and plumbing");
    markEpicComplete(workspaceRoot, "00001-e001-bootstrap-go-cli-foundation-and");

    assert.equal(isEpicComplete(workspaceRoot, epic), true);
  });
});

test("isEpicComplete does not treat another epic's prefixed directory as complete", () => {
  withTempWorkspace((workspaceRoot) => {
    markEpicComplete(workspaceRoot, "00001-e001-bootstrap-go-cli-foundation-and");

    const epic = createEpic("E002", "Bootstrap Go CLI foundation and plumbing");
    assert.equal(isEpicComplete(workspaceRoot, epic), false);
  });
});

test("isEpicComplete returns false when no directory matches instead of using another .qc-passed marker", () => {
  withTempWorkspace((workspaceRoot) => {
    markEpicComplete(workspaceRoot, "00001-e001-bootstrap-go-cli-foundation-and");
    markEpicComplete(workspaceRoot, "00002-e002-user-authentication-foundation");

    const epic = createEpic("E003", "Reporting dashboard baseline");
    assert.equal(isEpicComplete(workspaceRoot, epic), false);
  });
});

test("isEpicComplete accepts a longer normalized directory slug that extends the epic slug", () => {
  withTempWorkspace((workspaceRoot) => {
    const epic = createEpic("E001", "Bootstrap Go CLI foundation and plumbing");
    markEpicComplete(workspaceRoot, "00001-e001-bootstrap-go-cli-foundation-and-additional-scaffolding");

    assert.equal(isEpicComplete(workspaceRoot, epic), true);
  });
});