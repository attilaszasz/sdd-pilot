import { test } from "node:test";
import { equal, match } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (relativePath) => readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
const release = read("../.github/workflows/release.yml");
const validate = read("../.github/workflows/validate.yml");

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
  match(jobBlock(release, "validate", "release"), /uses: \.\/\.github\/workflows\/validate\.yml/);

  for (const command of [
    "node scripts/drift-report.mjs --output .build/drift-report --strict",
    "node --test tests/*.test.mjs",
    "node --input-type=module",
  ]) {
    match(validate, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("RVG-002: packaging and publishing are skipped when validation fails", () => {
  const validationJob = jobBlock(release, "validate", "release");
  const releaseJob = jobBlock(release, "release");
  match(releaseJob, /needs: validate/);
  equal(/if:\s*always\(\)|if:\s*failure\(\)/.test(releaseJob), false);
  equal(/Build .*release archive|Create GitHub Release/.test(validationJob), false);
  match(releaseJob, /Build Copilot release archive/);
  match(releaseJob, /Create GitHub Release/);
});

test("RVG-003: write access starts only in the validated publish job", () => {
  match(release, /^permissions:\n  contents: read$/m);
  match(jobBlock(release, "validate", "release"), /permissions:\n      contents: read/);
  match(jobBlock(release, "release"), /permissions:\n      contents: write/);
  equal([...release.matchAll(/contents: write/g)].length, 1);
  match(validate, /^permissions:\n  contents: read$/m);
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
