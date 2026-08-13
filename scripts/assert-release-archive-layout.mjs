#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const archiveRoots = Object.freeze({
  copilot: [".github", ".vscode"],
  antigravity: [".agents", ".github"],
  windsurf: [".github", ".windsurf"],
  opencode: [".github", ".opencode"],
  "claude-code": [".claude", ".github"],
  codex: [".agents", ".codex", ".github"],
});

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `${command} exited with status ${result.status}`);
  }
  return result.stdout;
}

export function inspectArchiveEntries(archivePath) {
  if (!existsSync(archivePath)) throw new Error(`archive not found: ${archivePath}`);
  const symlinks = new Set();
  for (const line of run("zipinfo", ["-l", archivePath]).split("\n")) {
    const match = line.match(/^l.*\s(.+)$/);
    if (match) symlinks.add(match[1].replace(/^\.\//, "").replace(/\/$/, ""));
  }
  return run("unzip", ["-Z1", archivePath])
    .split("\n")
    .map((entry) => entry.replace(/^\.\//, "").replace(/\/$/, ""))
    .filter(Boolean)
    .map((name) => ({ name, type: symlinks.has(name) ? "l" : "-" }));
}

export function assertSafeArchiveEntries(tool, entries) {
  if (entries.some(({ name }) => name.startsWith("/") || name.split("/").includes(".."))) {
    throw new Error("archive contains an unsafe path");
  }
  if (entries.some(({ type }) => type === "l")) throw new Error("archive contains a symlink entry");
  if (entries.some(({ name }) => name.split("/")[0] === `sdd-pilot-${tool}`)) {
    throw new Error(`archive contains a wrapper directory: sdd-pilot-${tool}`);
  }
}

export function assertReleaseArchiveLayout(tool, archivePath) {
  const expectedRoots = archiveRoots[tool];
  if (!expectedRoots) throw new Error(`unknown tool: ${tool}`);
  const entries = inspectArchiveEntries(archivePath);
  if (entries.length === 0) throw new Error("archive is empty");
  assertSafeArchiveEntries(tool, entries);

  for (const root of expectedRoots) {
    if (!entries.some(({ name }) => name === root || name.startsWith(`${root}/`))) {
      throw new Error(`missing archive root: ${root}`);
    }
  }

  const extractionDirectory = mkdtempSync(join(tmpdir(), `sdd-pilot-${tool}-`));
  try {
    run("unzip", ["-q", archivePath, "-d", extractionDirectory]);
    for (const root of expectedRoots) {
      if (!existsSync(join(extractionDirectory, root))) {
        throw new Error(`missing extracted root: ${root}`);
      }
    }
  } finally {
    rmSync(extractionDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , tool, archivePath] = process.argv;
  if (!tool || !archivePath) {
    console.error("Usage: assert-release-archive-layout.mjs <tool> <archive.zip>");
    process.exit(2);
  }
  try {
    assertReleaseArchiveLayout(tool, archivePath);
    console.log(`Archive layout valid: ${tool} (${archivePath})`);
  } catch (error) {
    console.error(`Archive layout invalid: ${error.message}`);
    process.exit(1);
  }
}
