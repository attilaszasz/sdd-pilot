import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const semverTag = /^v[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.]+)?$/;

export function resolveReleaseTag({ eventName, refName, inputTag }) {
  return eventName === "workflow_dispatch" ? inputTag : refName;
}

export function validateReleaseTag(tag) {
  if (!semverTag.test(tag ?? "")) {
    throw new Error(`Tag '${tag ?? ""}' does not match semantic versioning (expected vX.Y.Z or vX.Y.Z-prerelease)`);
  }
  return tag;
}

export function releaseAssetEnvironment(tag) {
  const validatedTag = validateReleaseTag(tag);
  const tools = ["copilot", "antigravity", "windsurf", "opencode", "claude-code", "codex"];
  return Object.fromEntries([
    ["TAG", validatedTag],
    ...tools.flatMap((tool) => {
      const prefix = tool.replace(/-/g, "_").toUpperCase();
      const archive = `sdd-pilot-${tool}-${validatedTag}.zip`;
      return [[`${prefix}_ARCHIVE`, archive], [`${prefix}_CHECKSUM`, `${archive}.sha256`]];
    }),
  ]);
}

export function initializeReleaseEnvironment(environment = process.env) {
  const tag = resolveReleaseTag({
    eventName: environment.RELEASE_TRIGGER,
    refName: environment.RELEASE_REF_NAME,
    inputTag: environment.RELEASE_TAG_INPUT,
  });
  const values = releaseAssetEnvironment(tag);
  if (environment.GITHUB_ENV) {
    appendFileSync(environment.GITHUB_ENV, `${Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n")}\n`);
  }
  return values;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { TAG } = initializeReleaseEnvironment();
  console.log(`Valid semver tag: ${TAG}`);
}
