import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deepEqual, equal, match, ok } from "node:assert/strict";
import { test } from "node:test";
import {
  compressMarkdown,
  getCompressionPolicy,
  GOVERNANCE_COMPRESSION_TARGETS,
  validateCompressedMarkdown,
} from "../scripts/lib/markdown-compression.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const cliPath = path.join(repositoryRoot, "scripts", "compress-markdown.mjs");
const governanceTarget = ".github/skills/implement-tasks/SKILL.md";

test("MDC-001: governance admission is an exact per-file manifest", () => {
  deepEqual(GOVERNANCE_COMPRESSION_TARGETS, [governanceTarget]);
  equal(getCompressionPolicy(governanceTarget).allowed, true);
  equal(getCompressionPolicy(governanceTarget).mode, "narrative-only");
  equal(getCompressionPolicy(path.join(repositoryRoot, governanceTarget)).allowed, true);
  equal(getCompressionPolicy(".github/skills/*/SKILL.md").allowed, false);
  equal(getCompressionPolicy(".github/skills/quality-control/SKILL.md").allowed, false);
});

test("MDC-002: parser-sensitive targets remain blocked before governance admission", () => {
  equal(getCompressionPolicy("AGENTS.md").allowed, false);
  equal(getCompressionPolicy("project-instructions.md").allowed, false);
  equal(getCompressionPolicy("specs/example/spec.md").allowed, false);
  equal(getCompressionPolicy(".github/skills/markdown-compression/SKILL.md").allowed, false);
});

test("MDC-003: narrative-only mode changes only prose inside rules and workflow blocks", () => {
  const original = [
    "---",
    "name: fixture",
    "description: in order to stay exact",
    "---",
    "",
    "# Heading in order to stay exact",
    "Outside in order to stay exact.",
    "<rules>",
    "- run  the command for FR-001",
    "- run `in order to` without changing code",
    "See [guide](https://example.test/path) in order to stay exact.",
    "    indented in order to stay exact",
    "| Column | Value |",
    "| --- | --- |",
    "- [ ] in order to stay exact",
    "```text",
    "in order to stay exact inside a fence",
    "<workflow>",
    "please note that fence contents stay exact",
    "</workflow>",
    "```",
    "</rules>",
    "Between in order to stay exact.",
    "<workflow>",
    "workflow  prose can be shorter.",
    "</workflow>",
    "After in order to stay exact.",
  ].join("\n");

  const compressed = compressMarkdown(original, { narrativeOnly: true });
  const validation = validateCompressedMarkdown({ original, compressed, targetPath: governanceTarget });

  ok(validation.ok, validation.errors.join("; "));
  equal(compressed.includes("Outside in order to stay exact."), true);
  equal(compressed.includes("Between in order to stay exact."), true);
  equal(compressed.includes("After in order to stay exact."), true);
  equal(compressed.includes("- run the command for FR-001"), true);
  equal(compressed.includes("See [guide](https://example.test/path) in order to stay exact."), true);
  equal(compressed.includes("workflow  prose can be shorter."), false);
  equal(compressed.includes("workflow prose can be shorter."), true);
  equal(compressed.includes("in order to stay exact inside a fence"), true);
  equal(compressed.includes("- [ ] in order to stay exact"), true);
});

test("MDC-004: validator rejects changed block boundaries and outside lines", () => {
  const original = "before\n<rules>\nin order to do this\n</rules>\nafter";
  const compressed = compressMarkdown(original, { narrativeOnly: true });
  const changedOutside = compressed.replace("after", "changed");
  const changedTag = compressed.replace("<rules>", " <rules>");

  const outsideValidation = validateCompressedMarkdown({
    original,
    compressed: changedOutside,
    targetPath: governanceTarget,
  });
  const tagValidation = validateCompressedMarkdown({
    original,
    compressed: changedTag,
    targetPath: governanceTarget,
  });

  equal(outsideValidation.ok, false);
  match(outsideValidation.errors.join("\n"), /lines outside narrative blocks/);
  equal(tagValidation.ok, false);
  match(tagValidation.errors.join("\n"), /narrative block tag lines/);
});

test("MDC-005: idempotent mode fails on compressible input and passes after compression", (t) => {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "markdown-compression-"));
  const docsRoot = path.join(fixtureRoot, "docs");
  const fixturePath = path.join(docsRoot, "fixture.md");
  const original = "# Fixture\nrun  this\n";

  t.after(() => rmSync(fixtureRoot, { force: true, recursive: true }));
  mkdirSync(docsRoot, { recursive: true });
  writeFileSync(fixturePath, original, "utf8");

  const firstRun = spawnSync(process.execPath, [cliPath, "--idempotent", fixturePath], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  equal(firstRun.status, 1);
  match(firstRun.stderr, /Idempotence failed/);

  writeFileSync(fixturePath, compressMarkdown(original), "utf8");
  const secondRun = spawnSync(process.execPath, [cliPath, "--idempotent", fixturePath], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  equal(secondRun.status, 0);
  match(secondRun.stdout, /Idempotence: PASS/);
});

test("MDC-006: the committed governance target is already idempotent", () => {
  const result = spawnSync(process.execPath, [cliPath, "--idempotent", governanceTarget], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });

  equal(result.status, 0);
  match(result.stdout, /Idempotence: PASS/);
});

test("MDC-007: CLI rejects symlinks before reading or writing their targets", (t) => {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "markdown-compression-symlink-"));
  const docsRoot = path.join(fixtureRoot, "docs");
  const blockedPath = path.join(fixtureRoot, "AGENTS.md");
  const symlinkPath = path.join(docsRoot, "allowed.md");
  const original = "must  remain exact\n";

  t.after(() => rmSync(fixtureRoot, { force: true, recursive: true }));
  mkdirSync(docsRoot, { recursive: true });
  writeFileSync(blockedPath, original, "utf8");
  symlinkSync(blockedPath, symlinkPath);

  const result = spawnSync(process.execPath, [cliPath, symlinkPath], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });

  equal(result.status, 1);
  match(result.stderr, /symbolic-link paths are not supported/);
  equal(readFileSync(blockedPath, "utf8"), original);
});

test("MDC-008: length-aware fences preserve shorter delimiters and reject unclosed input", () => {
  const original = [
    "````text",
    "```",
    "prose  inside remains exact",
    "```",
    "````",
    "outside  prose compacts",
  ].join("\n");
  const compressed = compressMarkdown(original);
  const valid = validateCompressedMarkdown({ original, compressed, targetPath: "docs/fence.md" });
  const invalid = validateCompressedMarkdown({
    original: "````text\n```\n",
    compressed: "````text\n```\n",
    targetPath: "docs/fence.md",
  });

  ok(valid.ok, valid.errors.join("; "));
  equal(compressed.includes("prose  inside remains exact"), true);
  equal(compressed.endsWith("outside prose compacts"), true);
  equal(invalid.ok, false);
  match(invalid.errors.join("\n"), /unclosed fence/);
});

test("MDC-009: structural Markdown and CRLF line endings remain exact", () => {
  const original = [
    "Name | Value",
    "--- | ---",
    "one  | two",
    "> > - [ ] keep  task exact",
    "> > 1) nested  ordered prose",
    "<div>",
    "HTML  body stays exact",
    "</div>",
    "plain  prose compacts",
  ].join("\r\n");
  const compressed = compressMarkdown(original);
  const validation = validateCompressedMarkdown({ original, compressed, targetPath: "docs/structure.md" });

  ok(validation.ok, validation.errors.join("; "));
  equal(compressed.includes("one  | two\r\n"), true);
  equal(compressed.includes("> > - [ ] keep  task exact\r\n"), true);
  equal(compressed.includes("> > 1) nested ordered prose\r\n"), true);
  equal(compressed.includes("HTML  body stays exact\r\n"), true);
  equal(compressed.endsWith("plain prose compacts"), true);
  equal(compressed.replaceAll("\r\n", "").includes("\n"), false);
});

test("MDC-010: semantic-risk phrases remain unchanged", () => {
  const phrases = [
    "You should retain a number of currently active checks.",
    "You can simply retry in the event that the lock clears.",
    "It is recommended that operators really verify this.",
    "Make sure to preserve A as well as B.",
  ];

  for (const phrase of phrases) {
    equal(compressMarkdown(phrase), phrase);
  }
});

test("MDC-011: governance policy mode cannot be overridden during validation", () => {
  const original = "outside exact\n<rules>\ninside  prose\n</rules>";
  const changedOutside = "outside changed\n<rules>\ninside prose\n</rules>";
  const validation = validateCompressedMarkdown({
    original,
    compressed: changedOutside,
    targetPath: governanceTarget,
    mode: "full",
  });

  equal(validation.ok, false);
  match(validation.errors.join("\n"), /lines outside narrative blocks/);
});
