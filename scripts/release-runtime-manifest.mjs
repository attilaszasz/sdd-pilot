#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { assertSafeArchiveEntries, inspectArchiveEntries } from "./assert-release-archive-layout.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

export const releaseRuntimeFiles = Object.freeze([
  "AGENTS.md",
  "project-instructions.md",
  "README.md",
  "docs/reference.md",
  "LICENSE",
  "scripts/compress-markdown.mjs",
  "scripts/assert-release-archive-layout.mjs",
  "scripts/checklist-state.mjs",
  "scripts/derive-completion-state.mjs",
  "scripts/evaluate-feature-lifecycle.mjs",
  "scripts/drift-report.mjs",
  "scripts/parse-requirement-ownership.mjs",
  "scripts/phase-gates.mjs",
  "scripts/parse-stress-test-findings.mjs",
  "scripts/parse-tasks.mjs",
  "scripts/resolve-feature-dir.mjs",
  "scripts/release-runtime-manifest.mjs",
  "scripts/lib/claude-agent-graph.mjs",
  "scripts/lib/canonical-workflow-graph.mjs",
  "scripts/lib/codex-delegate-graph.mjs",
  "scripts/lib/copilot-delegate-graph.mjs",
  "scripts/lib/feature-directory.mjs",
  "scripts/lib/markdown-compression.mjs",
  "scripts/lib/opencode-delegate-graph.mjs",
  "scripts/lib/public-commands.mjs",
  "scripts/lib/qc-bug-tasks.mjs",
  "scripts/lib/qc-evidence.mjs",
  "scripts/lib/wrapper-inventory.mjs",
]);

const copiedRuntimeFiles = releaseRuntimeFiles.filter((path) => !["AGENTS.md", "project-instructions.md"].includes(path));
const localReference = /(?:^|[^A-Za-z0-9_-])((?:\.github|\.agents|\.claude|\.windsurf|\.opencode|\.codex|scripts)\/[A-Za-z0-9_./-]+\.(?:md|mjs|json|toml))/g;

function filesUnder(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...filesUnder(path));
    else files.push(path);
  }
  return files;
}

export function stageReleaseRuntime(stagingDirectory) {
  for (const relativePath of copiedRuntimeFiles) {
    const destination = join(stagingDirectory, relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(join(repoRoot, relativePath), destination, { recursive: true });
  }
}

export function ensureImplementStateIgnored(projectRoot) {
  const ignorePath = join(projectRoot, ".gitignore");
  let original = "";
  try {
    original = existsSync(ignorePath) ? readFileSync(ignorePath, "utf8") : "";
  } catch (error) {
    throw new Error(`cannot protect .implement-state: ${error.message}`);
  }
  if (original.split(/\r?\n/).includes(".implement-state")) return;
  const addition = original.length > 0 && !original.endsWith("\n") ? "\n.implement-state\n" : ".implement-state\n";
  try {
    appendFileSync(ignorePath, addition, { flag: "a" });
  } catch (error) {
    throw new Error(`cannot protect .implement-state: ${error.message}`);
  }
}

const localModuleSpecifier = /(?:\bimport\s*(?:[^'"()]*?\s+from\s*)?|\bexport\s+[^'"()]*?\s+from\s*|\bimport\s*\()(['"])(\.\.?\/[^'"\n]+)\1/g;

export function discoverLocalModuleClosure(directory, entries = filesUnder(directory)) {
  const root = `${directory}/`;
  const visited = new Set();
  const visit = (filePath) => {
    const relative = filePath.slice(root.length);
    if (visited.has(relative)) return;
    visited.add(relative);
    const source = readFileSync(filePath, "utf8");
    for (const match of source.matchAll(localModuleSpecifier)) {
      const dependency = fileURLToPath(new URL(match[2], pathToFileURL(filePath)));
      if (!dependency.startsWith(root) || !existsSync(dependency)) {
        throw new Error(`missing local module: ${match[2]} (from ${relative})`);
      }
      visit(dependency);
    }
  };
  for (const entry of entries.filter((filePath) => filePath.endsWith(".mjs"))) visit(entry);
  return visited;
}

function assertImportable(filePath) {
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", `import(${JSON.stringify(pathToFileURL(filePath).href)})`], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`cannot import local module: ${filePath}: ${result.stderr.trim()}`);
}

export function validateExtractedRelease(directory) {
  const errors = [];
  for (const relativePath of releaseRuntimeFiles) {
    if (!existsSync(join(directory, relativePath))) errors.push(`missing runtime file: ${relativePath}`);
  }

  const licensePath = join(directory, "LICENSE");
  if (existsSync(licensePath) && !/MIT License[\s\S]*Permission is hereby granted/.test(readFileSync(licensePath, "utf8"))) {
    errors.push("LICENSE does not contain the MIT notice");
  }

  for (const filePath of filesUnder(directory).filter((path) => /\.(?:md|json|toml)$/.test(path))) {
    const source = readFileSync(filePath, "utf8");
    for (const match of source.matchAll(localReference)) {
      if (!existsSync(join(directory, match[1]))) errors.push(`missing local reference: ${match[1]}`);
    }
  }

  try {
    const closure = discoverLocalModuleClosure(directory);
    for (const relativePath of [...closure].filter((path) => path.startsWith("scripts/lib/"))) {
      assertImportable(join(directory, relativePath));
    }
  } catch (error) {
    errors.push(error.message);
  }

  if (errors.length > 0) throw new Error([...new Set(errors)].join("\n"));
}

export function validateReleaseArchive(archivePath) {
  if (!existsSync(archivePath)) throw new Error(`archive not found: ${archivePath}`);
  assertSafeArchiveEntries("runtime", inspectArchiveEntries(archivePath));
  const directory = mkdtempSync(join(tmpdir(), "sdd-pilot-runtime-"));
  try {
    const result = spawnSync("unzip", ["-q", archivePath, "-d", directory], { encoding: "utf8" });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr.trim() || `unzip exited with status ${result.status}`);
    validateExtractedRelease(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , command, path] = process.argv;
  try {
    if (command === "stage" && path) stageReleaseRuntime(path);
    else if (command === "validate" && path) validateReleaseArchive(path);
    else if (command === "ensure-ignore" && path) ensureImplementStateIgnored(path);
    else throw new Error("Usage: release-runtime-manifest.mjs <stage DIRECTORY|validate ARCHIVE|ensure-ignore DIRECTORY>");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
