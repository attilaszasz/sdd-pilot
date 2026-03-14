import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Epic } from "./types.js";
import { epicTitleToSlug } from "./project-plan.js";

interface FeatureDirCandidate {
  dirName: string;
  epicPrefix?: string;
}

function normalizeFeatureDirName(dirName: string): FeatureDirCandidate {
  const withoutNumericPrefix = dirName.replace(/^\d+-/, "");
  const epicPrefixMatch = withoutNumericPrefix.match(/^(e\d{3})-(.+)$/);

  if (!epicPrefixMatch) {
    return { dirName: withoutNumericPrefix };
  }

  return {
    dirName: epicPrefixMatch[2],
    epicPrefix: epicPrefixMatch[1],
  };
}

function getFeatureDirEntries(specsDir: string): string[] {
  return readdirSync(specsDir, { withFileTypes: true })
    .filter((entry: { isDirectory(): boolean }) => entry.isDirectory())
    .map((entry: { name: string }) => entry.name)
    .sort();
}

function matchesEpicFeatureDir(dirName: string, epic: Epic): boolean {
  const expectedSlug = epicTitleToSlug(epic.title);
  const normalized = normalizeFeatureDirName(dirName);

  if (normalized.epicPrefix && normalized.epicPrefix !== epic.id.toLowerCase()) {
    return false;
  }

  return normalized.dirName === expectedSlug || normalized.dirName.startsWith(`${expectedSlug}-`);
}

export function findMatchingFeatureDir(
  workspaceRoot: string,
  epic: Epic,
  options?: { requireQcPassed?: boolean },
): string | undefined {
  const specsDir = join(workspaceRoot, "specs");
  if (!existsSync(specsDir)) return undefined;

  const matchingEntries = getFeatureDirEntries(specsDir)
    .filter((dirName) => matchesEpicFeatureDir(dirName, epic))
    .filter((dirName) => {
      if (!options?.requireQcPassed) return true;
      return existsSync(join(specsDir, dirName, ".qc-passed"));
    });

  if (matchingEntries.length === 0) {
    return undefined;
  }

  const explicitEpicMatches = matchingEntries.filter((dirName) => {
    return normalizeFeatureDirName(dirName).epicPrefix === epic.id.toLowerCase();
  });

  if (explicitEpicMatches.length === 1) {
    return join("specs", explicitEpicMatches[0]);
  }

  if (explicitEpicMatches.length > 1) {
    return undefined;
  }

  if (matchingEntries.length === 1) {
    return join("specs", matchingEntries[0]);
  }

  return undefined;
}

export function findCompletedFeatureDir(
  workspaceRoot: string,
  epic: Epic,
  predictedFeatureDir?: string,
): string | undefined {
  const matchedFeatureDir = findMatchingFeatureDir(workspaceRoot, epic, { requireQcPassed: true });
  if (matchedFeatureDir) {
    return matchedFeatureDir;
  }

  if (!predictedFeatureDir) {
    return undefined;
  }

  return existsSync(join(workspaceRoot, predictedFeatureDir, ".qc-passed"))
    ? predictedFeatureDir
    : undefined;
}

export function isEpicComplete(workspaceRoot: string, epic: Epic): boolean {
  return findMatchingFeatureDir(workspaceRoot, epic, { requireQcPassed: true }) != null;
}