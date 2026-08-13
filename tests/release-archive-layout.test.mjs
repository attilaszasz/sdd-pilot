import { test } from "node:test";
import { equal, match, ok, throws } from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { archiveRoots, assertReleaseArchiveLayout, assertSafeArchiveEntries } from "../scripts/assert-release-archive-layout.mjs";

const release = readFileSync(fileURLToPath(new URL("../.github/workflows/release.yml", import.meta.url)), "utf8");

function createArchive(tool, { mixedWrapper = false, omitRoot, symlink = false } = {}) {
  const directory = mkdtempSync(join(tmpdir(), `archive-layout-${tool}-`));
  const staging = join(directory, "staging");
  mkdirSync(staging, { recursive: true });
  for (const root of archiveRoots[tool]) {
    if (root === omitRoot) continue;
    mkdirSync(join(staging, root), { recursive: true });
    writeFileSync(join(staging, root, "discovery-marker"), root);
  }
  if (mixedWrapper) {
    mkdirSync(join(staging, `sdd-pilot-${tool}`, ".github"), { recursive: true });
    writeFileSync(join(staging, `sdd-pilot-${tool}`, ".github", "marker"), "wrapper");
  }
  if (symlink) symlinkSync(join(staging, archiveRoots[tool][0], "discovery-marker"), join(staging, "link"));
  const archive = join(directory, `${tool}.zip`);
  const result = spawnSync("zip", ["-qry", archive, "."], { cwd: staging, encoding: "utf8" });
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

test("TR-001 rejects wrapper and mixed-wrapper archives for every tool", () => {
  for (const tool of Object.keys(archiveRoots)) {
    const wrapperOnly = mkdtempSync(join(tmpdir(), `archive-wrapper-${tool}-`));
    const wrapperArchive = join(wrapperOnly, `${tool}.zip`);
    mkdirSync(join(wrapperOnly, `sdd-pilot-${tool}`, ".github"), { recursive: true });
    equal(spawnSync("zip", ["-qr", wrapperArchive, `sdd-pilot-${tool}`], { cwd: wrapperOnly }).status, 0);
    const mixed = createArchive(tool, { mixedWrapper: true });
    try {
      throws(() => assertReleaseArchiveLayout(tool, wrapperArchive), /wrapper directory/);
      throws(() => assertReleaseArchiveLayout(tool, mixed.archive), /wrapper directory/);
    } finally {
      rmSync(wrapperOnly, { recursive: true, force: true });
      rmSync(mixed.directory, { recursive: true, force: true });
    }
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

test("TR-002 admits only safe direct-root archives", () => {
  const fixture = createArchive("opencode", { symlink: true });
  try {
    throws(() => assertReleaseArchiveLayout("opencode", fixture.archive), /symlink entry/);
  } finally {
    rmSync(fixture.directory, { recursive: true, force: true });
  }
});

test("RAL-006: unsafe archive paths fail before extraction", () => {
  throws(() => assertSafeArchiveEntries("opencode", [{ name: "../escape", type: "-" }]), /unsafe path/);
  throws(() => assertSafeArchiveEntries("opencode", [{ name: "/absolute", type: "-" }]), /unsafe path/);
});

test("RAL-005: installation documentation describes direct root extraction", () => {
  const readme = readFileSync(fileURLToPath(new URL("../README.md", import.meta.url)), "utf8");
  match(readme, /Extract the archive contents directly to your project root/);
  ok(!/move (?:the )?(?:extracted )?files/i.test(readme));
});
