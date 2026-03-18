#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const rawVersion = process.argv[2];

if (!rawVersion) {
  fail("Usage: node scripts/sync-orchestrator-version.mjs <version|tag>");
}

const version = rawVersion.replace(/^v/, "");

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  fail(`Invalid version: ${rawVersion}`);
}

updatePackageJson(version);
updatePackageLock(version);
updateCliVersion(version);

console.log(`Synchronized orchestrator version to ${version}`);

function updatePackageJson(version) {
  const filePath = path.join(repoRoot, "orchestrator", "package.json");
  const packageJson = readJson(filePath);
  packageJson.version = version;
  writeJson(filePath, packageJson);
}

function updatePackageLock(version) {
  const filePath = path.join(repoRoot, "orchestrator", "package-lock.json");
  const packageLock = readJson(filePath);

  packageLock.version = version;

  if (!packageLock.packages?.[""]) {
    fail("Missing root package entry in orchestrator/package-lock.json");
  }

  packageLock.packages[""].version = version;
  writeJson(filePath, packageLock);
}

function updateCliVersion(version) {
  const filePath = path.join(repoRoot, "orchestrator", "src", "index.ts");
  const source = readFileSync(filePath, "utf8");
  const versionPattern = /\.version\("[^"]+"\)/;

  if (!versionPattern.test(source)) {
    fail("Could not find orchestrator CLI version declaration in orchestrator/src/index.ts");
  }

  const updated = source.replace(versionPattern, `.version("${version}")`);

  writeFileSync(filePath, updated, "utf8");
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}