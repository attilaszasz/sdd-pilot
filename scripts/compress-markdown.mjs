#!/usr/bin/env node

import { access, copyFile, lstat, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  compressMarkdown,
  getBackupPath,
  getCompressionPolicy,
  REPOSITORY_ROOT,
  summarizeCompression,
  validateCompressedMarkdown,
} from "./lib/markdown-compression.mjs";

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const canonicalPath = await resolveTargetPath(options.filePath);

  const policy = getCompressionPolicy(canonicalPath);

  if (!policy.allowed) {
    throw new Error(`Blocked: ${policy.reason}`);
  }

  const original = await readFile(canonicalPath, "utf8");
  const narrativeOnly = options.narrativeOnly || policy.mode === "narrative-only";
  const compressed = compressMarkdown(original, { narrativeOnly });
  const validation = validateCompressedMarkdown({
    original,
    compressed,
    targetPath: canonicalPath,
    mode: narrativeOnly ? "narrative-only" : policy.mode,
  });

  if (!validation.ok) {
    throw new Error(`Validation failed:\n- ${validation.errors.join("\n- ")}`);
  }

  const summary = summarizeCompression(original, compressed);

  if (options.stdout) {
    process.stdout.write(compressed);
    return;
  }

  if (options.idempotent) {
    if (compressed !== original) {
      throw new Error(`Idempotence failed: ${canonicalPath} still has compressible content. Run --stdout to review the proposed output.`);
    }

    console.log(`Idempotence: PASS ${canonicalPath}`);
    return;
  }

  if (options.check) {
    console.log(`Allowed: ${canonicalPath}`);
    console.log(`Chars: ${summary.before} -> ${summary.after} (${summary.delta >= 0 ? "-" : "+"}${Math.abs(summary.percent)}%)`);
    console.log("Validation: PASS");
    return;
  }

  if (compressed === original) {
    console.log(`No changes: ${canonicalPath}`);
    return;
  }

  const backupPath = getBackupPath(canonicalPath);
  await ensureBackup(canonicalPath, backupPath);
  await writeFile(canonicalPath, compressed, "utf8");

  console.log(`Compressed: ${canonicalPath}`);
  console.log(`Backup: ${backupPath}`);
  console.log(`Chars: ${summary.before} -> ${summary.after} (${summary.delta >= 0 ? "-" : "+"}${Math.abs(summary.percent)}%)`);
}

async function resolveTargetPath(filePath) {
  const repositoryRoot = await realpath(REPOSITORY_ROOT);
  const absolutePath = path.resolve(String(filePath).replaceAll("\\", path.sep));
  const relativePath = path.relative(repositoryRoot, absolutePath);

  if (relativePath === "" || relativePath === ".." || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    throw new Error("Blocked: target must be a file inside the repository.");
  }

  let currentPath = repositoryRoot;
  for (const component of relativePath.split(path.sep)) {
    currentPath = path.join(currentPath, component);
    if ((await lstat(currentPath)).isSymbolicLink()) {
      throw new Error("Blocked: symbolic-link paths are not supported.");
    }
  }

  const canonicalPath = await realpath(absolutePath);
  if (canonicalPath !== absolutePath || !isContainedBy(repositoryRoot, canonicalPath)) {
    throw new Error("Blocked: symbolic-link paths are not supported.");
  }

  return canonicalPath;
}

function isContainedBy(rootPath, targetPath) {
  const relativePath = path.relative(rootPath, targetPath);
  return relativePath !== "" && relativePath !== ".." && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath);
}

function parseArgs(argv) {
  const options = {
    check: false,
    idempotent: false,
    narrativeOnly: false,
    stdout: false,
    filePath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--check") {
      options.check = true;
      continue;
    }
    if (value === "--idempotent") {
      options.idempotent = true;
      continue;
    }
    if (value === "--narrative-only") {
      options.narrativeOnly = true;
      continue;
    }
    if (value === "--stdout") {
      options.stdout = true;
      continue;
    }
    if (value.startsWith("--")) {
      throw new Error(`Unknown option: ${value}`);
    }
    if (options.filePath) {
      throw new Error("Only one target file is supported.");
    }
    options.filePath = value;
  }

  if (!options.filePath) {
    throw new Error("Usage: node scripts/compress-markdown.mjs [--check|--idempotent|--stdout] [--narrative-only] <markdown-file>");
  }

  if (options.idempotent && options.stdout) {
    throw new Error("--idempotent cannot be combined with --stdout.");
  }

  return options;
}

async function ensureBackup(sourcePath, backupPath) {
  try {
    await access(backupPath);
  } catch {
    await copyFile(sourcePath, backupPath);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
