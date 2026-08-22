#!/usr/bin/env node

import { existsSync, lstatSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const retiredWorkflowSkills = Object.freeze([
  "amend-project",
  "analyze-compliance",
  "autopilot-pipeline",
  "clarify-spec",
  "deployment-operations",
  "environment-setup",
  "generate-checklist",
  "generate-tasks",
  "implement-qc-loop",
  "implement-tasks",
  "init-project",
  "plan-feature",
  "product-document",
  "project-planning",
  "prototype-regen",
  "quality-control",
  "specify-feature",
  "system-design",
]);

export function migrateV033Workflows(projectRoot) {
  const root = resolve(projectRoot);
  const canonicalRoot = join(root, ".github", "sddp", "workflows");
  if (!existsSync(canonicalRoot) || !lstatSync(canonicalRoot).isDirectory()) {
    throw new Error("missing canonical workflow directory: .github/sddp/workflows");
  }

  const backupRoot = join(root, ".sddp-migrations", "v0.33.0-retired-workflows");
  const moves = retiredWorkflowSkills
    .map((name) => ({
      name,
      source: join(root, ".github", "skills", name),
      destination: join(backupRoot, name),
    }))
    .filter(({ source }) => existsSync(source));

  if (moves.length > 0 && existsSync(backupRoot)) {
    throw new Error("migration backup already exists: .sddp-migrations/v0.33.0-retired-workflows");
  }
  for (const { name, source, destination } of moves) {
    if (lstatSync(source).isSymbolicLink()) throw new Error(`refusing to migrate symlink: .github/skills/${name}`);
    if (existsSync(destination)) throw new Error(`migration backup already exists: .sddp-migrations/v0.33.0-retired-workflows/${name}`);
  }

  if (moves.length === 0) return { moved: [], backupRoot: null };

  mkdirSync(backupRoot, { recursive: true });
  const completed = [];
  try {
    for (const move of moves) {
      renameSync(move.source, move.destination);
      completed.push(move);
    }
  } catch (error) {
    for (const move of completed.reverse()) renameSync(move.destination, move.source);
    if (existsSync(backupRoot)) rmSync(backupRoot, { recursive: true, force: true });
    throw new Error(`workflow migration failed and was rolled back: ${error.message}`);
  }

  return {
    moved: moves.map(({ name }) => name),
    backupRoot: ".sddp-migrations/v0.33.0-retired-workflows",
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = migrateV033Workflows(process.argv[2] ?? process.cwd());
    if (result.moved.length === 0) console.log("No retired v0.32 workflow skills found.");
    else console.log(`Moved ${result.moved.length} retired workflow skill(s) to ${result.backupRoot}.`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
