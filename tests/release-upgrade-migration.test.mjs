import { test } from "node:test";
import { deepEqual, equal, throws } from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { migrateV033Workflows, retiredWorkflowSkills } from "../scripts/migrate-v033-workflows.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "release-upgrade-"));
  mkdirSync(join(root, ".github", "sddp", "workflows"), { recursive: true });
  return root;
}

test("RUM-001: v0.32 workflow skills leave discovery paths without losing content", () => {
  const root = fixture();
  try {
    for (const name of retiredWorkflowSkills) {
      const directory = join(root, ".github", "skills", name);
      mkdirSync(directory, { recursive: true });
      writeFileSync(join(directory, "SKILL.md"), `legacy ${name}\n`);
    }

    const result = migrateV033Workflows(root);
    deepEqual(result.moved, retiredWorkflowSkills);
    for (const name of retiredWorkflowSkills) {
      equal(existsSync(join(root, ".github", "skills", name)), false);
      equal(readFileSync(join(root, result.backupRoot, name, "SKILL.md"), "utf8"), `legacy ${name}\n`);
    }
    deepEqual(migrateV033Workflows(root).moved, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("RUM-002: migration conflicts fail before changing discovery paths", () => {
  const root = fixture();
  const first = retiredWorkflowSkills[0];
  const second = retiredWorkflowSkills[1];
  try {
    mkdirSync(join(root, ".github", "skills", first), { recursive: true });
    mkdirSync(join(root, ".github", "skills", second), { recursive: true });
    mkdirSync(join(root, ".sddp-migrations", "v0.33.0-retired-workflows", second), { recursive: true });
    throws(() => migrateV033Workflows(root), /migration backup already exists/);
    equal(existsSync(join(root, ".github", "skills", first)), true);
    equal(existsSync(join(root, ".github", "skills", second)), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("RUM-003: migration requires the replacement canonical workflow tree", () => {
  const root = mkdtempSync(join(tmpdir(), "release-upgrade-"));
  try {
    throws(() => migrateV033Workflows(root), /missing canonical workflow directory/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
