#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveFeatureDirectory } from "./lib/feature-directory.mjs";

function main() {
  const allowMissing = process.argv[2] === "--allow-missing";
  const featureDir = process.argv[allowMissing ? 3 : 2];
  if (!featureDir) throw new Error("Usage: node scripts/resolve-feature-dir.mjs [--allow-missing] specs/<feature>");
  console.log(JSON.stringify(resolveFeatureDirectory(featureDir, process.cwd(), { allowMissing })));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
