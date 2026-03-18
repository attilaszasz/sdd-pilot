import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  applyDefaultDocumentPaths,
  getMissingConfigPrerequisites,
  parseSddpConfigContent,
} from "../config.js";

function withTempWorkspace(run: (workspaceRoot: string) => void): void {
  const workspaceRoot = mkdtempSync(join(tmpdir(), "sdd-config-"));

  try {
    run(workspaceRoot);
  } finally {
    rmSync(workspaceRoot, { recursive: true, force: true });
  }
}

test("parseSddpConfigContent reads section-scoped paths and autopilot state", () => {
  const parsed = parseSddpConfigContent(`# SDD Project Configuration

## Product Document

**Path**: docs/product.md

## Technical Context Document

**Path**: docs/architecture.md

## Deployment & Operations Document

**Path**: docs/operations.md

## Project Plan

**Path**: docs/project-plan.md

## Autopilot

**Enabled**: true
`);

  assert.deepEqual(parsed, {
    productDocPath: "docs/product.md",
    techContextDocPath: "docs/architecture.md",
    dodPath: "docs/operations.md",
    projectPlanPath: "docs/project-plan.md",
    autopilotEnabled: true,
  });
});

test("applyDefaultDocumentPaths adopts well-known spec paths when config fields are empty", () => {
  withTempWorkspace((workspaceRoot) => {
    mkdirSync(join(workspaceRoot, "specs"), { recursive: true });
    writeFileSync(join(workspaceRoot, "specs", "prd.md"), "", "utf8");
    writeFileSync(join(workspaceRoot, "specs", "sad.md"), "", "utf8");
    writeFileSync(join(workspaceRoot, "specs", "dod.md"), "", "utf8");
    writeFileSync(join(workspaceRoot, "specs", "project-plan.md"), "", "utf8");

    const resolved = applyDefaultDocumentPaths(workspaceRoot, {
      productDocPath: "",
      techContextDocPath: "",
      dodPath: undefined,
      projectPlanPath: "",
      autopilotEnabled: false,
    });

    assert.deepEqual(resolved, {
      productDocPath: "specs/prd.md",
      techContextDocPath: "specs/sad.md",
      dodPath: "specs/dod.md",
      projectPlanPath: "specs/project-plan.md",
      autopilotEnabled: false,
    });
  });
});

test("applyDefaultDocumentPaths preserves explicit registered paths", () => {
  withTempWorkspace((workspaceRoot) => {
    mkdirSync(join(workspaceRoot, "specs"), { recursive: true });
    writeFileSync(join(workspaceRoot, "specs", "prd.md"), "", "utf8");

    const resolved = applyDefaultDocumentPaths(workspaceRoot, {
      productDocPath: "docs/custom-prd.md",
      techContextDocPath: "docs/custom-sad.md",
      dodPath: "docs/custom-dod.md",
      projectPlanPath: "docs/custom-plan.md",
      autopilotEnabled: true,
    });

    assert.deepEqual(resolved, {
      productDocPath: "docs/custom-prd.md",
      techContextDocPath: "docs/custom-sad.md",
      dodPath: "docs/custom-dod.md",
      projectPlanPath: "docs/custom-plan.md",
      autopilotEnabled: true,
    });
  });
});

test("getMissingConfigPrerequisites reports missing registered files with their configured paths", () => {
  withTempWorkspace((workspaceRoot) => {
    mkdirSync(join(workspaceRoot, "docs"), { recursive: true });
    writeFileSync(join(workspaceRoot, "docs", "product.md"), "", "utf8");

    const errors = getMissingConfigPrerequisites(workspaceRoot, {
      productDocPath: "docs/product.md",
      techContextDocPath: "docs/architecture.md",
      dodPath: undefined,
      projectPlanPath: "docs/project-plan.md",
      autopilotEnabled: false,
    });

    assert.deepEqual(errors, [
      "Technical Context Document (docs/architecture.md) not found. Run /sddp-systemdesign first or register an existing technical context document.",
      "Project Plan (docs/project-plan.md) not found. Run /sddp-projectplan first or register an existing project plan.",
    ]);
  });
});
