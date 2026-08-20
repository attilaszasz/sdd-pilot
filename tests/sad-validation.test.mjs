import { readFileSync, rmSync, symlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { equal, match } from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { computeArchitectureDigest, parseSad, validateSad } from "../scripts/validate-sad.mjs";

const fixturePath = (name) => fileURLToPath(new URL(`fixtures/sad/${name}.md`, import.meta.url));
const fixture = (name) => readFileSync(fixturePath(name));
const codes = (result) => result.errors.map(({ code }) => code);

test("SAD-001: planning-ready SAD validates decomposition, views, flows, and traceability", () => {
  const source = fixture("valid-planning-ready");
  const parsed = parseSad(source);
  const result = validateSad(source, { profile: "planning-ready" });

  equal(parsed.tables.flows[0].values["Flow ID"], "FLOW-001");
  equal(result.valid, true, result.errors.map(({ message }) => message).join("\n"));
  equal(result.counts.boundaries, 2);
  equal(result.counts.flows, 1);
  equal(result.counts.diagrams, 4);
  equal(Object.values(result.categories).every(Boolean), true);
  match(result.architectureDigest, /^[a-f0-9]{64}$/);
});

test("SAD-002: flow catalog and diagrams must remain linked and traceable", () => {
  const source = fixture("valid-planning-ready").toString("utf8");
  const missingDiagram = validateSad(source.replace("### FLOW-001: Order Submission", "### Order Submission"), { profile: "planning-ready" });
  equal(codes(missingDiagram).includes("missing-flow-diagram"), true);

  const untraced = validateSad(source.replace("| Submit and track orders | Order API | FLOW-001 |", "| Submit and track orders | Order API | N/A |"), { profile: "planning-ready" });
  equal(codes(untraced).includes("untraced-flow"), true);

  const noRecovery = source
    .replace("else Gateway timeout", "else Alternate outcome")
    .replace("Payment--xAPI: Timeout", "Payment--xAPI: No response")
    .replace("API-->>Customer: Retryable failure", "API-->>Customer: Alternate response")
    .replace("to recover the prior result", "to return the prior result")
    .replaceAll("idempotency", "request identity");
  equal(codes(validateSad(noRecovery, { profile: "planning-ready" })).includes("missing-flow-recovery"), true);
});

test("SAD-003: diagrams enforce a per-view 15-node limit", () => {
  const source = fixture("valid-planning-ready").toString("utf8");
  const extra = Array.from({ length: 13 }, (_, index) => `    Person(extra${index}, "Extra ${index}", "Actor")`).join("\n");
  const crowded = source.replace("    Person(customer, \"Customer\", \"Submits orders\")", `    Person(customer, "Customer", "Submits orders")\n${extra}`);
  const result = validateSad(crowded, { profile: "planning-ready" });
  equal(codes(result).includes("diagram-node-limit"), true);
});

test("SAD-004: exact table schemas and planning-ready placeholders fail closed", () => {
  const source = fixture("valid-planning-ready").toString("utf8");
  const malformed = validateSad(source.replace("| Flow ID | Trigger |", "| ID | Trigger |"), { profile: "planning-ready" });
  equal(codes(malformed).includes("invalid-table-header"), true);

  const placeholder = validateSad(source.replace("Order Hub accepts customer orders", "[Describe the system]"), { profile: "planning-ready" });
  equal(codes(placeholder).includes("placeholder-content"), true);
});

test("SAD-005: canonical Technical Context registration is enforced", () => {
  const source = fixture("valid-planning-ready");
  const matching = validateSad(source, {
    profile: "planning-ready",
    canonicalPath: "tests/fixtures/sad/valid-planning-ready.md",
    configSource: fixture("config-valid"),
  });
  equal(matching.valid, true, matching.errors.map(({ message }) => message).join("\n"));

  const mismatch = validateSad(source, {
    profile: "planning-ready",
    canonicalPath: "specs/sad.md",
    configSource: fixture("config-valid"),
  });
  equal(codes(mismatch).includes("config-technical-context-mismatch"), true);
});

test("SAD-006: architecture digest is deterministic and content-sensitive", () => {
  const source = fixture("valid-planning-ready").toString("utf8");
  equal(computeArchitectureDigest(source), computeArchitectureDigest(source.replaceAll("\n", "\r\n")));
  equal(computeArchitectureDigest(source) === computeArchitectureDigest(source.replace("200 requests", "300 requests")), false);
});

test("SAD-007: CLI emits JSON, fails invalid input, and rejects unsafe paths", () => {
  const script = fileURLToPath(new URL("../scripts/validate-sad.mjs", import.meta.url));
  const validPath = "tests/fixtures/sad/valid-planning-ready.md";
  const valid = spawnSync(process.execPath, [script, validPath, "--profile", "planning-ready", "--config", "tests/fixtures/sad/config-valid.md"], { encoding: "utf8" });
  equal(valid.status, 0, valid.stdout || valid.stderr);
  equal(JSON.parse(valid.stdout).valid, true);

  const invalid = spawnSync(process.execPath, [script, validPath, "--profile", "draft"], { encoding: "utf8" });
  equal(invalid.status, 1);
  equal(codes(JSON.parse(invalid.stdout)).includes("sad-maturity-mismatch"), true);

  const traversal = spawnSync(process.execPath, [script, "../outside.md", "--profile", "draft"], { encoding: "utf8" });
  equal(traversal.status, 1);
  match(JSON.parse(traversal.stdout).errors[0].message, /escapes the repository/);

  const linkRelative = `${validPath}.symlink-${process.pid}`;
  const linkPath = fileURLToPath(new URL(`../${linkRelative}`, import.meta.url));
  try {
    symlinkSync("valid-planning-ready.md", linkPath);
    const linked = spawnSync(process.execPath, [script, linkRelative, "--profile", "planning-ready"], { encoding: "utf8" });
    equal(linked.status, 1);
    match(JSON.parse(linked.stdout).errors[0].message, /uses a symlink/);
  } finally {
    rmSync(linkPath, { force: true });
  }
});
