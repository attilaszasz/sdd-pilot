import { afterEach, test } from "node:test";
import { deepEqual, equal, match, ok, throws } from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { configPath, detectRepositoryState, digest, fileDigest, inventory, readOptional, registerDocuments, resolveBootstrap, safePath } from "../scripts/lib/bootstrap-documents.mjs";
import { checkpoint, evidenceFingerprint, initialize, ledgerPath, onboardingGate, onboardingStatus, publish, readState, recordEpicCompletion, recover, renderLedger, validateState } from "../scripts/lib/onboarding.mjs";
import { coreConsumerRuntimeFiles, installedDiagnosticFiles } from "../scripts/release-runtime-manifest.mjs";
import { survey, validatePublication } from "../scripts/onboarding-state.mjs";
import { validateDod } from "../scripts/validate-dod.mjs";
import { validateProjectPlan } from "../scripts/validate-project-plan.mjs";
import { validatePrd } from "../scripts/validate-prd.mjs";

const repo = fileURLToPath(new URL("..", import.meta.url));
const roots = [];
const fixture = (name) => readFileSync(join(repo, "tests/fixtures", name), "utf8");
const stamp = "2026-10-19T00:00:00Z";
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function sandbox() { mkdirSync("/tmp/opencode", { recursive: true }); const root = mkdtempSync("/tmp/opencode/sddp-onboarding-"); roots.push(root); return root; }
function put(root, file, source) { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), source); }
function record(id, type, text, targets = [], extra = {}) { return { id, type, text, sources: [], dependsOn: [], targets, blocking: false, ...extra }; }
function decision(id, text, targets, extra = {}) { return record(id, "decision", text, targets, { by: "Project owner", at: stamp, disposition: "accepted", resolves: [], ...extra }); }
function save(root, state) { return checkpoint(root, state, fileDigest(root, ledgerPath)); }
function publishSelected(root, targets, validator = validatePublication) { return publish(root, targets, fileDigest(root, ledgerPath), (state, selected, projection, live) => validator(root, state, selected, projection, live)); }
function bindReview(state, output) {
  const { decision: id, ...binding } = output.approval;
  state.records.find((record) => record.id === id).review = { [output.target]: { ...binding, profile: output.profile } };
}
function reconfirm(root, state, output) {
  const id = `RE-${String(Number(state.records.at(-1).id.slice(3)) + 1).padStart(3, "0")}`;
  state.records.push(decision(id, "Confirm the updated candidate and evidence after a fresh review.", [output.target], { scope: "publication", resolves: output.approval ? [output.approval.decision] : [] }));
  output.approval = { decision: id, candidateDigest: fileDigest(root, output.candidate), evidenceDigest: evidenceFingerprint(root, state, output), targetDigest: fileDigest(root, output.target), configDigest: fileDigest(root, configPath) };
  bindReview(state, output);
}
const dodHeadings = ["Deployment Summary and Context", "Environment Strategy", "Deployment Targets and Packaging", "CI/CD Pipeline Design", "Infrastructure and Hosting", "Observability and Monitoring", "Reliability Engineering", "Security and Compliance in Operations", "Operational Ownership and Processes", "Deployment Decisions", "Risks, Assumptions, Constraints, and Open Questions"];
const dod = () => `# Deployment & Operations Document: Fixture\n\n${dodHeadings.map((heading) => `## ${heading}\n\nUnknown; confirm with the operator.\n`).join("\n")}`;
function approved(root, kind = "prd", source = fixture("prd/valid-draft.md"), evidenceFile = "src/app.js") {
  put(root, evidenceFile, "export const capability = true;\n");
  let state = readState(root) ?? initialize(root);
  const output = state.outputs.find((entry) => entry.kind === kind);
  const nextId = Number(state.records.at(-1)?.id.slice(3) ?? 0) + 1;
  const factId = `RE-${String(nextId).padStart(3, "0")}`;
  const decisionId = `RE-${String(nextId + (kind === "prd" ? 2 : 1)).padStart(3, "0")}`;
  state.records.push(record(factId, "fact", "Source declares a capability; no production claim.", [output.target], { sources: [{ path: evidenceFile, digest: fileDigest(root, evidenceFile), locator: "capability" }], implementation: "implemented", verification: "source-inspected" }));
  if (kind === "prd") state.records.push(decision(`RE-${String(nextId + 1).padStart(3, "0")}`, "Accept these capability clusters, priorities, and outcomes.", [output.target], { scope: "product-scope", capabilities: validatePrd(source).capabilities.map((entry) => ({ name: entry.capability, priority: entry.priority, outcome: entry.outcome })) }));
  state.records.push(decision(decisionId, "Publish the named candidate as a reference with the stated caveats.", [output.target], { scope: "publication" }));
  output.candidate = `specs/reverse-engineering/candidates/${kind}.md`;
  output.profile = kind === "dod" ? "reference" : "draft";
  output.readiness = "reference";
  output.claims = [factId];
  output.sections = [...source.matchAll(/^## (.+)$/gm)].map((heading) => ({ heading: heading[1], records: [factId], treatment: "mixed" }));
  put(root, output.candidate, source);
  output.approval = { decision: decisionId, candidateDigest: digest(source), evidenceDigest: evidenceFingerprint(root, state, output), targetDigest: fileDigest(root, output.target), configDigest: fileDigest(root, configPath) };
  bindReview(state, output);
  state = save(root, state);
  return { state, target: output.target, factId };
}

test("RE-001: missing state/status is read-only, start preserves layout, survey handles absent Git", () => {
  const root = sandbox();
  deepEqual(onboardingStatus(root), { exists: false, valid: true, outputs: [] });
  equal(existsSync(join(root, "specs")), false);
  put(root, "app/server.py", "print('existing')\n");
  equal(survey(root).baseline.head, null);
  equal(detectRepositoryState(root).state, "EXISTING");
  const state = initialize(root);
  equal(state.nextStage, "survey");
  equal(state.outputs.length, 4);
  throws(() => initialize(root), /already exists/);
  equal(readOptional(root, "app/server.py"), "print('existing')\n");
  match(readOptional(root, "specs/reverse-engineering/.gitignore"), /\/\.recovery\//);
});

test("RE-002: framework runtime alone is not implementation; script-only apps and monorepos are", () => {
  const root = sandbox();
  put(root, "scripts/onboarding-state.mjs", "// installed runtime\n");
  put(root, ".github/agents/role.md", "framework");
  equal(detectRepositoryState(root).state, "NEW");
  put(root, "scripts/application.mjs", "export const run = () => {};\n");
  equal(detectRepositoryState(root).state, "EXISTING");
  put(root, "packages/api/main.go", "package main\n");
  deepEqual(inventory(root, ["packages/api"]), ["packages/api/main.go"]);
});

test("RE-003: path safety, symlink and sensitive-source exclusions", () => {
  const root = sandbox();
  for (const file of ["../escape", "/absolute", "a/../b", "a\\b", "C:drive", "a//b", "a/./b"]) throws(() => safePath(root, file), /Unsafe/);
  put(root, ".env", "DO_NOT_COPY=secret");
  put(root, "infra/terraform.tfstate", "secret");
  put(root, ".env.example", "NAME=\n");
  symlinkSync(join(root, ".env"), join(root, "link"));
  throws(() => readOptional(root, "link"), /Symlink/);
  deepEqual(inventory(root), [".env.example"]);
  put(root, ".aws/credentials", "private credentials");
  put(root, ".kube/config", "private token");
  put(root, ".npmrc", "private token");
  deepEqual(inventory(root), [".env.example"]);
  const state = initialize(root);
  state.records.push(record("RE-001", "fact", "Unsafe source", [], { sources: [{ path: ".env", digest: digest("secret"), locator: "line 1" }] }));
  throws(() => validateState(state, root), /Sensitive/);
});

test("RE-004: custom canonical targets and unrelated config survive registration", () => {
  const root = sandbox();
  put(root, "docs/product.md", fixture("prd/valid-draft.md"));
  put(root, configPath, "# Config\n\n## Product Document\n\n**Path**: docs/product.md\n\n## Autopilot\n\n**Enabled**: true\n");
  equal(resolveBootstrap(root).prd, "docs/product.md");
  const next = registerDocuments(readOptional(root, configPath), [["dod", "docs/operations.md"]]);
  match(next, /\*\*Enabled\*\*: true/);
  match(next, /\*\*Path\*\*: docs\/product.md/);
  equal(existsSync(join(root, "specs/prd.md")), false);
  put(root, configPath, next.replace("docs/product.md", "missing.md"));
  throws(() => resolveBootstrap(root), /Broken prd registration/);
  put(root, configPath, "## Product Document\n\n**Path**: ../outside\n");
  throws(() => resolveBootstrap(root), /Unsafe/);
});

test("RE-005: append-only state, explicit answers, stages and digest-based concurrency", () => {
  const root = sandbox();
  let state = initialize(root);
  state.currentStage = "reconcile"; state.nextStage = "synthesize"; state.awaitingUser = true;
  state.records.push(record("RE-001", "question", "Who is the intended user?", ["specs/prd.md"], { blocking: true }));
  state = save(root, state);
  equal(onboardingStatus(root).awaitingUser, true);
  const oldDigest = fileDigest(root, ledgerPath);
  const altered = structuredClone(state); altered.records[0].text = "Silent answer";
  throws(() => save(root, altered), /append-only/);
  state.records.push(decision("RE-002", "Defer product scope; publish only a draft.", ["specs/prd.md"], { resolves: ["RE-001"], disposition: "deferred" }));
  state.awaitingUser = false;
  state = save(root, state);
  throws(() => checkpoint(root, state, oldDigest), /Ledger changed/);
  state.status = "completed"; state.currentStage = "none"; state.nextStage = "none";
  equal(save(root, state).status, "completed");
  equal(onboardingStatus(root).questions.length, 0);
  put(root, ledgerPath, "malformed");
  throws(() => onboardingStatus(root), /Missing onboarding state/);
});

test("RE-006: inference cannot be relabeled fact; executed verification needs real evidence fields", () => {
  const root = sandbox();
  const { state } = approved(root);
  const inference = record("RE-004", "inference", "Likely user role", ["specs/prd.md"], { sources: state.records[0].sources, rationale: "Naming suggests a role", alternatives: "Could be a fixture", confidence: "high" });
  state.records.push(inference);
  state.outputs[0].claims.push("RE-004");
  state.outputs[0].sections[0] = { heading: "Product Overview", records: ["RE-004"], treatment: "fact" };
  throws(() => validateState(state, root), /cannot be upgraded/);
  state.outputs[0].sections[0].treatment = "inference";
  inference.verification = "tests-passed";
  throws(() => validateState(state, root), /Execution evidence/);
});

test("RE-007: approved draft publication validates candidate/live and registers only selected output", () => {
  const root = sandbox();
  const { target } = approved(root);
  deepEqual(publishSelected(root, [target]).published, [target]);
  equal(readOptional(root, target), fixture("prd/valid-draft.md"));
  match(readOptional(root, configPath), /\*\*Path\*\*: specs\/prd.md/);
  equal(onboardingStatus(root).outputs.find((output) => output.target === target).stale, false);
  equal(readOptional(root, "specs/sad.md"), null);
  equal(readOptional(root, "specs/00001-imported/.qc-passed"), null);
  equal(onboardingGate(root, [target]).valid, true);
});

test("RE-008: candidate, evidence, live-target, and config edits invalidate scoped approval", () => {
  for (const change of ["candidate", "source", "target", "config"]) {
    const root = sandbox();
    const { state, target } = approved(root);
    if (change === "candidate") put(root, state.outputs[0].candidate, `${fixture("prd/valid-draft.md")}\nChanged\n`);
    if (change === "source") put(root, "src/app.js", "export const capability = false;\n");
    if (change === "target") put(root, target, "User-authored content\n");
    if (change === "config") put(root, configPath, "# User config\n");
    throws(() => publishSelected(root, [target]), /changed after approval|Evidence changed|Live document changed|Config changed/);
    if (change !== "target") equal(readOptional(root, target), null);
    else equal(readOptional(root, target), "User-authored content\n");
  }
});

test("RE-009: source hashes invalidate dependent published outputs, not unrelated candidates", () => {
  const root = sandbox();
  const { target } = approved(root);
  publishSelected(root, [target]);
  approved(root, "dod", dod(), "ops/deploy.yml");
  equal(onboardingGate(root, [target]).valid, true);
  put(root, "ops/deploy.yml", "changed independently\n");
  equal(onboardingGate(root, [target]).valid, true);
  put(root, "src/app.js", "changed without a commit\n");
  equal(onboardingGate(root, [target]).valid, false);
  equal(onboardingGate(root, ["specs/sad.md"]).valid, true);
});

test("RE-010: candidate and live validation failures restore prior bytes/config", () => {
  const root = sandbox();
  const { target } = approved(root);
  throws(() => publishSelected(root, [target], (directory, state, selected, projection, live) => {
    if (live) throw new Error("Injected live validator failure");
    validatePublication(directory, state, selected, projection, live);
  }), /live validator failure/);
  equal(readOptional(root, target), null);
  equal(readOptional(root, configPath), null);
  equal(readState(root).outputs[0].publishedDigest, null);
  equal(onboardingStatus(root).transaction, false);
  const broken = approved(root, "dod", "# Invalid DOD\n", "ops/config.yml");
  throws(() => publishSelected(root, [broken.target]), /candidate validation failed/);
  equal(readOptional(root, broken.target), null);
});

test("RE-011: recovery checks the whole transaction before restoring and preserves user edits", () => {
  const root = sandbox();
  const { target } = approved(root);
  const entries = [
    { path: target, before: null, after: "tool output", beforeDigest: null, afterDigest: digest("tool output") },
    { path: configPath, before: null, after: "tool config", beforeDigest: null, afterDigest: digest("tool config") },
  ];
  put(root, target, "tool output");
  put(root, configPath, "user edit");
  put(root, "specs/reverse-engineering/.recovery/publication.json", JSON.stringify({ schema: 1, status: "prepared", entries }));
  equal(onboardingGate(root, [target]).valid, false);
  throws(() => recover(root), /Recovery blocked by user edit/);
  equal(readOptional(root, target), "tool output");
  equal(readOptional(root, configPath), "user edit");
  put(root, configPath, "tool config");
  equal(recover(root).recovered, true);
  equal(readOptional(root, target), null);
  equal(readOptional(root, configPath), null);
});

test("RE-012: active discovery blocks PRD publication, not independent DOD inspection/publication", () => {
  const root = sandbox();
  const { target } = approved(root);
  put(root, "specs/prd-discovery.md", fixture("prd/active-discovery.md"));
  throws(() => publishSelected(root, [target]), /Active PRD discovery/);
  const operations = approved(root, "dod", dod(), "ops/config.yml");
  equal(publishSelected(root, [operations.target]).valid, true);
});

test("RE-013: safe local history is attributed and shallow/dirty status is explicit", () => {
  const root = sandbox();
  put(root, "main.js", "export const previous = true;\n");
  const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  git(["init"]); git(["add", "."]); git(["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "Recorded statement, not proof of intent"]);
  const summary = survey(root);
  match(summary.baseline.head, /^[a-f0-9]{40}$/);
  equal(summary.baseline.shallow, "false");
  put(root, "main.js", "export const previous = false;\n");
  match(survey(root).baseline.dirty, /main.js/);
});

test("RE-014: DOD reference validator accepts honest gaps, rejects sample/default leakage", () => {
  equal(validateDod(dod()).valid, true);
  equal(validateDod("# Incomplete\n").valid, false);
  equal(validateDod(`${dod()}\n[PROJECT]\n`).valid, false);
  equal(validateDod(dod(), { configSource: "## Deployment & Operations Document\n\n**Path**: elsewhere.md\n" }).valid, false);
});

function brownfieldPlan() {
  const prd = fixture("prd/valid-planning-ready.md");
  const sad = fixture("sad/valid-planning-ready.md");
  const product = validatePrd(prd, { profile: "planning-ready" });
  const tags = [...product.capabilities.map((capability) => `PRD:${capability.id}`), ...[...sad.matchAll(/^\| (ADR-\d{4}) \|[^\n]*?\| accepted \|/gm)].map((match) => `SAD:${match[1]}`)];
  const ledger = { records: [record("RE-001", "fact", "Existing source", [], { implementation: "implemented", sources: [{ path: "src/app.js", digest: digest("source"), locator: "app" }] }), decision("RE-002", "Keep the observed baseline", ["specs/project-plan.md"]), decision("RE-003", "No future work is planned", ["specs/project-plan.md"], { scope: "no-future-work" })] };
  const block = { schema: 1, items: tags.map((tag) => ({ source: tag, disposition: "baseline", scope: "Confirmed existing scope", limitation: "Source inspected, no release certification", evidence: ["RE-001"], decision: "RE-002", epics: [] })), futureWork: [], noFutureWork: "RE-003" };
  const make = () => `---\ncreated: 2026-10-19\nprd_source: specs/prd.md\nprd_capability_digest: ${product.capabilityDigest}\nsad_source: specs/sad.md\ndod_source: \n---\n\n# Project Implementation Plan\n\n${["Epic Checklist", "Dependency Diagram", "Execution Wave Summary", "Parallel Execution Guidance", "Coverage Validation", "Shared Artifact Surface", "Wave Transition Protocol"].map((heading) => `## ${heading}\n\n${heading === "Coverage Validation" ? `<!-- sddp-baseline-coverage -->\n\x60\x60\x60json\n${JSON.stringify(block)}\n\x60\x60\x60` : "No future work planned; retain the confirmed baseline."}\n`).join("\n")}`;
  return { prd, sad, ledger, block, make };
}

test("RE-015: confirmed zero-epic baseline plan passes without synthetic completion", () => {
  const data = brownfieldPlan();
  const result = validateProjectPlan(data.make(), { prdSource: data.prd, sadSource: data.sad, ledger: data.ledger });
  equal(result.valid, true, JSON.stringify(result.errors));
  equal(result.noPlannedWork, true);
  equal(result.epics, 0);
  data.block.noFutureWork = null;
  match(validateProjectPlan(data.make(), { prdSource: data.prd, sadSource: data.sad, ledger: data.ledger }).errors.join("\n"), /explicit no-future-work/);
});

test("RE-016: plan coverage cannot silently lose evidence, source coverage, decisions, or freshness", () => {
  const data = brownfieldPlan();
  const options = { prdSource: data.prd, sadSource: data.sad, ledger: data.ledger };
  data.block.items[0].evidence = [];
  equal(validateProjectPlan(data.make(), options).valid, false);
  data.block.items[0].evidence = ["RE-001"];
  data.block.items.pop();
  equal(validateProjectPlan(data.make(), options).valid, false);
  equal(validateProjectPlan(data.make().replace(/prd_capability_digest: [a-f0-9]+/, "prd_capability_digest: stale"), options).valid, false);
  equal(validateProjectPlan(data.make(), { ...options, ledger: null }).valid, false);
});

test("RE-017: state CLI survives a fresh process at every paused stage and status never writes", () => {
  const root = sandbox();
  let state = initialize(root);
  for (const stage of ["survey", "inspect", "reconcile", "synthesize", "publish", "report"]) {
    state.currentStage = stage; state.nextStage = stage;
    state = save(root, state);
    const before = fileDigest(root, ledgerPath);
    const result = spawnSync(process.execPath, [join(repo, "scripts/onboarding-state.mjs"), "status"], { cwd: root, encoding: "utf8" });
    equal(result.status, 0, result.stdout);
    equal(JSON.parse(result.stdout).nextStage, stage);
    equal(fileDigest(root, ledgerPath), before);
  }
});

test("RE-018: actual installed framework assets and blank/CRLF registrations remain new-project-safe", () => {
  const root = sandbox();
  for (const file of [...coreConsumerRuntimeFiles, ...installedDiagnosticFiles]) put(root, file, "// installed framework asset\n");
  const config = readFileSync(join(repo, configPath), "utf8").replace(/\r?\n/g, "\r\n");
  put(root, configPath, config);
  equal(detectRepositoryState(root).state, "NEW");
  equal(initialize(root).outputs[0].target, "specs/prd.md");
  const registered = registerDocuments(config, [["dod", "docs/operations.md"]]);
  equal((registered.match(/## Deployment & Operations Document/g) ?? []).length, 1);
  match(registered, /\*\*Path\*\*: docs\/operations.md\r\n/);
  put(root, "index.html", "<p>Existing static product</p>");
  equal(detectRepositoryState(root).state, "EXISTING");
});

test("RE-019: unsafe initialization writes nothing and broken registrations block only their output", () => {
  const root = sandbox();
  put(root, configPath, "## Product Document\n\n**Path**: ../outside.md\n");
  throws(() => initialize(root), /Unsafe/);
  equal(existsSync(join(root, "specs")), false);
  put(root, configPath, "## Product Document\n\n**Path**: missing.md\n");
  const state = initialize(root);
  equal(state.outputs[0].readiness, "blocked");
  match(state.records[0].text, /Broken prd registration/);
  const operations = approved(root, "dod", dod(), "ops/config.yml");
  equal(publishSelected(root, [operations.target]).valid, true);
  equal(readOptional(root, "specs/prd.md"), null);
});

test("RE-020: canonical retarget needs an attributed decision and preserves the old document", () => {
  const root = sandbox();
  put(root, "docs/old-operations.md", dod());
  put(root, configPath, registerDocuments(null, [["dod", "docs/old-operations.md"]]));
  let state = initialize(root);
  const output = state.outputs.find((entry) => entry.kind === "dod");
  output.target = "docs/current-operations.md";
  throws(() => save(root, structuredClone(state)), /Retargeting needs/);
  state.records.push(decision("RE-001", "Use the new operations path; retain the prior document as history.", ["docs/old-operations.md", output.target], { scope: "canonical-target", from: "docs/old-operations.md", to: output.target }));
  state = save(root, state);
  const accepted = approved(root, "dod", dod(), "ops/config.yml");
  equal(publishSelected(root, [accepted.target]).valid, true);
  equal(readOptional(root, "docs/old-operations.md"), dod());
  equal(readOptional(root, "specs/dod.md"), null);
  match(readOptional(root, configPath), /docs\/current-operations.md/);
});

test("RE-021: coverage detects new files selectively and unknown states cannot masquerade as ready", () => {
  const root = sandbox();
  const accepted = approved(root);
  let state = readState(root);
  state.coverage.push({ area: "Product source", status: "inspected", summary: "Inspected the source boundary", prefixes: ["src"], targets: [accepted.target] });
  reconfirm(root, state, state.outputs[0]);
  save(root, state);
  publishSelected(root, [accepted.target]);
  put(root, "docs/unrelated.md", "Unrelated notes\n");
  equal(onboardingGate(root, [accepted.target]).valid, true);
  put(root, "src/new-capability.js", "export const newCapability = true;\n");
  equal(onboardingGate(root, [accepted.target]).valid, false);
  equal(onboardingStatus(root).outputs[0].readiness, "blocked");
  state = readState(root); state.schema = 2;
  throws(() => validateState(state, root), /Unsupported onboarding schema/);
});

test("RE-022: a new CAP needs actual scope/outcome/priority confirmation, not publication consent", () => {
  const root = sandbox();
  const accepted = approved(root);
  // Construct an initial fixture with only observation and publication consent.
  const state = readState(root);
  state.records.splice(1, 1);
  state.outputs[0].approval.evidenceDigest = evidenceFingerprint(root, state, state.outputs[0]);
  bindReview(state, state.outputs[0]);
  put(root, ledgerPath, renderLedger(state));
  throws(() => publishSelected(root, [accepted.target]), /scope\/outcome\/priority is not explicitly decided/);
  equal(readOptional(root, accepted.target), null);
});

test("RE-023: unknown or unapproved future work cannot enter a partial-capability plan", () => {
  const data = brownfieldPlan();
  const item = data.block.items.find((entry) => entry.source === "PRD:CAP-001");
  item.disposition = "partial"; item.epics = ["E001"];
  const line = "### Wave 1 — Remaining scope\n\n- [ ] E001 [P1] [PRODUCT] {PRD:CAP-001} Finish context checks — Approved remainder [→ Details](plan/E001.md)\n";
  const detail = ["Problem Statement", "Scope", "Demo Plan", "Traceability & Dependencies", "Integration Points", "Draft User Scenarios", "Acceptance Criteria", "Implementation Signals", "Assumptions & Risks", "Draft Success Criteria", "Specify Input", "Pipeline Hints"].map((heading) => `## ${heading}\n\n${heading === "Traceability & Dependencies" ? "- **Depends on**: None" : "Confirmed remaining scope."}\n`).join("\n");
  const source = () => data.make().replace("## Epic Checklist\n", `## Epic Checklist\n\n${line}`);
  const options = { prdSource: data.prd, sadSource: data.sad, ledger: data.ledger, details: { E001: detail } };
  match(validateProjectPlan(source(), options).errors.join("\n"), /Future work not explicitly approved/);
  data.ledger.records.push(decision("RE-004", "Approve only the remaining context checks, P1 in the first wave; replace the earlier no-future-work decision.", ["specs/project-plan.md"], { scope: "future-work", resolves: ["RE-003"] }));
  data.block.noFutureWork = null;
  data.block.futureWork.push({ epic: "E001", decision: "RE-004" });
  const result = validateProjectPlan(source(), options);
  equal(result.valid, true, JSON.stringify(result.errors));
  const cycle = { ...options, details: { E001: detail.replace("**Depends on**: None", "**Depends on**: E001") } };
  match(validateProjectPlan(source(), cycle).errors.join("\n"), /Circular epic dependency/);
});

test("RE-024: completion provenance rejects failed QC and never refreshes stale source evidence", () => {
  const root = sandbox();
  const accepted = approved(root, "plan", "# Planned fixture\n\n- [ ] E001 [P1] [PRODUCT] {PRD:CAP-001} Existing approved remainder\n");
  // This fixture isolates the journaled transition; the CLI always injects the real QC verifier.
  publishSelected(root, [accepted.target], () => {});
  put(root, "specs/00001-fixture/qc-report.md", "QC fixture\n");
  put(root, "specs/00001-fixture/.qc-passed", "QC marker fixture\n");
  throws(() => recordEpicCompletion(root, accepted.target, "specs/00001-fixture", "E001", () => ({ QC_COMPLETE: false, COMPLETION_ISSUES: ["incomplete"] })), /does not permit/);
  match(readOptional(root, accepted.target), /- \[ \] E001/);
  put(root, "src/app.js", "Changed source must remain stale\n");
  equal(recordEpicCompletion(root, accepted.target, "specs/00001-fixture", "E001", () => ({ QC_COMPLETE: true, COMPLETION_ISSUES: [] })).changed, true);
  match(readOptional(root, accepted.target), /- \[X\] E001/);
  equal(onboardingGate(root, [accepted.target]).valid, false);
  equal(readState(root).events.at(-1).event, "epic-completed");
});

test("RE-025: real plan validation publishes a zero-work baseline using existing registered PRD/SAD", () => {
  const root = sandbox();
  const data = brownfieldPlan();
  put(root, "src/app.js", "source");
  put(root, "specs/prd.md", data.prd); put(root, "specs/sad.md", data.sad);
  put(root, configPath, registerDocuments(null, [["prd", "specs/prd.md"], ["sad", "specs/sad.md"]]));
  let state = initialize(root);
  state.records = data.ledger.records;
  state.records.push(decision("RE-004", "Publish the baseline-only implementation plan.", ["specs/project-plan.md"], { scope: "publication" }));
  const output = state.outputs.find((entry) => entry.kind === "plan");
  output.profile = "planning-ready"; output.readiness = "planning-ready";
  output.candidate = "specs/reverse-engineering/candidates/plan.md";
  put(root, output.candidate, data.make());
  output.claims = ["RE-001", "RE-002", "RE-003"];
  output.sections = [...data.make().matchAll(/^## (.+)$/gm)].map((entry) => ({ heading: entry[1], records: ["RE-001", "RE-002", "RE-003"], treatment: "mixed" }));
  output.dependencies = ["specs/prd.md", "specs/sad.md"];
  output.approval = { decision: "RE-004", candidateDigest: digest(data.make()), evidenceDigest: evidenceFingerprint(root, state, output), targetDigest: null, configDigest: fileDigest(root, configPath) };
  bindReview(state, output);
  save(root, state);
  equal(publishSelected(root, [output.target]).valid, true);
  equal(onboardingStatus(root).outputs.find((entry) => entry.kind === "plan").readiness, "planning-ready");
  const validate = () => spawnSync(process.execPath, [join(repo, "scripts/validate-project-plan.mjs"), "specs/project-plan.md", "--prd", "specs/prd.md", "--sad", "specs/sad.md", "--config", configPath], { cwd: root, encoding: "utf8" });
  let result = validate();
  equal(result.status, 0, result.stdout);
  equal(JSON.parse(result.stdout).noPlannedWork, true);
  equal(readOptional(root, "specs/prd.md"), data.prd);
  equal(readOptional(root, "specs/sad.md"), data.sad);
  put(root, "src/app.js", "changed without changing HEAD");
  result = validate();
  equal(result.status, 1);
  match(result.stdout, /Stale onboarding baseline/);
});

test("RE-026: a selected multi-document set validates and publishes as one recoverable transaction", () => {
  const root = sandbox();
  const product = approved(root);
  const operations = approved(root, "dod", dod(), "ops/config.yml");
  equal(publishSelected(root, [product.target, operations.target]).valid, true);
  const status = onboardingStatus(root);
  equal(status.outputs.filter((output) => output.published).length, 2);
  equal(status.outputs.filter((output) => output.stale).length, 0);
  equal(status.transaction, false);
  equal(readState(root).outputs[0].validation.live, "PASS");
});

test("RE-027: source/config edits during validation cannot be recorded as a successful publication", () => {
  for (const edit of ["source", "config"]) {
    const root = sandbox();
    const accepted = approved(root);
    throws(() => publishSelected(root, [accepted.target], (directory, state, selected, projection, live) => {
      validatePublication(directory, state, selected, projection, live);
      if (live) put(root, edit === "source" ? "src/app.js" : configPath, "Intervening user edit\n");
    }), /changed during publication|Concurrent edit after live validation/);
    equal(readOptional(root, edit === "source" ? "src/app.js" : configPath), "Intervening user edit\n");
    equal(readState(root).outputs[0].publishedDigest, null);
    if (edit === "source") equal(readOptional(root, accepted.target), null);
    else equal(onboardingStatus(root).transaction, true);
  }
});

test("RE-028: deferred blockers cannot be promoted to planning-ready and new sessions need consent", () => {
  const root = sandbox();
  let state = initialize(root);
  state.records.push(record("RE-001", "question", "Confirm product boundary", ["specs/prd.md"], { blocking: true }));
  state.records.push(decision("RE-002", "Defer this boundary decision", ["specs/prd.md"], { resolves: ["RE-001"], disposition: "deferred" }));
  state.status = "completed"; state.currentStage = "none"; state.nextStage = "none";
  state = save(root, state);
  state.status = "active"; state.currentStage = "survey"; state.nextStage = "survey"; state.session += 1;
  throws(() => save(root, structuredClone(state)), /explicit new-session decision/);
  state.records.push(decision("RE-003", "Start an incremental onboarding session", [], { scope: "new-session" }));
  save(root, state);
  const accepted = approved(root, "prd", fixture("prd/valid-planning-ready.md"));
  state = readState(root);
  const output = state.outputs[0];
  output.profile = "planning-ready"; output.readiness = "planning-ready";
  reconfirm(root, state, output);
  save(root, state);
  throws(() => publishSelected(root, [accepted.target]), /Unresolved consequential claim: RE-001/);
});

test("RE-029: resurvey replaces stale observations without deleting history or reusing old consent", () => {
  const root = sandbox();
  const accepted = approved(root);
  publishSelected(root, [accepted.target]);
  put(root, "src/app.js", "export const capability = true; // re-inspected revision\n");
  equal(onboardingGate(root, [accepted.target]).valid, false);
  const state = readState(root);
  state.records.push(record("RE-004", "fact", "Capability remains declared in the revised source.", [accepted.target], { implementation: "implemented", verification: "source-inspected", sources: [{ path: "src/app.js", digest: fileDigest(root, "src/app.js"), locator: "capability" }] }));
  state.records.push(decision("RE-005", "Replace the original observation with the re-inspected source; retain the prior evidence as history.", [accepted.target], { scope: "evidence-reconciliation", resolves: ["RE-001"], replacements: ["RE-004"], dependsOn: ["RE-004"] }));
  state.records.push(decision("RE-006", "Reconfirm publication after the source review.", [accepted.target], { scope: "publication", resolves: ["RE-003"] }));
  const output = state.outputs[0];
  output.claims = ["RE-004"];
  for (const section of output.sections) section.records = ["RE-004"];
  output.approval = { decision: "RE-006", candidateDigest: fileDigest(root, output.candidate), evidenceDigest: evidenceFingerprint(root, state, output), targetDigest: fileDigest(root, output.target), configDigest: fileDigest(root, configPath) };
  bindReview(state, output);
  save(root, state);
  equal(publishSelected(root, [accepted.target]).valid, true);
  equal(readState(root).records[0].id, "RE-001");
  equal(readState(root).records[0].sources[0].digest === fileDigest(root, "src/app.js"), false);
  equal(onboardingGate(root, [accepted.target]).valid, true);
});

test("RE-030: withdrawn scope cannot be authorized by an earlier accepted decision", () => {
  const root = sandbox();
  const accepted = approved(root);
  const state = readState(root);
  state.records.push(decision("RE-004", "Withdraw the earlier capability-scope decision pending review.", [accepted.target], { scope: "product-scope", resolves: ["RE-002"], disposition: "rejected" }));
  reconfirm(root, state, state.outputs[0]);
  save(root, state);
  throws(() => publishSelected(root, [accepted.target]), /not explicitly decided/);
  equal(readOptional(root, accepted.target), null);
});

test("RE-031: selecting a new canonical path cannot discard the prior document's stable IDs", () => {
  const root = sandbox();
  put(root, "docs/previous-product.md", fixture("prd/valid-draft.md"));
  put(root, configPath, registerDocuments(null, [["prd", "docs/previous-product.md"]]));
  const state = initialize(root);
  state.records.push(decision("RE-001", "Use the new canonical product path, retaining existing product decisions.", ["docs/previous-product.md", "specs/prd.md"], { scope: "canonical-target", from: "docs/previous-product.md", to: "specs/prd.md" }));
  state.outputs[0].target = "specs/prd.md";
  save(root, state);
  const source = fixture("prd/valid-draft.md").split("\n").filter((line) => !line.startsWith("| CAP-002")).join("\n");
  const accepted = approved(root, "prd", source);
  throws(() => publishSelected(root, [accepted.target]), /Protected bootstrap ID removed: CAP-002/);
  equal(readOptional(root, "specs/prd.md"), null);
  equal(readOptional(root, "docs/previous-product.md"), fixture("prd/valid-draft.md"));
});

test("RE-032: SAD publication resolves custom-path ADR links and tracks their actual evidence", () => {
  const root = sandbox();
  const source = fixture("sad/valid-planning-ready.md")
    .replace("sad_maturity: planning-ready", "sad_maturity: draft")
    .replace("| N/A | No durable decisions yet | proposed | 2026-08-20 | - | N/A |", "| ADR-0001 | Retain transaction boundary | accepted | 2026-08-20 | - | [0001-transaction-boundary.md](adrs/0001-transaction-boundary.md) |")
    .replaceAll("](adrs/", "](../specs/adrs/");
  put(root, "docs/architecture.md", source);
  put(root, configPath, registerDocuments(null, [["sad", "docs/architecture.md"]]));
  const accepted = approved(root, "sad", source);
  throws(() => publishSelected(root, [accepted.target]), /Missing or inconsistent standalone ADR/);
  const state = readState(root);
  const output = state.outputs.find((entry) => entry.kind === "sad");
  const rows = [...source.matchAll(/^\| (ADR-\d{4}) \|[^\n]*?\| (proposed|accepted|deprecated|superseded) \|[^\n]*?\[[^\]]+\]\(\.\.\/(specs\/adrs\/[^)]+)\)/gm)];
  ok(rows.length > 0);
  for (const row of rows) {
    put(root, row[3], `---\nadr_id: ${row[1]}\nstatus: ${row[2]}\n---\n# Existing decision fixture\n`);
    output.dependencies.push(row[3]);
  }
  reconfirm(root, state, output);
  save(root, state);
  equal(publishSelected(root, [accepted.target]).valid, true);
  equal(readOptional(root, "specs/sad.md"), null);
  put(root, rows[0][3], "Changed ADR\n");
  equal(onboardingGate(root, [accepted.target]).valid, false);
});

test("RE-033: pending alternatives do not invalidate an untouched published document", () => {
  const root = sandbox();
  const accepted = approved(root);
  publishSelected(root, [accepted.target]);
  const state = readState(root);
  put(root, "docs/additional-evidence.md", "Additional product evidence exists.\n");
  state.records.push(record("RE-004", "fact", "Additional evidence document exists.", [accepted.target], { sources: [{ path: "docs/additional-evidence.md", digest: fileDigest(root, "docs/additional-evidence.md"), locator: "document" }] }));
  const output = state.outputs[0];
  output.candidate = "specs/reverse-engineering/candidates/alternative.md";
  output.claims.push("RE-004");
  output.sections.push({ heading: "Additional evidence", records: ["RE-004"], treatment: "fact" });
  output.approval = null;
  put(root, output.candidate, `${fixture("prd/valid-draft.md")}\n## Additional evidence\n\nA supporting document is available for review.\n`);
  save(root, state);
  equal(onboardingGate(root, [accepted.target]).valid, true);
  const status = onboardingStatus(root).outputs[0];
  equal(status.stale, false);
  equal(status.readiness, "reference");
  equal(status.confirmation, "awaiting");
});

test("RE-034: changed bytes/profile cannot be rebound to immutable old publication consent", () => {
  const root = sandbox();
  const accepted = approved(root);
  let state = readState(root);
  const candidate = state.outputs[0].candidate;
  put(root, candidate, `${readOptional(root, candidate)}\nChanged candidate prose.\n`);
  state.outputs[0].approval.candidateDigest = fileDigest(root, candidate);
  throws(() => save(root, state), /immutable publication decision/);
  state = readState(root);
  state.outputs[0].approval = null;
  save(root, state);
  state = readState(root);
  state.outputs[0].approval = { decision: "RE-003", candidateDigest: fileDigest(root, candidate), evidenceDigest: evidenceFingerprint(root, state, state.outputs[0]), targetDigest: null, configDigest: null };
  throws(() => save(root, state), /immutable publication decision/);
  state.outputs[0].approval = null;
  reconfirm(root, state, state.outputs[0]);
  save(root, state);
  equal(publishSelected(root, [accepted.target]).valid, true);
});
