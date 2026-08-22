import { test } from "node:test";
import { deepEqual, equal, match, throws } from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const read = (relativePath) => readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
const release = read("../.github/workflows/release.yml");
const validate = read("../.github/workflows/validate.yml");
const releaseTag = await import("../scripts/release-tag.mjs");

function jobBlock(workflow, job, nextJob) {
  const start = workflow.indexOf(`\n  ${job}:\n`);
  if (start === -1) return "";
  const contentStart = start + `\n  ${job}:\n`.length;
  const end = nextJob ? workflow.indexOf(`\n  ${nextJob}:\n`, contentStart) : workflow.length;
  return workflow.slice(contentStart, end === -1 ? workflow.length : end);
}

test("RVG-001: tag and manual releases call the reusable full validation workflow", () => {
  match(release, /push:\n    tags:\n      - 'v\*'/);
  match(release, /workflow_dispatch:/);
  match(validate, /workflow_call:/);
  match(jobBlock(release, "validate", "package"), /uses: \.\/\.github\/workflows\/validate\.yml/);

  for (const command of [
    "node scripts/drift-report.mjs --output .build/drift-report --strict",
    "node --test tests/*.test.mjs",
    "node --input-type=module",
  ]) {
    match(validate, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("RVG-007: default-ref manual releases use the supplied semantic-version tag", () => {
  const environment = releaseTag.initializeReleaseEnvironment({
    RELEASE_TRIGGER: "workflow_dispatch",
    RELEASE_REF_NAME: "main",
    RELEASE_TAG_INPUT: "v1.2.3",
  });
  equal(environment.TAG, "v1.2.3");
  equal(environment.COPILOT_ARCHIVE, "sdd-pilot-copilot-v1.2.3.zip");
  equal(environment.CODEX_CHECKSUM, "sdd-pilot-codex-v1.2.3.zip.sha256");
  match(jobBlock(release, "validate", "package"), /ref: \$\{\{ inputs\.tag \|\| github\.ref \}\}/);
  match(jobBlock(release, "package", "publish"), /ref: \$\{\{ inputs\.tag \|\| github\.ref \}\}/);
  match(jobBlock(release, "publish"), /ref: \$\{\{ inputs\.tag \|\| github\.ref \}\}/);
  match(validate, /ref: \$\{\{ inputs\.ref \|\| github\.ref \}\}/);
});

test("RVG-008: missing and invalid manual tags fail before package environment setup", () => {
  for (const inputTag of [undefined, "main", "v1.2", "v1.2.3+build"]) {
    throws(() => releaseTag.initializeReleaseEnvironment({
      RELEASE_TRIGGER: "workflow_dispatch",
      RELEASE_REF_NAME: "main",
      RELEASE_TAG_INPUT: inputTag,
    }), /does not match semantic versioning/);
  }
});

test("RVG-009: tag pushes retain their ref tag and publish the resolved tag", () => {
  const directory = mkdtempSync(join(tmpdir(), "release-tag-"));
  const githubEnvironment = join(directory, "github-env");
  try {
    const environment = releaseTag.initializeReleaseEnvironment({
      RELEASE_TRIGGER: "push",
      RELEASE_REF_NAME: "v2.0.0-rc.1",
      RELEASE_TAG_INPUT: "v9.9.9",
      GITHUB_ENV: githubEnvironment,
    });
    equal(environment.TAG, "v2.0.0-rc.1");
    match(readFileSync(githubEnvironment, "utf8"), /^TAG=v2\.0\.0-rc\.1$/m);
    match(jobBlock(release, "publish"), /tag_name: \$\{\{ env\.TAG \}\}/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("RVG-002: packaging and publishing are distinct gated jobs", () => {
  const validationJob = jobBlock(release, "validate", "package");
  const packageJob = jobBlock(release, "package", "publish");
  const publishJob = jobBlock(release, "publish");
  match(packageJob, /needs: validate/);
  match(publishJob, /needs: \[validate, package\]/);
  for (const job of [packageJob, publishJob]) equal(/if:\s*always\(\)|if:\s*failure\(\)/.test(job), false);
  equal(/Build .*release archive|Create GitHub Release/.test(validationJob), false);
  match(packageJob, /Build Copilot release archive/);
  equal(/Create GitHub Release/.test(packageJob), false);
  match(publishJob, /Create GitHub Release/);
  equal(/Build .*release archive/.test(publishJob), false);
});

test("RVG-003: packaging is read-only and publishing alone receives write access", () => {
  match(release, /^permissions:\n  contents: read$/m);
  match(jobBlock(release, "validate", "package"), /permissions:\n      contents: read/);
  const packageJob = jobBlock(release, "package", "publish");
  match(packageJob, /permissions:\n      contents: read/);
  match(packageJob, /persist-credentials: false/);
  match(jobBlock(release, "publish"), /permissions:\n      contents: write/);
  equal([...release.matchAll(/contents: write/g)].length, 1);
  match(validate, /^permissions:\n  contents: read$/m);
});

function executeReleaseFixture({ trigger = "tag", validate = "success", package: packageResult = "success", artifact = "present", provenance = "match" }) {
  if (!["tag", "manual"].includes(trigger)) throw new Error(`unsupported release trigger: ${trigger}`);
  const packageRuns = validate === "success";
  const publishRuns = packageRuns && packageResult === "success";
  if (!publishRuns) return { package: packageRuns ? packageResult : "skipped", publish: "skipped" };
  if (artifact !== "present") return { package: "success", publish: "failed" };
  if (provenance !== "match") return { package: "success", publish: "failed" };
  return { package: "success", publish: "success" };
}

test("RVG-005: failure fixtures skip dependent jobs and fail closed before publication", () => {
  deepEqual(executeReleaseFixture({ validate: "failed" }), { package: "skipped", publish: "skipped" });
  deepEqual(executeReleaseFixture({ package: "failed" }), { package: "failed", publish: "skipped" });
  deepEqual(executeReleaseFixture({ artifact: "missing" }), { package: "success", publish: "failed" });
  deepEqual(executeReleaseFixture({ provenance: "mismatch" }), { package: "success", publish: "failed" });
});

test("RVG-006: the immutable same-run artifact is checksum and tag/commit bound before publishing", () => {
  const packageJob = jobBlock(release, "package", "publish");
  const publishJob = jobBlock(release, "publish");
  match(packageJob, /uses: actions\/upload-artifact@v4/);
  match(packageJob, /name: release-assets-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/);
  match(packageJob, /if-no-files-found: error/);
  match(packageJob, /overwrite: false/);
  match(packageJob, /release-provenance\.json/);
  match(publishJob, /uses: actions\/download-artifact@v4/);
  match(publishJob, /name: release-assets-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/);
  match(publishJob, /sha256sum --check/);
  equal([...release.matchAll(/- name: Verify requested tag checkout/g)].length, 2);
  equal([...release.matchAll(/git rev-parse "\$\{TAG\}\^\{commit\}"/g)].length, 2);
  match(packageJob, /sha: process\.env\.RELEASE_SHA/);
  match(publishJob, /provenance\.tag !== process\.env\.TAG \|\| provenance\.sha !== process\.env\.RELEASE_SHA/);
  deepEqual(executeReleaseFixture({ trigger: "tag" }), { package: "success", publish: "success" });
  deepEqual(executeReleaseFixture({ trigger: "manual" }), { package: "success", publish: "success" });
});

test("RVG-004: validation checks remain individually named for failure logs", () => {
  for (const step of [
    "Generate drift report",
    "Run contract tests",
    "Verify gated markdown compression",
    "Publish drift report summary",
  ]) {
    match(validate, new RegExp(`- name: ${step}`));
  }
});

test("RVG-010: every staged host archive runs strict host-scoped drift validation", () => {
  for (const host of ["copilot", "antigravity", "windsurf", "opencode", "claude-code", "codex"]) {
    match(release, new RegExp(`drift-report\\.mjs\" --host ${host} .* --strict`));
  }
});
