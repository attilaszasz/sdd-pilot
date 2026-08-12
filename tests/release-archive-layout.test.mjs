import { test } from "node:test";
import { equal, match, ok, throws } from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { archiveRoots, assertReleaseArchiveLayout } from "../scripts/assert-release-archive-layout.mjs";

const release = readFileSync(fileURLToPath(new URL("../.github/workflows/release.yml", import.meta.url)), "utf8");

function createArchive(tool, { wrapper = false, omitRoot } = {}) {
  const directory = mkdtempSync(join(tmpdir(), `archive-layout-${tool}-`));
  const staging = join(directory, wrapper ? `sdd-pilot-${tool}` : "staging");
  mkdirSync(staging, { recursive: true });
  for (const root of archiveRoots[tool]) {
    if (root === omitRoot) continue;
    mkdirSync(join(staging, root), { recursive: true });
    writeFileSync(join(staging, root, "discovery-marker"), root);
  }
  const archive = join(directory, `${tool}.zip`);
  const args = wrapper ? ["-qr", archive, `sdd-pilot-${tool}`] : ["-qr", archive, "."];
  const result = spawnSync("zip", args, { cwd: wrapper ? directory : staging, encoding: "utf8" });
  equal(result.status, 0, result.stderr);
  return { archive, directory };
}

test("RAL-001: every release job archives staging contents and asserts its tool layout", () => {
  for (const tool of Object.keys(archiveRoots)) {
    match(release, new RegExp(`node scripts/assert-release-archive-layout\\.mjs ${tool} \\\"\\$[A-Z_]+ARCHIVE\\\"`));
  }
  equal([...release.matchAll(/\(cd "\$STAGING" && zip -r "\$GITHUB_WORKSPACE\/\$[A-Z_]+ARCHIVE" \.\)/g)].length, 6);
  equal([...release.matchAll(/zip -r "\$[A-Z_]+ARCHIVE" "\$STAGING"/g)].length, 0);
});

test("RAL-002: direct extraction preserves every tool's hidden discovery roots", () => {
  for (const tool of Object.keys(archiveRoots)) {
    const fixture = createArchive(tool);
    try {
      assertReleaseArchiveLayout(tool, fixture.archive);
    } finally {
      rmSync(fixture.directory, { recursive: true, force: true });
    }
  }
});

test("RAL-003: an extra wrapper directory fails closed", () => {
  const fixture = createArchive("opencode", { wrapper: true });
  try {
    throws(() => assertReleaseArchiveLayout("opencode", fixture.archive), /missing archive root: \.github/);
  } finally {
    rmSync(fixture.directory, { recursive: true, force: true });
  }
});

test("RAL-004: a missing required root and unknown tool fail closed", () => {
  const fixture = createArchive("codex", { omitRoot: ".codex" });
  try {
    throws(() => assertReleaseArchiveLayout("codex", fixture.archive), /missing archive root: \.codex/);
    throws(() => assertReleaseArchiveLayout("unsupported", fixture.archive), /unknown tool/);
  } finally {
    rmSync(fixture.directory, { recursive: true, force: true });
  }
});

test("RAL-005: installation documentation describes direct root extraction", () => {
  const readme = readFileSync(fileURLToPath(new URL("../README.md", import.meta.url)), "utf8");
  match(readme, /Extract the archive contents directly to your project root/);
  ok(!/move (?:the )?(?:extracted )?files/i.test(readme));
});
