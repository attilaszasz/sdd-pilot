import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, test } from "node:test";
import { deepEqual, equal, match, ok, throws } from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

import { evaluateFeatureLifecycle } from "../scripts/evaluate-feature-lifecycle.mjs";
import { ensureImplementStateIgnored, validateReleaseArchive } from "../scripts/release-runtime-manifest.mjs";
import { validateWrapperInventory } from "../scripts/lib/wrapper-inventory.mjs";
import { validateCopilotDelegateGraph } from "../scripts/lib/copilot-delegate-graph.mjs";
import { validateClaudeAgentGraph } from "../scripts/lib/claude-agent-graph.mjs";
import { validateCodexDelegateGraph } from "../scripts/lib/codex-delegate-graph.mjs";
import { publicCommands } from "../scripts/lib/public-commands.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const fixtureRoot = join(repoRoot, "tests/fixtures/lifecycle-release/feature");
const temporaryRoots = [];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const git = (root, args, options = {}) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8", ...options });

function repositoryState(root, feature) {
  const ignored = new Set([".completed", ".qc-passed", "qc-report.md"].map((name) => `${feature}/${name}`));
  const status = git(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  return sha256(status.split("\0").filter((entry) => entry && !ignored.has(entry.slice(3))).join("\0"));
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function featureFixture() {
  const root = mkdtempSync(join(tmpdir(), "sddp-lifecycle-e2e-"));
  temporaryRoots.push(root);
  const feature = "specs/00001-fixture";
  cpSync(fixtureRoot, join(root, feature), { recursive: true });
  writeFileSync(join(root, "project-instructions.md"), "Fixture instructions\n");
  git(root, ["init"]);
  git(root, ["add", "."]);
  git(root, ["-c", "user.name=Test User", "-c", "user.email=test@example.com", "commit", "-m", "fixture"]);
  return { root, feature, directory: join(root, feature) };
}

function writeQcPass({ root, feature, directory }, manual = null) {
  const paths = ["project-instructions.md", `${feature}/checklists/requirements.md`, `${feature}/plan.md`, `${feature}/spec.md`, `${feature}/tasks.md`];
  const rows = paths.map((relative) => `| ${relative} | ${sha256(readFileSync(join(root, relative)))} |\n`).join("");
  const manualSection = manual === null ? "" : `\n## Manual Testing\n- Attestation: ${manual}\n`;
  const report = `# QC Report\n\n**Overall Verdict**: PASS\n\n## QC Evidence Manifest\n| Path | SHA-256 |\n|---|---|\n${rows}${manualSection}`;
  writeFileSync(join(directory, "qc-report.md"), report);
  writeFileSync(join(directory, ".qc-passed"), `QC Passed: 2026-08-13T00:00:00.000Z\nQC Baseline Commit: ${git(root, ["rev-parse", "HEAD"]).trim()}\nQC Repository State SHA-256: ${repositoryState(root, feature)}\nQC Report SHA-256: ${sha256(report)}\nQC Evidence SHA-256: ${sha256(rows)}\n`);
}

function completeTasks({ directory }) {
  const tasksPath = join(directory, "tasks.md");
  writeFileSync(tasksPath, readFileSync(tasksPath, "utf8").replaceAll("- [ ] T", "- [X] T"));
}

test("LRE-001: realistic positive fixture reaches implementation", () => {
  const fixture = featureFixture();
  const lifecycle = evaluateFeatureLifecycle(fixture.feature, fixture.root);
  equal(lifecycle.valid, true);
  equal(lifecycle.resumeAt, "implement");
});

test("LRE-002: gate parsers fail at ownership, marker, coverage, cycle, and phase boundaries", () => {
  const markerFixture = featureFixture();
  const specPath = join(markerFixture.directory, "spec.md");
  const spec = readFileSync(specPath, "utf8");
  writeFileSync(specPath, `${spec}\n[NEEDS CLARIFICATION: one]\n[NEEDS CLARIFICATION: two]\n[NEEDS CLARIFICATION: three]\n`);
  equal(evaluateFeatureLifecycle(markerFixture.feature, markerFixture.root).valid, true);
  writeFileSync(specPath, `${readFileSync(specPath, "utf8")}[NEEDS CLARIFICATION: four]\n`);
  equal(evaluateFeatureLifecycle(markerFixture.feature, markerFixture.root).gate, "spec-to-plan");

  const coverageFixture = featureFixture();
  const planPath = join(coverageFixture.directory, "plan.md");
  writeFileSync(planPath, readFileSync(planPath, "utf8").replace("| FR-001 | Fixture runner | src/fixture.mjs | runFixture | AD-001 |", "| FR-002 | Fixture runner | src/fixture.mjs | runFixture | AD-001 |"));
  match(evaluateFeatureLifecycle(coverageFixture.feature, coverageFixture.root).issues.join("\n"), /FR-001/);

  const taskFixture = featureFixture();
  const tasksPath = join(taskFixture.directory, "tasks.md");
  writeFileSync(tasksPath, readFileSync(tasksPath, "utf8").replace("Verify fixture after:T003", "Verify fixture after:T004"));
  match(evaluateFeatureLifecycle(taskFixture.feature, taskFixture.root).issues.join("\n"), /circular/);
  writeFileSync(tasksPath, readFileSync(tasksPath, "utf8").replace("## Phase 4: Polish", "## Phase 4: Unknown"));
  match(evaluateFeatureLifecycle(taskFixture.feature, taskFixture.root).issues.join("\n"), /phase structure/);
});

test("LRE-003: resume reruns mutated gates and checklist state", () => {
  const fixture = featureFixture();
  equal(evaluateFeatureLifecycle(fixture.feature, fixture.root).resumeAt, "implement");
  writeFileSync(join(fixture.directory, "checklists/requirements.md"), "- [ ] CHK001 Pending [Completeness, Spec §Success Criteria]\n");
  equal(evaluateFeatureLifecycle(fixture.feature, fixture.root).gate, "checklist-to-implement");
  writeFileSync(join(fixture.directory, "checklists/requirements.md"), "- [X] CHK001 Complete [Completeness, Spec §Success Criteria]\n");
  writeFileSync(join(fixture.directory, "plan.md"), "# invalid resumed plan\n");
  equal(evaluateFeatureLifecycle(fixture.feature, fixture.root).gate, "plan-to-tasks");
});

test("LRE-004: deferred failures, completion markers, manual verification, and evidence fail closed", () => {
  const fixture = featureFixture();
  completeTasks(fixture);
  writeFileSync(join(fixture.directory, ".completed"), "Implementation complete\n");
  equal(evaluateFeatureLifecycle(fixture.feature, fixture.root).resumeAt, "qc");
  writeQcPass(fixture, "PENDING");
  equal(evaluateFeatureLifecycle(fixture.feature, fixture.root).gate, "completion");
  writeQcPass(fixture);
  equal(evaluateFeatureLifecycle(fixture.feature, fixture.root).resumeAt, "complete");
  writeFileSync(join(fixture.directory, "tasks.md"), `${readFileSync(join(fixture.directory, "tasks.md"), "utf8")}\n- [X] T005 [BUG:ERROR] [DEFERRED] {FR-001} [runtime-error] Deferred error\n`);
  equal(evaluateFeatureLifecycle(fixture.feature, fixture.root).gate, "completion");

  const warning = featureFixture();
  completeTasks(warning);
  writeFileSync(join(warning.directory, "tasks.md"), `${readFileSync(join(warning.directory, "tasks.md"), "utf8")}\n- [ ] T005 [BUG:WARNING] [DEFERRED] {FR-001} [coverage-gap] Deferred warning\n`);
  writeFileSync(join(warning.directory, ".completed"), "Implementation complete\n");
  equal(evaluateFeatureLifecycle(warning.feature, warning.root).resumeAt, "qc");
});

test("LRE-005: QC-only resume revalidates all current lifecycle inputs without regeneration", () => {
  const qcPendingFixture = () => {
    const fixture = featureFixture();
    completeTasks(fixture);
    writeFileSync(join(fixture.directory, ".completed"), "Implementation complete\n");
    equal(evaluateFeatureLifecycle(fixture.feature, fixture.root).resumeAt, "qc");
    return fixture;
  };

  const spec = qcPendingFixture();
  writeFileSync(join(spec.directory, "spec.md"), `${readFileSync(join(spec.directory, "spec.md"), "utf8")}\n[NEEDS CLARIFICATION: one]\n[NEEDS CLARIFICATION: two]\n[NEEDS CLARIFICATION: three]\n[NEEDS CLARIFICATION: four]\n`);
  equal(evaluateFeatureLifecycle(spec.feature, spec.root).gate, "spec-to-plan");

  const plan = qcPendingFixture();
  writeFileSync(join(plan.directory, "plan.md"), "# malformed plan\n");
  equal(evaluateFeatureLifecycle(plan.feature, plan.root).gate, "plan-to-tasks");

  const tasks = qcPendingFixture();
  writeFileSync(join(tasks.directory, "tasks.md"), "# malformed tasks\n");
  equal(evaluateFeatureLifecycle(tasks.feature, tasks.root).gate, "tasks-to-implement");

  const checklist = qcPendingFixture();
  writeFileSync(join(checklist.directory, "checklists/requirements.md"), "- [ ] CHK001 Pending [Completeness, Spec §Success Criteria]\n");
  equal(evaluateFeatureLifecycle(checklist.feature, checklist.root).gate, "checklist-to-implement");

  const missing = qcPendingFixture();
  rmSync(join(missing.directory, "plan.md"));
  equal(evaluateFeatureLifecycle(missing.feature, missing.root).gate, "plan");

  const repeated = qcPendingFixture();
  writeFileSync(join(repeated.directory, "checklists/requirements.md"), "# Empty checklist\n");
  for (let run = 0; run < 2; run += 1) equal(evaluateFeatureLifecycle(repeated.feature, repeated.root).gate, "checklist-to-implement");
});

test("LRE-006: staged archives install at root and malformed archives fail closed", () => {
  const directory = mkdtempSync(join(tmpdir(), "sddp-release-e2e-"));
  temporaryRoots.push(directory);
  for (const relative of [".github", "AGENTS.md", "project-instructions.md"]) {
    const destination = join(directory, relative);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(join(repoRoot, relative), destination, { recursive: true });
  }
  rmSync(join(directory, ".github/workflows"), { recursive: true, force: true });
  equal(spawnSync(process.execPath, [join(repoRoot, "scripts/release-runtime-manifest.mjs"), "stage", directory]).status, 0);
  const archive = `${directory}.zip`;
  temporaryRoots.push(archive);
  equal(spawnSync("zip", ["-qr", archive, "."], { cwd: directory }).status, 0);
  validateReleaseArchive(archive);
  rmSync(join(directory, "scripts/parse-tasks.mjs"));
  const broken = `${directory}-broken.zip`;
  temporaryRoots.push(broken);
  equal(spawnSync("zip", ["-qr", broken, "."], { cwd: directory }).status, 0);
  throws(() => validateReleaseArchive(broken), /missing runtime file: scripts\/parse-tasks\.mjs/);
});

test("LRE-008: direct archive installation preserves consumer ignore rules", () => {
  const directory = mkdtempSync(join(tmpdir(), "sddp-release-ignore-"));
  temporaryRoots.push(directory);
  const original = "consumer-rule\ncustom/path";
  writeFileSync(join(directory, ".gitignore"), original);
  ensureImplementStateIgnored(directory);
  ensureImplementStateIgnored(directory);
  const result = readFileSync(join(directory, ".gitignore"), "utf8");
  ok(result.startsWith(original));
  equal(result.split(/\r?\n/).filter((line) => line === ".implement-state").length, 1);
});

test("LRE-007: every tool wrapper and transitive delegation surface resolves", async () => {
  deepEqual((await validateWrapperInventory(repoRoot, publicCommands)).findings, []);
  deepEqual((await validateCopilotDelegateGraph(repoRoot, publicCommands)).findings, []);
  deepEqual((await validateClaudeAgentGraph(repoRoot, publicCommands)).findings, []);
  deepEqual((await validateCodexDelegateGraph(repoRoot, publicCommands)).findings, []);
});

test("audit coverage map references existing lifecycle tests and all covered issues", () => {
  const coverage = readFileSync(join(repoRoot, "tests/fixtures/lifecycle-release/coverage.md"), "utf8");
  const lifecycleTests = readFileSync(fileURLToPath(import.meta.url), "utf8");
  const mappedIssues = new Set([...coverage.matchAll(/^\| #(\d+) \|/gm)].map((match) => Number(match[1])));
  const mappedTests = new Set([...coverage.matchAll(/`(LRE-\d{3})`/g)].map((match) => match[1]));
  const existingTests = new Set([...lifecycleTests.matchAll(/test\("(LRE-\d{3}):/g)].map((match) => match[1]));

  deepEqual([...mappedIssues].sort((a, b) => a - b), [61, 62, 63, 64, 65, 66, 67, 68, 69, 78]);
  for (const id of mappedTests) ok(existingTests.has(id), `coverage map references missing test ${id}`);
});
