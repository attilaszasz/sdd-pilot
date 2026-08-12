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

function runUnzip(args) {
  const result = spawnSync("unzip", args, { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `unzip exited with status ${result.status}`);
  }
  return result.stdout;
}

export function assertReleaseArchiveLayout(tool, archivePath) {
  const expectedRoots = archiveRoots[tool];
  if (!expectedRoots) throw new Error(`unknown tool: ${tool}`);
  if (!existsSync(archivePath)) throw new Error(`archive not found: ${archivePath}`);

  const entries = runUnzip(["-Z1", archivePath])
    .split("\n")
    .map((entry) => entry.replace(/^\.\//, "").replace(/\/$/, ""))
    .filter(Boolean);
  if (entries.length === 0) throw new Error("archive is empty");
  if (entries.some((entry) => entry.startsWith("/") || entry.split("/").includes(".."))) {
    throw new Error("archive contains an unsafe path");
  }

  for (const root of expectedRoots) {
    if (!entries.some((entry) => entry === root || entry.startsWith(`${root}/`))) {
      throw new Error(`missing archive root: ${root}`);
    }
  }

  const extractionDirectory = mkdtempSync(join(tmpdir(), `sdd-pilot-${tool}-`));
  try {
    runUnzip(["-q", archivePath, "-d", extractionDirectory]);
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
