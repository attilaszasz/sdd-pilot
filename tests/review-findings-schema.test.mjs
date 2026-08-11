import { test } from "node:test";
import { deepEqual, equal, match, throws } from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { parseReviewFindings, serializeReviewFinding } from "../.github/skills/quality-control/scripts/parse-review-findings.mjs";

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const implement = read("../.github/skills/implement-tasks/SKILL.md");
const qc = read("../.github/skills/quality-control/SKILL.md");
const verifier = read("../.github/agents/_story-verifier.md");
const report = read("../.github/skills/quality-control/assets/qc-report-template.md");
const release = read("../.github/workflows/release.yml");
const parserPath = fileURLToPath(new URL("../.github/skills/quality-control/scripts/parse-review-findings.mjs", import.meta.url));

const finding = {
  version: 1,
  task: "T007",
  requirements: ["FR-001", "TR-002"],
  type: "tentative",
  evidence: "Boundary behavior needs focused review",
  paths: ["src/a.mjs", "tests/a.test.mjs"],
};

test("RFS-001: producer output round-trips all arrays through the canonical parser", () => {
  const encoded = serializeReviewFinding(finding);
  equal(encoded.split("\n").length, 2);
  const parsed = parseReviewFindings(encoded);
  equal(parsed.valid, true);
  deepEqual(parsed.findings, [finding]);
});

test("RFS-002: empty requirement and path arrays are valid boundary values", () => {
  const boundary = { ...finding, requirements: [], paths: [] };
  deepEqual(parseReviewFindings(serializeReviewFinding(boundary)).findings, [boundary]);
});

test("RFS-003: malformed, legacy, and unknown-version entries fail closed", () => {
  equal(parseReviewFindings("T007 | FR-001 | tentative | evidence\n").valid, false);
  equal(parseReviewFindings("{not-json}\n").errors[0].code, "invalid-json");
  equal(parseReviewFindings(`${JSON.stringify({ ...finding, version: 2 })}\n`).errors[0].code, "unsupported-version");
  throws(() => serializeReviewFinding({ ...finding, type: "gap" }), /unsupported review finding type/);
});

test("RFS-004: duplicate IDs, unsafe paths, multiline evidence, and extra fields are rejected", () => {
  equal(parseReviewFindings(`${JSON.stringify({ ...finding, requirements: ["FR-001", "FR-001"] })}\n`).valid, false);
  equal(parseReviewFindings(`${JSON.stringify({ ...finding, paths: ["../outside.mjs"] })}\n`).valid, false);
  equal(parseReviewFindings(`${JSON.stringify({ ...finding, paths: ["C:\\outside.mjs"] })}\n`).valid, false);
  equal(parseReviewFindings(`${JSON.stringify({ ...finding, paths: ["\\\\server\\share.mjs"] })}\n`).valid, false);
  equal(parseReviewFindings(`${JSON.stringify({ ...finding, evidence: "line one\nline two" })}\n`).valid, false);
  equal(parseReviewFindings(`${JSON.stringify({ ...finding, extra: true })}\n`).errors[0].code, "invalid-fields");
  const duplicateVersion = JSON.stringify(finding).replace('"version":1', '"version":2,"version":1');
  equal(parseReviewFindings(`${duplicateVersion}\n`).errors[0].code, "noncanonical-entry");
});

test("RFS-005: consumer blocks invalid files before verifier and BUG generation", () => {
  match(qc, /stop with \*\*BLOCKED\*\* before Story Verifier delegation, report generation, or BUG task generation/);
  match(qc, /never infer a requirement\/path pair from array positions/);
  match(implement, /Unversioned pipe records are intentionally incompatible/);
});

test("RFS-006: verifier and report preserve structured values and confirmed bug targets", () => {
  match(verifier, /bugTargets: \[\{requirement, path, description\}\]/);
  match(verifier, /never pair them by array position/);
  match(verifier, /### Implementation Review Findings/);
  match(report, /\| Task \| Type \| Requirements \| Paths \| Evidence \| Status \| Confirmed Bug Targets \|/);
});

test("RFS-007: append, validation, deduplication, retention, and cleanup are explicit", () => {
  match(implement, /Before appending.*parse-review-findings\.mjs/);
  match(implement, /Append only records not already present with the same canonical JSON/);
  match(qc, /keep it through QC reruns; cleanup occurs only when the Feature Workspace is archived or deleted/);
});

test("RFS-008: CLI rejects a mixed file without returning partial findings", () => {
  const directory = mkdtempSync(join(tmpdir(), "review-findings-"));
  const file = join(directory, ".review-findings");
  try {
    writeFileSync(file, `${serializeReviewFinding(finding)}legacy | record\n`);
    const result = spawnSync(process.execPath, [parserPath, file], { encoding: "utf8" });
    equal(result.status, 1);
    const output = JSON.parse(result.stdout);
    equal(output.valid, false);
    equal(output.findingCount, 0);
    deepEqual(output.findings, []);
    equal(output.errors[0].code, "invalid-json");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("RFS-009: parser is included by every release archive strategy", () => {
  match(parserPath, /\.github\/skills\/quality-control\/scripts\/parse-review-findings\.mjs$/);
  match(release, /cp -r \.github "\$STAGING\/\.github"/);
  equal([...release.matchAll(/cp -r \.github\/skills "\$STAGING\/\.github\/skills"/g)].length, 5);
});
