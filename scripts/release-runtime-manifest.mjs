#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { builtinModules } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { assertSafeArchiveEntries, inspectArchiveEntries } from "./assert-release-archive-layout.mjs";
import { delegatedAgents, openCodeCoordinatorAgents } from "./lib/delegated-agents.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

export const releaseDocumentationFiles = Object.freeze([
  "AGENTS.md",
  "project-instructions.md",
  "README.md",
  "docs/reference.md",
  "docs/sddp-prd-user-guide.md",
  "docs/sddp-systemdesign-user-guide.md",
  "LICENSE",
]);

// These scripts are invoked by canonical workflows or their delegated agents.
export const coreRuntimeEntryPoints = Object.freeze([
  "scripts/checklist-state.mjs",
  "scripts/derive-completion-state.mjs",
  "scripts/ensure-implement-state-ignored.mjs",
  "scripts/parse-requirement-ownership.mjs",
  "scripts/parse-stress-test-findings.mjs",
  "scripts/parse-tasks.mjs",
  "scripts/phase-gates.mjs",
  "scripts/resolve-feature-dir.mjs",
  "scripts/runtime-preflight.mjs",
  "scripts/validate-prd.mjs",
  "scripts/validate-sad.mjs",
  "scripts/lib/qc-bug-tasks.mjs",
  "scripts/lib/workflow-state.mjs",
]);

// These tools are installed for supported consumer maintenance, not lifecycle execution.
export const diagnosticUtilityEntryPoints = Object.freeze([
  "scripts/compress-markdown.mjs",
  "scripts/drift-report.mjs",
]);

// These release and test helpers stay in the source checkout.
export const maintainerOnlyFiles = Object.freeze([
  "scripts/assert-release-archive-layout.mjs",
  "scripts/evaluate-feature-lifecycle.mjs",
  "scripts/release-runtime-manifest.mjs",
  "scripts/release-tag.mjs",
]);
// These files were previously included in consumer archives but run only in release or test jobs.
export const consumerArchiveCleanupFiles = Object.freeze([
  "scripts/assert-release-archive-layout.mjs",
  "scripts/evaluate-feature-lifecycle.mjs",
  "scripts/release-runtime-manifest.mjs",
]);
const localReference = /(?:^|[^A-Za-z0-9_-])((?:\.github|\.agents|\.claude|\.windsurf|\.opencode|\.codex|scripts)\/[A-Za-z0-9_./-]+\.(?:md|mjs|json|toml))/g;
const hostAgentInventories = Object.freeze([
  { host: "copilot", label: "Copilot", marker: ".github/prompts" },
  { host: "claude", label: "Claude", marker: ".claude" },
  { host: "codex", label: "Codex", marker: ".codex" },
  { host: "opencode", label: "OpenCode", marker: ".opencode" },
]);
const nodeBuiltins = new Set(builtinModules.map((specifier) => `node:${specifier.replace(/^node:/, "")}`));

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
  for (const relativePath of stagedReleaseFiles) {
    const destination = join(stagingDirectory, relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(join(repoRoot, relativePath), destination, { recursive: true });
  }
}

const localModuleSpecifier = /(?:\bimport\s*(?:[^'"()]*?\s+from\s*)?|\bexport\s+[^'"()]*?\s+from\s*|\bimport\s*\()(['"])(\.\.?\/[^'"\n]+)\1/g;

function skipTrivia(source, index) {
  while (index < source.length) {
    if (/\s/.test(source[index])) index += 1;
    else if (source.startsWith("//", index)) {
      const newline = source.indexOf("\n", index + 2);
      index = newline === -1 ? source.length : newline + 1;
    } else if (source.startsWith("/*", index)) {
      const end = source.indexOf("*/", index + 2);
      index = end === -1 ? source.length : end + 2;
    } else break;
  }
  return index;
}

function readString(source, index) {
  const quote = source[index];
  if (quote !== "'" && quote !== '"' && quote !== "`") return null;
  let value = "";
  for (let cursor = index + 1; cursor < source.length; cursor += 1) {
    if (source[cursor] === "\\") {
      value += source.slice(cursor, cursor + 2);
      cursor += 1;
    } else if (source[cursor] === quote) return { value, end: cursor + 1 };
    else value += source[cursor];
  }
  return null;
}

function findFromSpecifier(source, index) {
  for (let cursor = index; cursor < source.length; cursor += 1) {
    if (source[cursor] === ";") return null;
    if (source.startsWith("//", cursor) || source.startsWith("/*", cursor)) {
      cursor = skipTrivia(source, cursor) - 1;
      continue;
    }
    if (source[cursor] === "'" || source[cursor] === '"' || source[cursor] === "`") {
      const string = readString(source, cursor);
      if (!string) return null;
      cursor = string.end - 1;
      continue;
    }
    if (source.startsWith("from", cursor) && !/[A-Za-z0-9_$]/.test(source[cursor - 1] || "") && !/[A-Za-z0-9_$]/.test(source[cursor + 4] || "")) {
      return readString(source, skipTrivia(source, cursor + 4));
    }
  }
  return null;
}

export function scanRuntimeDependencies(source) {
  const dependencies = [];
  for (let index = 0; index < source.length; index += 1) {
    if (source.startsWith("//", index) || source.startsWith("/*", index)) {
      index = skipTrivia(source, index) - 1;
      continue;
    }
    if (source[index] === "'" || source[index] === '"' || source[index] === "`") {
      const string = readString(source, index);
      index = string ? string.end - 1 : source.length;
      continue;
    }
    const isImport = source.startsWith("import", index);
    const isExport = source.startsWith("export", index);
    if ((!isImport && !isExport) || source[index - 1] === "." || /[A-Za-z0-9_$]/.test(source[index - 1] || "") || /[A-Za-z0-9_$]/.test(source[index + 6] || "")) continue;
    const next = skipTrivia(source, index + 6);
    if (isImport && source[next] === "(") {
      const dynamicSpecifier = skipTrivia(source, next + 1);
      const specifier = source[dynamicSpecifier] === "'" || source[dynamicSpecifier] === '"' ? readString(source, dynamicSpecifier) : null;
      dependencies.push(specifier ? { specifier: specifier.value } : { specifier: null });
    } else {
      const specifier = source[next] === "'" || source[next] === '"' ? readString(source, next) : findFromSpecifier(source, next);
      if (specifier) dependencies.push({ specifier: specifier.value });
    }
  }
  return dependencies;
}

function runtimeDependencyFiles(directory, entries = filesUnder(directory)) {
  const root = `${directory}/`;
  return entries.filter((filePath) => {
    const relative = filePath.slice(root.length);
    return filePath.endsWith(".mjs") && (relative.startsWith("scripts/") || relative.startsWith(".github/sddp/"));
  });
}

export function assertRuntimeDependencyPolicy(directory, entries) {
  const root = `${directory}/`;
  const errors = [];
  for (const filePath of runtimeDependencyFiles(directory, entries)) {
    const relative = filePath.slice(root.length);
    for (const { specifier } of scanRuntimeDependencies(readFileSync(filePath, "utf8"))) {
      if (specifier === null) errors.push(`non-literal dynamic runtime import: ${relative}`);
      else if (!nodeBuiltins.has(specifier) && !specifier.startsWith("./") && !specifier.startsWith("../")) {
        errors.push(`unsupported runtime import: ${specifier} (from ${relative})`);
      }
    }
  }
  if (errors.length > 0) throw new Error([...new Set(errors)].join("\n"));
}

export function discoverLocalModuleClosure(directory, entries = filesUnder(directory)) {
  const root = directory.endsWith("/") ? directory : `${directory}/`;
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

function resolveInventoryClosure(entryPoints) {
  return Object.freeze([...discoverLocalModuleClosure(repoRoot, entryPoints.map((path) => join(repoRoot, path)))].sort());
}

export const coreConsumerRuntimeFiles = resolveInventoryClosure(coreRuntimeEntryPoints);
const diagnosticClosure = resolveInventoryClosure(diagnosticUtilityEntryPoints);
export const installedDiagnosticFiles = Object.freeze(diagnosticClosure.filter((path) => !coreConsumerRuntimeFiles.includes(path)));
export const releaseFileInventories = Object.freeze({
  documentation: releaseDocumentationFiles,
  core: coreConsumerRuntimeFiles,
  diagnostics: installedDiagnosticFiles,
  maintainer: maintainerOnlyFiles,
});
export const stagedReleaseFiles = Object.freeze([
  ...releaseDocumentationFiles,
  ...coreConsumerRuntimeFiles,
  ...installedDiagnosticFiles,
].sort());

function categoryFor(path) {
  for (const [category, files] of Object.entries(releaseFileInventories)) {
    if (files.includes(path)) return category;
  }
  return null;
}

function resolveLocalDependency(directory, filePath, specifier) {
  return fileURLToPath(new URL(specifier, pathToFileURL(filePath))).slice(`${directory}/`.length);
}

export function assertCoreRuntimeDependencyPolicy(directory) {
  const errors = [];
  for (const relative of coreConsumerRuntimeFiles) {
    const filePath = join(directory, relative);
    if (!existsSync(filePath)) continue;
    for (const { specifier } of scanRuntimeDependencies(readFileSync(filePath, "utf8"))) {
      if (!specifier?.startsWith(".")) continue;
      const dependency = resolveLocalDependency(directory, filePath, specifier);
      const category = categoryFor(dependency);
      if (category === "diagnostics" || category === "maintainer") {
        errors.push(`core runtime imports ${category} module: ${relative} -> ${dependency}`);
      }
    }
  }
  if (errors.length > 0) throw new Error([...new Set(errors)].join("\n"));
}

export function assertStagedFilesCategorized(directory, entries = filesUnder(directory)) {
  const root = `${directory}/`;
  const errors = entries
    .filter((filePath) => filePath.startsWith(`${directory}/scripts/`) && filePath.endsWith(".mjs"))
    .map((filePath) => filePath.slice(root.length))
    .filter((relative) => !stagedReleaseFiles.includes(relative))
    .map((relative) => `uncategorized staged script: ${relative}`);
  if (errors.length > 0) throw new Error(errors.join("\n"));
}

function assertImportable(filePath) {
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", `import(${JSON.stringify(pathToFileURL(filePath).href)})`], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`cannot import local module: ${filePath}: ${result.stderr.trim()}`);
}

export function validateExtractedRelease(directory) {
  const errors = [];
  for (const relativePath of stagedReleaseFiles) {
    const filePath = join(directory, relativePath);
    if (!existsSync(filePath)) errors.push(`missing runtime file: ${relativePath}`);
    else if (!lstatSync(filePath).isFile()) errors.push(`runtime path is not a regular file: ${relativePath}`);
  }

  for (const { host, label, marker } of hostAgentInventories) {
    const markerPath = join(directory, marker);
    if (!existsSync(markerPath)) continue;
    if (!lstatSync(markerPath).isDirectory()) {
      errors.push(`host marker is not a directory: ${marker}`);
      continue;
    }
    if (host === "opencode") {
      const configPath = join(directory, "opencode.json");
      if (!existsSync(configPath)) errors.push("missing OpenCode root configuration: opencode.json");
      else if (!lstatSync(configPath).isFile()) errors.push("OpenCode root configuration is not a regular file: opencode.json");
    }
    for (const agent of delegatedAgents) {
      const wrapperPath = agent.hosts[host];
      if (!wrapperPath) continue;
      const wrapperFile = join(directory, wrapperPath);
      if (!existsSync(wrapperFile)) errors.push(`missing ${label} ${agent.kind} agent wrapper: ${wrapperPath}`);
      else if (!lstatSync(wrapperFile).isFile()) {
        errors.push(`${label} ${agent.kind} agent wrapper is not a regular file: ${wrapperPath}`);
      }
    }
    if (host === "opencode") {
      for (const coordinator of openCodeCoordinatorAgents) {
        const coordinatorPath = join(directory, coordinator.path);
        if (!existsSync(coordinatorPath)) errors.push(`missing OpenCode coordinator: ${coordinator.path}`);
        else if (!lstatSync(coordinatorPath).isFile()) errors.push(`OpenCode coordinator is not a regular file: ${coordinator.path}`);
      }
    }
  }

  const licensePath = join(directory, "LICENSE");
  if (existsSync(licensePath) && lstatSync(licensePath).isFile() && !/MIT License[\s\S]*Permission is hereby granted/.test(readFileSync(licensePath, "utf8"))) {
    errors.push("LICENSE does not contain the MIT notice");
  }

  for (const filePath of filesUnder(directory).filter((path) => /\.(?:md|json|toml)$/.test(path))) {
    const source = readFileSync(filePath, "utf8");
    for (const match of source.matchAll(localReference)) {
      const referencePath = join(directory, match[1]);
      if (!existsSync(referencePath)) errors.push(`missing local reference: ${match[1]}`);
      else if (!lstatSync(referencePath).isFile()) errors.push(`local reference is not a regular file: ${match[1]}`);
    }
  }

  try {
    assertRuntimeDependencyPolicy(directory);
    assertCoreRuntimeDependencyPolicy(directory);
    const closure = discoverLocalModuleClosure(directory);
    for (const relativePath of [...closure].filter((path) => path.startsWith("scripts/lib/"))) {
      assertImportable(join(directory, relativePath));
    }
    assertStagedFilesCategorized(directory);
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

export function reportReleaseArchiveMetrics(archivePath) {
  if (!existsSync(archivePath)) throw new Error(`archive not found: ${archivePath}`);
  const entries = inspectArchiveEntries(archivePath);
  const removedBytes = consumerArchiveCleanupFiles.reduce((total, relativePath) => total + statSync(join(repoRoot, relativePath)).size, 0);
  console.log(`Archive metrics: ${entries.length} entries, ${statSync(archivePath).size} bytes; consumer inventory delta: -${consumerArchiveCleanupFiles.length} files, -${removedBytes} source bytes`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , command, path] = process.argv;
  try {
    if (command === "stage" && path) stageReleaseRuntime(path);
    else if (command === "validate" && path) validateReleaseArchive(path);
    else if (command === "metrics" && path) reportReleaseArchiveMetrics(path);
    else throw new Error("Usage: release-runtime-manifest.mjs <stage DIRECTORY|validate ARCHIVE|metrics ARCHIVE>");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
