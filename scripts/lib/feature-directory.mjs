import { existsSync, lstatSync, realpathSync } from "node:fs";
import path from "node:path";

function contained(candidate, root) {
  return candidate !== root && candidate.startsWith(`${root}${path.sep}`);
}

export function resolveFeatureDirectory(featureDir, repoRoot = process.cwd(), { allowMissing = false } = {}) {
  if (typeof featureDir !== "string" || featureDir.length === 0) {
    throw new Error("Feature directory must be a non-empty repository-relative specs/<feature> path");
  }
  if (path.isAbsolute(featureDir) || /^[a-zA-Z]:[\\/]/.test(featureDir) || featureDir.includes("\\")) {
    throw new Error("Feature directory must not be absolute or use backslash separators");
  }

  const segments = featureDir.split("/");
  if (segments.length !== 2 || segments[0] !== "specs" || segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Feature directory must be a normalized specs/<feature> path");
  }

  const canonicalRoot = realpathSync(path.resolve(repoRoot));
  const candidate = path.resolve(canonicalRoot, ...segments);
  if (!contained(candidate, canonicalRoot)) throw new Error("Feature directory escapes repository root");

  let current = canonicalRoot;
  for (const segment of segments) {
    current = path.join(current, segment);
    if (!existsSync(current)) break;
    if (lstatSync(current).isSymbolicLink()) throw new Error(`Feature directory contains symlinked component: ${segment}`);
  }

  if (!existsSync(candidate)) {
    if (!allowMissing) throw new Error(`Feature directory does not exist: ${featureDir}`);
    return { featureDir, absolutePath: candidate, exists: false };
  }
  if (!lstatSync(candidate).isDirectory()) throw new Error(`Feature directory is not a directory: ${featureDir}`);

  const canonicalCandidate = realpathSync(candidate);
  if (!contained(canonicalCandidate, canonicalRoot)) throw new Error("Feature directory canonical path escapes repository root");
  return { featureDir, absolutePath: canonicalCandidate, exists: true };
}
