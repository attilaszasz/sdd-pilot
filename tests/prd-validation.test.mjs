import { readFileSync, rmSync, symlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { deepStrictEqual, equal, match } from "node:assert/strict";
import { fileURLToPath } from "node:url";

import {
  compareCapabilityMaps,
  computeCapabilityDigest,
  parsePrd,
  validatePrd,
  validatePrdPlanFreshness,
} from "../scripts/validate-prd.mjs";

const fixturePath = (name) => fileURLToPath(new URL(`fixtures/prd/${name}.md`, import.meta.url));
const fixture = (name) => readFileSync(fixturePath(name));
const codes = (result) => result.errors.map(({ code }) => code);

test("PRD-001: valid draft and planning-ready profiles parse exact metadata, sections, and capabilities", () => {
  const draft = validatePrd(fixture("valid-draft"), { profile: "draft" });
  const ready = validatePrd(fixture("valid-planning-ready"), { profile: "planning-ready" });

  equal(draft.valid, true);
  equal(ready.valid, true);
  equal(draft.metadata.product, "SDD Pilot");
  deepStrictEqual(draft.capabilities.map(({ id }) => id), ["CAP-002", "CAP-001"]);
  equal(ready.categories["scope-boundaries"].valid, true);
  equal(ready.capabilityDigest.length, 64);
});

test("PRD-002: parsePrd reports legacy metadata and exact capability-map syntax without throwing", () => {
  const legacy = parsePrd(fixture("legacy-missing-metadata"));
  const validated = validatePrd(fixture("legacy-missing-metadata"), { profile: "draft" });

  equal(legacy.valid, false);
  equal(legacy.errors[0].code, "missing-frontmatter");
  equal(legacy.capabilities.length, 1);
  equal(validated.valid, false);
  equal(codes(validated).filter((code) => code === "missing-metadata").length, 4);
});

test("PRD-003: placeholders and feature-delivery content are prohibited in every profile", () => {
  const placeholders = validatePrd(fixture("placeholders"), { profile: "draft" });
  equal(placeholders.valid, false);
  equal(codes(placeholders).includes("placeholder-content"), true);
  equal(codes(placeholders).includes("empty-capability-outcome"), true);

  const source = fixture("valid-draft").toString("utf8")
    + "\n## Acceptance Criteria\n\nGiven an account\nWhen delivery starts\nThen it succeeds\n"
    + "\n## Implementation Plan\n\n- [ ] T001 Build the feature\n";
  const result = validatePrd(source, { profile: "draft" });
  equal(result.valid, false);
  equal(codes(result).includes("feature-acceptance-criteria"), true);
  equal(codes(result).includes("given-when-then-content"), true);
  equal(codes(result).includes("implementation-content"), true);

  const traceable = fixture("valid-draft").toString("utf8").replace("Teams lose requirement intent", "[EVD-001] Teams lose requirement intent");
  equal(validatePrd(traceable, { profile: "draft" }).valid, true);
  const cited = fixture("valid-draft").toString("utf8").replace("Teams lose requirement intent", "[RFC 2119] Teams lose requirement intent");
  equal(validatePrd(cited, { profile: "draft" }).valid, true);
  const namedCitation = fixture("valid-draft").toString("utf8").replace("Teams lose requirement intent", "[Smith et al., 2024] Teams lose requirement intent");
  equal(validatePrd(namedCitation, { profile: "draft" }).valid, true);
  const shortName = fixture("valid-draft").toString("utf8").replace("product: SDD Pilot", "product: AI");
  equal(validatePrd(shortName, { profile: "draft" }).valid, true);
});

test("PRD-004: duplicate and malformed capability IDs fail closed", () => {
  const duplicate = validatePrd(fixture("duplicate-capability"), { profile: "draft" });
  const malformed = validatePrd(fixture("malformed-capability"), { profile: "draft" });
  equal(duplicate.valid, false);
  equal(codes(duplicate).includes("duplicate-capability-id"), true);
  equal(malformed.valid, false);
  equal(codes(malformed).includes("invalid-capability-id"), true);
});

test("PRD-005: priorities are exact and planning-ready requires a P1 capability", () => {
  const priority = validatePrd(fixture("invalid-priority"), { profile: "draft" });
  const noP1 = validatePrd(fixture("missing-p1"), { profile: "planning-ready" });
  equal(priority.valid, false);
  equal(codes(priority).includes("invalid-capability-priority"), true);
  equal(noP1.valid, false);
  equal(codes(noP1).includes("missing-p1-capability"), true);
});

test("PRD-006: active matching discovery blocks planning readiness but not draft validation", () => {
  const readySource = fixture("valid-planning-ready");
  const discoverySource = fixture("active-discovery");
  const blocked = validatePrd(readySource, { profile: "planning-ready", discoverySource, canonicalPath: "specs/prd.md" });
  equal(blocked.valid, false);
  equal(codes(blocked).includes("active-prd-discovery"), true);

  const unrelated = discoverySource.toString("utf8").replace("specs/prd.md", "docs/other.md");
  equal(validatePrd(readySource, { profile: "planning-ready", discoverySource: unrelated }).valid, true);

  const malformed = discoverySource.toString("utf8").replace("status: ready-to-synthesize", "status: activ");
  const malformedResult = validatePrd(readySource, { profile: "planning-ready", discoverySource: malformed });
  equal(malformedResult.valid, false);
  equal(codes(malformedResult).includes("invalid-discovery-status"), true);

  const missingTarget = discoverySource.toString("utf8").replace("target_prd: specs/prd.md\n", "");
  equal(codes(validatePrd(readySource, { profile: "planning-ready", discoverySource: missingTarget })).includes("missing-discovery-target"), true);

  const duplicateStatus = discoverySource.toString("utf8").replace("status: ready-to-synthesize", "status: ready-to-synthesize\nstatus: completed");
  equal(codes(validatePrd(readySource, { profile: "planning-ready", discoverySource: duplicateStatus })).includes("duplicate-metadata"), true);

  const conflictingTarget = discoverySource.toString("utf8").replace("target_prd: specs/prd.md", "target: docs/other.md\ntarget_prd: specs/prd.md");
  equal(codes(validatePrd(readySource, { profile: "planning-ready", discoverySource: conflictingTarget })).includes("unsupported-discovery-target-field"), true);

  const completed = discoverySource.toString("utf8")
    .replace("status: ready-to-synthesize", "status: completed")
    .replace("current_stage: synthesis", "current_stage: none")
    .replace("next_stage: synthesis", "next_stage: none");
  equal(validatePrd(readySource, { profile: "planning-ready", discoverySource: completed }).valid, true);

  const contradictoryCompleted = completed
    .replace("awaiting_user: false", "awaiting_user: true")
    .replace("current_stage: none", "current_stage: framing");
  equal(codes(validatePrd(readySource, { profile: "planning-ready", discoverySource: contradictoryCompleted })).includes("invalid-discovery-transition"), true);
});

test("PRD-007: supplied config must register the canonical Product Document path", () => {
  const mismatch = validatePrd(fixture("valid-draft"), {
    profile: "draft",
    configSource: fixture("config-mismatch"),
    canonicalPath: "specs/prd.md",
  });
  equal(mismatch.valid, false);
  equal(codes(mismatch).includes("config-product-document-mismatch"), true);

  const matching = fixture("config-mismatch").toString("utf8").replace("docs/product.md", "specs/prd.md");
  equal(validatePrd(fixture("valid-draft"), { profile: "draft", configSource: matching }).valid, true);
  equal(validatePrd(fixture("valid-draft"), { profile: "draft", configSource: fixture("config-mismatch"), canonicalPath: "docs/product.md" }).valid, true);

  const unsafe = matching.replace("specs/prd.md", "../outside.md");
  equal(codes(validatePrd(fixture("valid-draft"), { profile: "draft", configSource: unsafe, canonicalPath: "../outside.md" })).includes("unsafe-config-product-document-path"), true);
});

test("PRD-008: capability digest is deterministic by ID and sensitive to product changes", () => {
  const capabilities = parsePrd(fixture("valid-draft")).capabilities;
  const reversed = [...capabilities].reverse();
  equal(computeCapabilityDigest(capabilities), computeCapabilityDigest(reversed));
  match(computeCapabilityDigest(capabilities), /^[a-f0-9]{64}$/);
  const changed = capabilities.map((item) => item.id === "CAP-001" ? { ...item, outcome: "A changed outcome." } : item);
  equal(computeCapabilityDigest(capabilities) === computeCapabilityDigest(changed), false);
});

test("PRD-009: capability comparison reports stable sorted deltas", () => {
  const before = [
    { id: "CAP-001", capability: "Validation", priority: "P1", outcome: "Find drift" },
    { id: "CAP-002", capability: "Planning", priority: "P2", outcome: "Create plans" },
    { id: "CAP-004", capability: "Removal", priority: "P3", outcome: "Old outcome" },
  ];
  const after = [
    { id: "CAP-003", capability: "Reports", priority: "P2", outcome: "Show results" },
    { id: "CAP-001", capability: "Validation", priority: "P2", outcome: "Find drift" },
    { id: "CAP-002", capability: "Planning", priority: "P2", outcome: "Create fresh plans" },
  ];
  const comparison = compareCapabilityMaps(before, after);
  deepStrictEqual(comparison.added, ["CAP-003"]);
  deepStrictEqual(comparison.removed, ["CAP-004"]);
  deepStrictEqual(comparison.priorityChanged, [{ id: "CAP-001", before: "P1", after: "P2" }]);
  deepStrictEqual(comparison.changed.map(({ id, fields }) => ({ id, fields })), [{ id: "CAP-002", fields: ["outcome"] }]);
});

test("PRD-010: project-plan freshness reports missing, matching, and mismatched digests", () => {
  const prd = validatePrd(fixture("valid-planning-ready"), { profile: "planning-ready" });
  const missing = validatePrdPlanFreshness(prd, fixture("project-plan-missing-digest"));
  equal(missing.valid, false);
  equal(missing.errors.some(({ code }) => code === "missing-prd-capability-digest"), true);

  const matchingPlan = `---\nprd_source: specs/prd.md\nprd_capability_digest: ${prd.capabilityDigest}\n---\n# Project Plan\n`;
  equal(validatePrdPlanFreshness(prd, matchingPlan).valid, true);
  const stalePlan = matchingPlan.replace(prd.capabilityDigest, "0".repeat(64));
  const stale = validatePrdPlanFreshness(prd, stalePlan);
  equal(stale.valid, false);
  equal(stale.errors[0].code, "prd-capability-digest-mismatch");

  const integrated = validatePrd(fixture("valid-planning-ready"), { profile: "planning-ready", projectPlanSource: stalePlan });
  equal(integrated.valid, false);
  equal(integrated.projectPlanFreshness.valid, false);

  const wrongSource = matchingPlan.replace("prd_source: specs/prd.md", "prd_source: docs/other.md");
  equal(validatePrdPlanFreshness(prd, wrongSource).errors.some(({ code }) => code === "prd-source-mismatch"), true);
  const duplicate = matchingPlan.replace(`prd_capability_digest: ${prd.capabilityDigest}`, `prd_capability_digest: ${prd.capabilityDigest}\nprd_capability_digest: ${prd.capabilityDigest}`);
  equal(validatePrdPlanFreshness(prd, duplicate).valid, false);

  const customPlan = matchingPlan.replace("prd_source: specs/prd.md", "prd_source: docs/product.md");
  const customIntegrated = validatePrd(fixture("valid-planning-ready"), { profile: "planning-ready", canonicalPath: "docs/product.md", projectPlanSource: customPlan });
  equal(customIntegrated.valid, true, customIntegrated.errors.map(({ message }) => message).join("\n"));
});

test("PRD-011: CLI emits deterministic JSON and uses nonzero status for invalid input", () => {
  const script = fileURLToPath(new URL("../scripts/validate-prd.mjs", import.meta.url));
  const relativeFixture = (name) => `tests/fixtures/prd/${name}.md`;
  const args = [script, relativeFixture("valid-draft"), "--profile", "draft"];
  const first = spawnSync(process.execPath, args, { encoding: "utf8" });
  const second = spawnSync(process.execPath, args, { encoding: "utf8" });
  equal(first.status, 0, first.stderr);
  equal(first.stdout, second.stdout);
  equal(JSON.parse(first.stdout).valid, true);

  const invalid = spawnSync(process.execPath, [script, relativeFixture("malformed-capability"), "--profile", "draft"], { encoding: "utf8" });
  equal(invalid.status, 1);
  equal(JSON.parse(invalid.stdout).valid, false);

  const missingOptional = spawnSync(process.execPath, [script, relativeFixture("valid-draft"), "--profile", "draft", "--config", "does-not-exist.md"], { encoding: "utf8" });
  equal(missingOptional.status, 1);
  match(JSON.parse(missingOptional.stdout).errors[0].message, /config file cannot be read/);

  const absentDiscovery = spawnSync(process.execPath, [script, relativeFixture("valid-planning-ready"), "--profile", "planning-ready", "--discovery", "does-not-exist.md"], { encoding: "utf8" });
  equal(absentDiscovery.status, 0, absentDiscovery.stdout);
  equal(JSON.parse(absentDiscovery.stdout).valid, true);

  const traversal = spawnSync(process.execPath, [script, "../outside.md", "--profile", "draft"], { encoding: "utf8" });
  equal(traversal.status, 1);
  match(JSON.parse(traversal.stdout).errors[0].message, /escapes the repository/);

  const linkRelative = `${relativeFixture("valid-draft")}.symlink-${process.pid}`;
  const linkPath = fileURLToPath(new URL(`../${linkRelative}`, import.meta.url));
  try {
    symlinkSync("valid-draft.md", linkPath);
    const symlink = spawnSync(process.execPath, [script, linkRelative, "--profile", "draft"], { encoding: "utf8" });
    equal(symlink.status, 1);
    match(JSON.parse(symlink.stdout).errors[0].message, /uses a symlink/);
  } finally {
    rmSync(linkPath, { force: true });
  }

  const absolute = spawnSync(process.execPath, [script, fixturePath("valid-draft"), "--profile", "draft"], { encoding: "utf8" });
  equal(absolute.status, 1);
  match(JSON.parse(absolute.stdout).errors[0].message, /repository-relative path/);
  const mixed = spawnSync(process.execPath, [script, "tests\\fixtures/prd/valid-draft.md", "--profile", "draft"], { encoding: "utf8" });
  equal(mixed.status, 1);
  match(JSON.parse(mixed.stdout).errors[0].message, /repository-relative path/);
});
