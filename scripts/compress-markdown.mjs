#!/usr/bin/env node

import { access, copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  compressMarkdown,
  getBackupPath,
  getCompressionPolicy,
  summarizeCompression,
  validateCompressedMarkdown,
} from "./lib/markdown-compression.mjs";

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const absolutePath = path.resolve(options.filePath);
  const policy = getCompressionPolicy(absolutePath);

  if (!policy.allowed) {
    throw new Error(`Blocked: ${policy.reason}`);
  }

  const original = await readFile(absolutePath, "utf8");
  const narrativeOnly = options.narrativeOnly || policy.mode === "narrative-only";
  const compressed = compressMarkdown(original, { narrativeOnly });
  const validation = validateCompressedMarkdown({
    original,
    compressed,
    targetPath: absolutePath,
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
      throw new Error(`Idempotence failed: ${absolutePath} still has compressible content. Run --stdout to review the proposed output.`);
    }

    console.log(`Idempotence: PASS ${absolutePath}`);
    return;
  }

  if (options.check) {
    console.log(`Allowed: ${absolutePath}`);
    console.log(`Chars: ${summary.before} -> ${summary.after} (${summary.delta >= 0 ? "-" : "+"}${Math.abs(summary.percent)}%)`);
    console.log("Validation: PASS");
    return;
  }

  if (compressed === original) {
    console.log(`No changes: ${absolutePath}`);
    return;
  }

  const backupPath = getBackupPath(absolutePath);
  await ensureBackup(absolutePath, backupPath);
  await writeFile(absolutePath, compressed, "utf8");

  console.log(`Compressed: ${absolutePath}`);
  console.log(`Backup: ${backupPath}`);
  console.log(`Chars: ${summary.before} -> ${summary.after} (${summary.delta >= 0 ? "-" : "+"}${Math.abs(summary.percent)}%)`);
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
