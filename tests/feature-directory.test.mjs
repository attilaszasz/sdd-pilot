import { mkdtempSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { deepEqual, throws } from "node:assert/strict";

import { resolveFeatureDirectory } from "../scripts/lib/feature-directory.mjs";

const roots = [];
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "sddp-feature-dir-"));
  roots.push(root);
  mkdirSync(path.join(root, "specs", "00001-valid"), { recursive: true });
  mkdirSync(path.join(root, "specs", "legacy-workspace"));
  return root;
}

test("FDR-001: resolves valid prefixed and existing legacy workspaces repeatedly", () => {
  const root = fixture();
  for (let index = 0; index < 4; index += 1) {
    deepEqual(resolveFeatureDirectory("specs/00001-valid", root), { featureDir: "specs/00001-valid", absolutePath: path.join(root, "specs", "00001-valid"), exists: true });
    deepEqual(resolveFeatureDirectory("specs/legacy-workspace", root), { featureDir: "specs/legacy-workspace", absolutePath: path.join(root, "specs", "legacy-workspace"), exists: true });
  }
});

test("FDR-002: rejects absolute, drive, traversal, mixed-separator, and malformed paths", () => {
  const root = fixture();
  for (const candidate of ["/tmp/feature", "C:\\feature", "../feature", "specs/../feature", "specs\\00001-valid", "specs//00001-valid", "specs/.", "specs/00001-valid/extra"]) {
    throws(() => resolveFeatureDirectory(candidate, root), /Feature directory/);
  }
});

test("FDR-003: rejects symlinked feature, parent, and specs directories", () => {
  const root = fixture();
  const outside = mkdtempSync(path.join(tmpdir(), "sddp-feature-outside-"));
  roots.push(outside);
  mkdirSync(path.join(outside, "feature"));
  symlinkSync(path.join(outside, "feature"), path.join(root, "specs", "linked-feature"));
  throws(() => resolveFeatureDirectory("specs/linked-feature", root), /symlinked/);

  const parentRoot = mkdtempSync(path.join(tmpdir(), "sddp-feature-parent-"));
  roots.push(parentRoot);
  symlinkSync(path.join(root, "specs"), path.join(parentRoot, "specs"));
  throws(() => resolveFeatureDirectory("specs/00001-valid", parentRoot), /symlinked/);
});

test("FDR-004: missing paths are rejected for readers and allowed only explicitly for creators", () => {
  const root = fixture();
  throws(() => resolveFeatureDirectory("specs/00002-new", root), /does not exist/);
  deepEqual(resolveFeatureDirectory("specs/00002-new", root, { allowMissing: true }), { featureDir: "specs/00002-new", absolutePath: path.join(root, "specs", "00002-new"), exists: false });
});
