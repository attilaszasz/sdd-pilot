#!/usr/bin/env node

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.argv[2] || process.argv.length !== 3) throw new Error("Usage: ensure-implement-state-ignored.mjs DIRECTORY");
    ensureImplementStateIgnored(process.argv[2]);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
