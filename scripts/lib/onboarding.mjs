import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, closeSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { bootstrapDocuments, configPath, digest, fileDigest, inventory, jsonBlock, readOptional, registerDocuments, registration, resolveBootstrap, safePath, sensitivePath } from "./bootstrap-documents.mjs";

export const ledgerPath = "specs/reverse-engineering.md";
export const supportPath = "specs/reverse-engineering";
const recoveryPath = `${supportPath}/.recovery`;
const journalPath = `${recoveryPath}/publication.json`;
const marker = "sddp-onboarding-state";
const stages = ["survey", "inspect", "reconcile", "synthesize", "publish", "report", "none"];
const statuses = ["active", "completed", "abandoned"];
const hashPattern = /^[a-f0-9]{64}$/;
const recordPattern = /^RE-\d{3,}$/;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const canonicalJson = (value) => JSON.stringify(value);
const now = () => new Date().toISOString();

export function parseLedger(source) {
  const state = jsonBlock(source, marker);
  assert(state, "Missing onboarding state block");
  for (const [key, value] of Object.entries({ onboarding_schema: state.schema, status: state.status, awaiting_user: state.awaitingUser, current_stage: state.currentStage, next_stage: state.nextStage })) assert(source.match(new RegExp(`^${key}: (.+)$`, "m"))?.[1]?.trim() === String(value), `Ledger summary/state mismatch: ${key}`);
  return state;
}

export function renderLedger(state) {
  const pending = state.records.filter((record) => record.type === "question" && (!decisionFor(state, record.id) || decisionFor(state, record.id).disposition === "deferred"));
  return `---\nartifact: reverse-engineering\nonboarding_schema: 1\nstatus: ${state.status}\nawaiting_user: ${state.awaitingUser}\ncurrent_stage: ${state.currentStage}\nnext_stage: ${state.nextStage}\n---\n\n# Reverse-engineering ledger\n\nThe JSON block is the authoritative resumable state. Edit it through checkpoints; records are append-only. Registration is not readiness.\n\n## Progress\n\nSession ${state.session}; ${state.status}; next: ${state.nextStage}.\n\n## Coverage\n\n${state.coverage.map((entry) => `- ${entry.area}: ${entry.status}. ${entry.summary}`).join("\n") || "Not yet surveyed."}\n\n## Outputs\n\n${state.outputs.map((output) => `- ${output.kind}: \`${output.target}\`; ${output.readiness}; ${output.publishedDigest ? "published" : "not published"}.`).join("\n")}\n\n## Unresolved questions\n\n${pending.map((record) => `- ${record.id}: ${record.text}`).join("\n") || "No unanswered questions recorded."}\n\n## Durable state\n\n<!-- ${marker} -->\n\x60\x60\x60json\n${JSON.stringify(state, null, 2)}\n\x60\x60\x60\n`;
}

function evidencePath(root, relative) {
  safePath(root, relative);
  assert(!sensitivePath(relative), `Sensitive evidence path excluded: ${relative}`);
  assert(relative !== ledgerPath && !relative.startsWith(`${supportPath}/`), "Generated onboarding state is not implementation evidence");
}

export function sourceDigest(root, source, selfTarget = null) {
  evidencePath(root, source.path);
  if (source.role === "context" && source.path === selfTarget) return source.digest; // retained prior version, not evidence from generated prose
  if (!source.revision) return fileDigest(root, source.path);
  assert(/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(source.revision), "Historical evidence requires a full commit ID");
  try {
    return digest(execFileSync("git", ["cat-file", "blob", `${source.revision}:${source.path}`], { cwd: root, maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }));
  } catch { return null; }
}

export function decisionFor(state, id) {
  let decision = state.records.findLast((record) => record.type === "decision" && record.resolves?.includes(id)) ?? null;
  const seen = new Set([id]);
  let successor;
  while (decision) {
    assert(!seen.has(decision.id), "Cyclic decision resolution");
    seen.add(decision.id);
    successor = state.records.findLast((record) => record.type === "decision" && record.resolves?.includes(decision.id));
    if (!successor) break;
    decision = successor;
  }
  return decision;
}

export function isActiveDecision(state, record) {
  return record?.type === "decision" && record.disposition === "accepted" && !decisionFor(state, record.id)
    && (record.resolves ?? []).every((id) => decisionFor(state, id)?.id === record.id);
}

export function isHistoricalEvidence(state, record) {
  const decision = decisionFor(state, record.id);
  return decision?.scope === "evidence-reconciliation" && isActiveDecision(state, decision);
}

export function validateState(state, root) {
  assert(state?.schema === 1, "Unsupported onboarding schema");
  assert(Number.isInteger(state.session) && state.session > 0, "Invalid session number");
  assert(statuses.includes(state.status), "Invalid onboarding status");
  assert(typeof state.awaitingUser === "boolean", "Invalid awaiting-user state");
  assert(stages.includes(state.currentStage) && stages.includes(state.nextStage), "Invalid onboarding stage");
  assert(state.status === "active" ? state.nextStage !== "none" : !state.awaitingUser && state.nextStage === "none" && state.currentStage === "none", "Invalid onboarding transition");
  assert(Array.isArray(state.scope) && Array.isArray(state.coverage) && Array.isArray(state.records) && Array.isArray(state.outputs) && Array.isArray(state.events), "Malformed onboarding collections");
  for (const prefix of state.scope) safePath(root, prefix);
  assert(state.baseline && typeof state.baseline.files === "object" && !Array.isArray(state.baseline.files), "Missing source baseline");
  for (const [file, hash] of Object.entries(state.baseline.files)) {
    evidencePath(root, file);
    assert(hash === null || hashPattern.test(hash), `Invalid baseline digest: ${file}`);
  }
  const ids = new Set();
  let highest = 0;
  for (const record of state.records) {
    assert(recordPattern.test(record.id) && !ids.has(record.id), "Invalid or duplicate onboarding record ID");
    assert(Number(record.id.slice(3)) > highest, "Onboarding IDs must increase monotonically");
    highest = Number(record.id.slice(3));
    assert(["fact", "inference", "unknown", "question", "decision", "conflict", "baseline"].includes(record.type), `Invalid record type: ${record.id}`);
    assert(typeof record.text === "string" && record.text.trim(), `Missing claim: ${record.id}`);
    assert(Array.isArray(record.sources) && Array.isArray(record.dependsOn) && Array.isArray(record.targets), `Missing record links: ${record.id}`);
    assert(typeof record.blocking === "boolean", `Missing consequence classification: ${record.id}`);
    for (const target of record.targets) safePath(root, target);
    for (const dependency of record.dependsOn) assert(ids.has(dependency), `Record dependency must precede ${record.id}: ${dependency}`);
    for (const source of record.sources) {
      evidencePath(root, source.path);
      assert(hashPattern.test(source.digest) && typeof source.locator === "string" && source.locator.trim(), `Incomplete evidence citation: ${record.id}`);
      if (source.revision) assert(/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(source.revision), "Invalid historical revision");
    }
    if (record.type === "fact") assert(record.sources.length > 0, `Verified fact needs a source: ${record.id}`);
    if (record.type === "inference") assert(record.sources.length > 0 && record.rationale?.trim() && record.alternatives?.trim() && ["low", "medium", "high"].includes(record.confidence), `Inference needs basis, alternatives, and confidence: ${record.id}`);
    if (record.type === "decision") {
      assert(record.by?.trim() && !Number.isNaN(Date.parse(record.at)) && ["accepted", "deferred", "rejected"].includes(record.disposition), `Unattributed decision: ${record.id}`);
      assert(Array.isArray(record.resolves) && record.resolves.every((id) => ids.has(id)), `Invalid decision resolution: ${record.id}`);
      if (record.scope === "evidence-reconciliation") {
        assert(record.resolves.length > 0 && record.resolves.every((id) => ["fact", "inference", "unknown", "baseline"].includes(state.records.find((entry) => entry.id === id)?.type)), "Evidence reconciliation cannot override user decisions or silently resolve questions");
        assert(Array.isArray(record.replacements) && record.replacements.length > 0 && record.replacements.every((id) => ids.has(id) && record.dependsOn.includes(id) && !record.resolves.includes(id) && ["fact", "inference", "unknown", "baseline"].includes(state.records.find((entry) => entry.id === id)?.type)), "Evidence reconciliation needs preceding replacement observations and dependency links");
      }
    }
    if (record.implementation !== undefined) assert(["implemented", "partial", "planned", "disabled", "undetermined"].includes(record.implementation), `Invalid implementation state: ${record.id}`);
    if (record.verification !== undefined) assert(["source-inspected", "tests-present", "tests-passed", "tests-failed", "runtime-evidenced", "unverified"].includes(record.verification), `Invalid verification state: ${record.id}`);
    if (record.commitment !== undefined) assert(["unconfirmed", "approved", "deferred", "rejected"].includes(record.commitment), `Invalid commitment: ${record.id}`);
    if (["tests-passed", "tests-failed", "runtime-evidenced"].includes(record.verification)) assert(record.execution?.command && record.execution?.environment && record.execution?.result && record.execution?.approval, `Execution evidence is incomplete: ${record.id}`);
    ids.add(record.id);
  }
  const targets = new Set();
  for (const output of state.outputs) {
    assert(Object.hasOwn(bootstrapDocuments, output.kind) || output.kind === "detail", "Invalid output kind");
    safePath(root, output.target);
    assert(output.target.endsWith(".md") && !/^(?:\.github|\.agents|\.claude|\.codex|\.opencode|\.windsurf|scripts|templates)\//.test(output.target) && !["AGENTS.md", "CLAUDE.md", "project-instructions.md"].includes(output.target), "Bootstrap output cannot overwrite code, framework assets, or governance");
    assert(output.target !== configPath && output.target !== ledgerPath && !output.target.startsWith(`${supportPath}/`), "Canonical target overlaps onboarding support files");
    if (output.kind === "detail") assert(/^specs\/plan\/E\d{3}\.md$/.test(output.target), "Invalid epic detail path");
    assert(!targets.has(output.target), "Duplicate output target");
    targets.add(output.target);
    if (output.candidate !== null) {
      safePath(root, output.candidate);
      assert(output.candidate.startsWith(`${supportPath}/candidates/`) && output.candidate.endsWith(".md"), "Candidate must remain in the noncanonical candidate directory");
    }
    assert(["candidate", "reference", "planning-ready", "blocked"].includes(output.readiness), "Invalid output readiness");
    assert(["draft", "planning-ready", "reference"].includes(output.profile), "Invalid output profile");
    assert(Array.isArray(output.claims) && output.claims.every((id) => ids.has(id)), "Unresolved output claim reference");
    assert(Array.isArray(output.sections), "Missing section-to-evidence mapping");
    for (const section of output.sections) {
      assert(section.heading?.trim() && Array.isArray(section.records) && section.records.length > 0, "Missing section evidence");
      for (const id of section.records) assert(output.claims.includes(id), `Section claim not in output: ${id}`);
      assert(["fact", "inference", "unknown", "attestation", "mixed"].includes(section.treatment), "Invalid section certainty");
      if (section.treatment === "fact") assert(section.records.every((id) => { const record = state.records.find((entry) => entry.id === id); return record?.type === "fact" && !isHistoricalEvidence(state, record); }), "An inference, historical observation, or attestation cannot be upgraded to verified fact");
    }
    assert(output.publishedDigest === null || hashPattern.test(output.publishedDigest), "Invalid published digest");
    assert(output.publishedDigest === null ? output.publishedEvidence === null : hashPattern.test(output.publishedEvidence), "Invalid published evidence fingerprint");
    if (output.publishedDigest) {
      assert(output.publishedContext && Array.isArray(output.publishedContext.records) && output.publishedContext.records.every((id) => ids.has(id)) && Array.isArray(output.publishedContext.dependencies) && Array.isArray(output.publishedContext.coverage) && Array.isArray(output.publishedContext.sections), "Missing published evidence context");
      for (const dependency of output.publishedContext.dependencies) safePath(root, dependency);
    }
    assert(Array.isArray(output.dependencies), "Missing output dependencies");
    for (const dependency of output.dependencies) safePath(root, dependency);
    if (output.approval) {
      const decision = state.records.find((record) => record.id === output.approval.decision);
      assert(isActiveDecision(state, decision) && decision.scope === "publication" && decision.targets.includes(output.target), "Publication requires an explicit, target-scoped publication decision");
      assert(state.records.findLast((record) => record.type === "decision" && record.scope === "publication" && record.targets.includes(output.target))?.id === decision.id, "A newer publication decision supersedes this target's prior consent");
      assert(hashPattern.test(output.approval.candidateDigest) && hashPattern.test(output.approval.evidenceDigest), "Publication approval must bind candidate and evidence digests");
      assert((output.approval.targetDigest === null || hashPattern.test(output.approval.targetDigest)) && (output.approval.configDigest === null || hashPattern.test(output.approval.configDigest)), "Approval must bind live target and config bytes");
      const review = decision.review?.[output.target];
      assert(review?.profile === output.profile && ["candidateDigest", "evidenceDigest", "targetDigest", "configDigest"].every((key) => review[key] === output.approval[key]), "Approval bindings differ from the immutable publication decision; obtain fresh consent");
    }
  }
  for (const kind of Object.keys(bootstrapDocuments)) assert(state.outputs.filter((output) => output.kind === kind).length === 1, `Expected exactly one ${kind} output`);
  for (const record of state.records) for (const source of record.sources) assert(!targets.has(source.path) || source.role === "context", "Canonical outputs cannot serve as implementation evidence; cite preserved documents as context instead");
  for (const entry of state.coverage) {
    assert(entry.area?.trim() && entry.summary?.trim() && ["inspected", "deferred", "excluded", "inaccessible"].includes(entry.status), "Invalid coverage entry");
    assert(Array.isArray(entry.prefixes) && Array.isArray(entry.targets), "Coverage needs scoped prefixes and affected targets");
    for (const file of [...entry.prefixes, ...entry.targets]) safePath(root, file);
  }
  if (state.awaitingUser) assert(state.records.some((record) => record.type === "question" && !decisionFor(state, record.id)), "Waiting requires an unanswered question");
  if (state.status === "completed") assert(!state.records.some((record) => record.type === "question" && !decisionFor(state, record.id)), "Unanswered questions cannot be marked completed");
  return state;
}

export function readState(root) {
  const source = readOptional(root, ledgerPath);
  return source === null ? null : validateState(parseLedger(source), root);
}

export function atomicWrite(root, relative, bytes, mode) {
  const target = safePath(root, relative);
  const permissions = mode ?? (existsSync(target) ? lstatSync(target).mode & 0o777 : 0o644);
  mkdirSync(path.dirname(target), { recursive: true });
  safePath(root, relative);
  const temporary = `${relative}.${randomUUID()}.tmp`;
  try {
    const descriptor = openSync(safePath(root, temporary), "wx", permissions);
    try { writeFileSync(descriptor, bytes); fsyncSync(descriptor); } finally { closeSync(descriptor); }
    renameSync(safePath(root, temporary), target);
    let directory;
    try { directory = openSync(path.dirname(target), "r"); fsyncSync(directory); }
    catch (error) { if (!["EINVAL", "ENOTSUP", "EPERM", "EISDIR"].includes(error.code)) throw error; }
    finally { if (directory !== undefined) closeSync(directory); }
  }
  finally { if (existsSync(safePath(root, temporary))) unlinkSync(safePath(root, temporary)); }
}

function withLock(root, operation) {
  mkdirSync(safePath(root, recoveryPath), { recursive: true, mode: 0o700 });
  const lock = safePath(root, `${recoveryPath}/writer.lock`);
  let descriptor;
  try { descriptor = openSync(lock, "wx", 0o600); }
  catch { throw new Error("Onboarding writer lock exists. Verify no writer is running before removing only specs/reverse-engineering/.recovery/writer.lock."); }
  try {
    const ignore = `${supportPath}/.gitignore`;
    const before = readOptional(root, ignore) ?? "";
    if (!before.split(/\r?\n/).includes("/.recovery/")) appendFileSync(safePath(root, ignore), `${before && !before.endsWith("\n") ? "\n" : ""}/.recovery/\n`);
    return operation();
  }
  finally { closeSync(descriptor); unlinkSync(lock); }
}

export function initialize(root) {
  assert(readOptional(root, ledgerPath) === null, "Onboarding already exists; use --resume or --status");
  assert(readOptional(root, journalPath) === null, "Existing recovery history without a ledger; repair the ledger instead of restarting");
  const targets = resolveBootstrap(root, { allowBroken: true });
  const configDigest = fileDigest(root, configPath);
  assert(new Set(Object.values(targets)).size === 4, "Canonical document targets overlap");
  const state = { schema: 1, session: 1, status: "active", awaitingUser: false, currentStage: "survey", nextStage: "survey", scope: [], baseline: { head: null, files: {}, inventory: [] }, coverage: [], records: [], outputs: Object.entries(targets).map(([kind, target]) => ({ kind, target, candidate: null, profile: kind === "dod" ? "reference" : "draft", readiness: "candidate", claims: [], sections: [], dependencies: [], approval: null, publishedDigest: null, publishedEvidence: null })), events: [{ at: now(), event: "started" }] };
  const config = readOptional(root, configPath);
  for (const output of state.outputs) if (registration(config, bootstrapDocuments[output.kind].heading) && readOptional(root, output.target) === null) {
    output.readiness = "blocked";
    state.records.push({ id: `RE-${String(state.records.length + 1).padStart(3, "0")}`, type: "question", text: `Broken ${output.kind} registration: ${output.target}. Repair the path or explicitly choose its replacement before publication.`, sources: [], dependsOn: [], targets: [output.target], blocking: true });
  }
  validateState(state, root);
  return withLock(root, () => {
    assert(readOptional(root, ledgerPath) === null && fileDigest(root, configPath) === configDigest, "Onboarding or config changed during initialization");
    assert(!pendingTransaction(root), "Recover an existing publication before initializing");
    atomicWrite(root, ledgerPath, renderLedger(state));
    return state;
  });
}

export function checkpoint(root, next, expectedDigest) {
  return withLock(root, () => {
    const before = readState(root);
    assert(before, "No onboarding run; start first");
    assert(fileDigest(root, ledgerPath) === expectedDigest, "Ledger changed; reload before checkpointing");
    assert(!pendingTransaction(root), "Recover pending publication before checkpointing");
    validateState(next, root);
    assert(before.records.every((record, index) => canonicalJson(next.records[index]) === canonicalJson(record)), "Onboarding records are append-only");
    assert(before.events.every((event, index) => canonicalJson(next.events[index]) === canonicalJson(event)), "Session events are append-only");
    assert(next.session === before.session || next.session === before.session + 1 && before.status !== "active", "Invalid session restart");
    if (before.status !== "active" && next.status !== before.status) assert(next.status === "active" && next.session === before.session + 1 && next.records.some((record) => !before.records.some((entry) => entry.id === record.id) && record.type === "decision" && record.scope === "new-session" && record.disposition === "accepted"), "Reopening requires an explicit new-session decision");
    if (next.status === "abandoned" && before.status !== "abandoned") assert(next.records.some((record) => !before.records.some((entry) => entry.id === record.id) && record.type === "decision" && record.scope === "abandonment" && record.disposition === "accepted"), "Abandonment requires an explicit user decision");
    for (const old of before.outputs) {
      const output = next.outputs.find((item) => old.kind === "detail" ? item.target === old.target : item.kind === old.kind);
      assert(output && output.kind === old.kind, "Checkpoint cannot remove targets");
      if (output.target !== old.target) {
        const decision = next.records.findLast((record) => isActiveDecision(next, record) && record.scope === "canonical-target" && record.from === old.target && record.to === output.target && record.targets.includes(old.target) && record.targets.includes(output.target));
        assert(decision && output.publishedDigest === null && output.publishedEvidence === null && output.approval === null, "Retargeting needs an explicit canonical-target decision and a fresh unpublished candidate");
        if (!output.dependencies.includes(old.target)) output.dependencies.push(old.target);
        delete output.validation;
        next.events.push({ at: now(), event: "retargeted", kind: old.kind, from: old.target, to: output.target, decision: decision.id, previousPublication: old.publishedDigest, priorDigest: fileDigest(root, old.target) });
      } else assert(output.publishedDigest === old.publishedDigest && output.publishedEvidence === old.publishedEvidence && canonicalJson(output.validation) === canonicalJson(old.validation) && canonicalJson(output.publishedContext) === canonicalJson(old.publishedContext), "Checkpoint cannot forge publication state");
    }
    assert(next.outputs.filter((output) => output.kind !== "detail").length === 4, "Checkpoint cannot add canonical targets");
    next.events.push({ at: now(), event: "checkpoint", stage: next.nextStage });
    atomicWrite(root, ledgerPath, renderLedger(next));
    return next;
  });
}

function closure(state, output, includeTargets = true) {
  const ids = new Set([...output.claims, ...(includeTargets ? state.records.filter((record) => record.targets.includes(output.target) && record.scope !== "publication").map((record) => record.id) : [])]);
  let changed = true;
  while (changed) {
    const before = ids.size;
    for (const record of state.records) if (ids.has(record.id) && record.scope !== "publication") {
      for (const id of record.dependsOn) ids.add(id);
      const decision = decisionFor(state, record.id);
      if (decision) ids.add(decision.id);
    }
    changed = before !== ids.size;
  }
  return state.records.filter((record) => ids.has(record.id) && record.scope !== "publication");
}

export function evidenceFingerprint(root, state, output, projection = {}, includeTargets = true) {
  const records = closure(state, output, includeTargets);
  const projectedDigest = (file) => Object.hasOwn(projection, file) ? digest(projection[file]) : fileDigest(root, file);
  const sources = records.flatMap((record) => record.sources.map((source) => {
    let currentDigest = source.digest;
    if (!isHistoricalEvidence(state, record)) {
      const projected = !source.revision && !(source.role === "context" && source.path === output.target) && Object.hasOwn(projection, source.path);
      currentDigest = projected ? projectedDigest(source.path) : sourceDigest(root, source, output.target);
    }
    return { ...source, currentDigest };
  }));
  const dependencies = output.dependencies.map((file) => [file, projectedDigest(file)]);
  const coverage = state.coverage.filter((entry) => entry.targets.includes(output.target)).map((entry) => ({
    ...entry,
    files: inventory(root, entry.prefixes).filter((file) => !state.outputs.some((item) => item.target === file) && file !== configPath),
  }));
  return digest(canonicalJson({ records, sources, dependencies, coverage, sections: output.sections }));
}

function publishedFingerprint(root, state, output) {
  const context = output.publishedContext;
  return evidenceFingerprint(root, { ...state, coverage: context.coverage }, { ...output, claims: context.records, dependencies: context.dependencies, sections: context.sections }, {}, false);
}

export function pendingTransaction(root) {
  const source = readOptional(root, journalPath);
  if (source === null) return null;
  const journal = JSON.parse(source);
  assert(journal.schema === 1 && ["prepared", "committed", "rolled-back"].includes(journal.status) && Array.isArray(journal.entries) && journal.entries.length && journal.entries.every((entry) => entry && typeof entry.path === "string" && typeof entry.after === "string") && new Set(journal.entries.map((entry) => entry.path)).size === journal.entries.length, "Malformed publication journal");
  return journal.status === "prepared" ? journal : null;
}

export function onboardingStatus(root) {
  const state = readState(root);
  if (!state) return { exists: false, valid: true, outputs: [] };
  const transaction = pendingTransaction(root);
  const changedSources = Object.entries(state.baseline.files).filter(([file, hash]) => fileDigest(root, file) !== hash).map(([file]) => file);
  const outputs = state.outputs.map((output) => {
    const canonicalDigest = fileDigest(root, output.target);
    const evidenceDigest = evidenceFingerprint(root, state, output);
    const stale = Boolean(output.publishedDigest && (canonicalDigest !== output.publishedDigest || publishedFingerprint(root, state, output) !== output.publishedEvidence));
    const candidateDigest = output.candidate ? fileDigest(root, output.candidate) : null;
    let readiness = output.readiness === "blocked" ? "blocked" : "candidate";
    if (output.publishedDigest) readiness = output.validation?.profile === "planning-ready" ? "planning-ready" : "reference";
    if (stale) readiness = "blocked";
    let confirmation = "awaiting";
    if (output.publishedDigest && !stale && (!output.candidate || candidateDigest === output.publishedDigest)) confirmation = "published";
    else if (output.approval) confirmation = candidateDigest === output.approval.candidateDigest && evidenceDigest === output.approval.evidenceDigest && canonicalDigest === output.approval.targetDigest && fileDigest(root, configPath) === output.approval.configDigest ? "confirmed" : "stale";
    return { kind: output.kind, target: output.target, readiness, declaredReadiness: output.readiness, canonicalExists: canonicalDigest !== null, published: Boolean(output.publishedDigest), stale, confirmation, validation: output.validation ?? { candidate: "not-recorded", live: "not-recorded" }, candidateDigest, evidenceDigest };
  });
  return {
    exists: true, valid: true, ledgerDigest: fileDigest(root, ledgerPath), status: state.status,
    currentStage: state.currentStage, nextStage: state.nextStage, awaitingUser: state.awaitingUser,
    changedSources, transaction: Boolean(transaction), coverage: state.coverage,
    questions: state.records.filter((record) => record.type === "question" && !decisionFor(state, record.id)),
    deferredQuestions: state.records.filter((record) => record.type === "question" && decisionFor(state, record.id)?.disposition === "deferred"),
    outputs,
  };
}

export function onboardingGate(root, targets, { writing = false } = {}) {
  const state = readState(root);
  if (!state) return { valid: true, errors: [] };
  const errors = [];
  const transaction = pendingTransaction(root);
  if (transaction && transaction.entries.some((entry) => targets.includes(entry.path))) errors.push("Interrupted onboarding publication; run /sddp-reverseengineer --resume");
  for (const output of state.outputs.filter((output) => targets.includes(output.target))) {
    if (!writing && output.publishedDigest && (fileDigest(root, output.target) !== output.publishedDigest || publishedFingerprint(root, state, output) !== output.publishedEvidence)) errors.push(`Stale onboarding baseline for ${output.target}; run /sddp-reverseengineer --resume or reconcile through the owning bootstrap workflow`);
    if (!writing && output.publishedDigest && state.records.some((record) => record.type === "conflict" && record.blocking && record.targets.includes(output.target) && (!decisionFor(state, record.id) || decisionFor(state, record.id).disposition === "deferred"))) errors.push(`Unresolved canonical conflict: ${output.target}`);
  }
  return { valid: !errors.length, errors };
}

function confirmPublishable(root, state, output) {
  assert(output.candidate && output.approval, `Unconfirmed candidate: ${output.target}`);
  assert(output.readiness === (output.profile === "planning-ready" ? "planning-ready" : "reference"), `Unsupported readiness: ${output.target}`);
  assert(fileDigest(root, output.candidate) === output.approval.candidateDigest, `Candidate changed after approval: ${output.target}`);
  assert(fileDigest(root, output.target) === output.approval.targetDigest, `Live document changed after approval: ${output.target}`);
  assert(fileDigest(root, configPath) === output.approval.configDigest, "Config changed after approval; review registration delta again");
  assert(evidenceFingerprint(root, state, output) === output.approval.evidenceDigest, `Evidence changed after approval: ${output.target}`);
  const records = closure(state, output);
  for (const record of records) {
    if (isHistoricalEvidence(state, record)) continue;
    for (const source of record.sources) assert(sourceDigest(root, source, output.target) === source.digest, `Stale evidence ${record.id}: ${source.path}`);
    if (record.blocking && ["question", "conflict", "inference", "unknown"].includes(record.type)) {
      const decision = decisionFor(state, record.id);
      assert(decision && (output.profile !== "planning-ready" || decision.disposition === "accepted"), `Unresolved consequential claim: ${record.id}`);
    }
  }
  const candidate = readOptional(root, output.candidate);
  const headings = [...candidate.matchAll(/^## (.+)$/gm)].map((match) => match[1].trim());
  for (const heading of headings) assert(output.sections.some((section) => section.heading === heading), `Unmapped candidate section: ${heading}`);
  if (output.kind === "prd" || output.kind === "plan") {
    const discovery = readOptional(root, "specs/prd-discovery.md");
    if (discovery && /^status:\s*(?:active|ready-to-synthesize)\s*$/m.test(discovery)) throw new Error("Active PRD discovery owns product decisions; run /sddp-prd --resume");
  }
  return candidate;
}

function journalEntry(root, relative, after) {
  const before = readOptional(root, relative);
  return { path: relative, before, after, beforeDigest: before === null ? null : digest(before), afterDigest: digest(after) };
}

// validate() is injected by the runtime entry point to avoid validator import cycles.
export function publish(root, requested, expectedDigest, validate) {
  return withLock(root, () => {
    const state = readState(root);
    assert(state && fileDigest(root, ledgerPath) === expectedDigest, "Ledger changed before publication");
    assert(state.status === "active", "Reopen the completed or abandoned session explicitly before publication");
    assert(!pendingTransaction(root), "Recover interrupted publication first");
    assert(Array.isArray(requested) && requested.length && requested.length === new Set(requested).size, "Select a nonempty unique target set");
    const selected = requested.map((target) => {
      const output = state.outputs.find((entry) => entry.target === target);
      assert(output, `Unknown publication target: ${target}`);
      return output;
    });
    const resolved = resolveBootstrap(root, { allowBroken: true });
    for (const output of selected) if (output.kind !== "detail" && output.target !== resolved[output.kind]) assert(state.records.some((record) => isActiveDecision(state, record) && record.scope === "canonical-target" && record.from === resolved[output.kind] && record.to === output.target && record.targets.includes(output.target) && record.targets.includes(record.from)), "Canonical registration changed; reconcile before publication");
    const projection = Object.fromEntries(selected.map((output) => [output.target, confirmPublishable(root, state, output)]));
    for (const output of selected) for (const dependency of output.dependencies) {
      const dependencyOutput = state.outputs.find((entry) => entry.target === dependency);
      if (dependencyOutput) assert(projection[dependency] !== undefined || fileDigest(root, dependency) !== null && onboardingGate(root, [dependency]).valid, `Unpublished or stale dependency: ${dependency}`);
    }
    const previousConfig = readOptional(root, configPath);
    projection[configPath] = registerDocuments(previousConfig, selected.map((output) => [output.kind, output.target]));
    validate(state, selected, projection, false);
    for (const output of selected) confirmPublishable(root, state, output);
    const expectedEvidence = new Map(selected.map((output) => [output.target, evidenceFingerprint(root, state, output, projection)]));
    const next = structuredClone(state);
    for (const output of next.outputs.filter((entry) => requested.includes(entry.target))) {
      output.publishedDigest = digest(projection[output.target]);
      // Dependencies may themselves be part of this publication.
      output.publishedEvidence = null;
    }
    const entries = Object.entries(projection).map(([relative, after]) => journalEntry(root, relative, after));
    const journal = { schema: 1, status: "prepared", at: now(), targets: requested, entries };
    atomicWrite(root, journalPath, JSON.stringify(journal, null, 2), 0o600);
    try {
      for (const entry of entries) {
        assert(fileDigest(root, entry.path) === entry.beforeDigest, `Concurrent edit: ${entry.path}`);
        atomicWrite(root, entry.path, entry.after);
      }
      validate(state, selected, {}, true);
      for (const entry of entries) assert(fileDigest(root, entry.path) === entry.afterDigest, `Concurrent edit after live validation: ${entry.path}`);
      for (const output of next.outputs.filter((entry) => requested.includes(entry.target))) {
        assert(evidenceFingerprint(root, next, output) === expectedEvidence.get(output.target), `Evidence changed during publication: ${output.target}`);
        output.publishedEvidence = expectedEvidence.get(output.target);
        output.publishedContext = { records: closure(state, output).map((record) => record.id), dependencies: structuredClone(output.dependencies), coverage: structuredClone(state.coverage.filter((entry) => entry.targets.includes(output.target))), sections: structuredClone(output.sections) };
        output.validation = { candidate: "PASS", live: "PASS", profile: output.profile, at: now(), digest: output.publishedDigest };
      }
      next.events.push({ at: now(), event: "published", targets: requested });
      const ledgerEntry = journalEntry(root, ledgerPath, renderLedger(next));
      journal.entries.push(ledgerEntry);
      atomicWrite(root, journalPath, JSON.stringify(journal, null, 2), 0o600);
      assert(fileDigest(root, ledgerPath) === expectedDigest, "Concurrent ledger edit");
      atomicWrite(root, ledgerPath, ledgerEntry.after);
      journal.status = "committed";
      atomicWrite(root, journalPath, JSON.stringify(journal, null, 2), 0o600);
      return { valid: true, published: requested };
    } catch (error) {
      // Recovery refuses to overwrite anything not equal to our before/after bytes.
      try { recoverUnlocked(root); } catch (recoveryError) { throw new Error(`${error.message}; ${recoveryError.message}`); }
      throw error;
    }
  });
}

function recoverUnlocked(root) {
  const journal = pendingTransaction(root);
  if (!journal) return { valid: true, recovered: false };
  const state = readState(root);
  const allowed = new Set([ledgerPath, configPath, ...state.outputs.map((output) => output.target)]);
  for (const entry of journal.entries) {
    assert(allowed.has(entry.path) && (entry.before === null || typeof entry.before === "string") && typeof entry.after === "string", "Unsafe recovery journal entry");
    assert(entry.beforeDigest === (entry.before === null ? null : digest(entry.before)) && entry.afterDigest === digest(entry.after), "Corrupt recovery bytes");
    const current = fileDigest(root, entry.path);
    assert(current === entry.beforeDigest || current === entry.afterDigest, `Recovery blocked by user edit: ${entry.path}. Reconcile manually; no files were restored.`);
  }
  for (const entry of [...journal.entries].reverse()) {
    if (fileDigest(root, entry.path) === entry.beforeDigest) continue;
    if (entry.before === null) unlinkSync(safePath(root, entry.path));
    else atomicWrite(root, entry.path, entry.before);
  }
  journal.status = "rolled-back";
  atomicWrite(root, journalPath, JSON.stringify(journal, null, 2), 0o600);
  return { valid: true, recovered: true, next: "/sddp-reverseengineer --resume" };
}

export function recover(root) { return withLock(root, () => recoverUnlocked(root)); }

// Called by delivery after fresh QC, never by reverse-engineering. Preserve source
// fingerprints: a genuine completion is not permission to bless changed evidence.
export function recordEpicCompletion(root, planPath, featureDir, epicId, verifyQc) {
  const initial = readState(root);
  if (!initial?.outputs.some((output) => output.kind === "plan" && output.target === planPath && output.publishedDigest)) return { valid: true, applicable: false };
  assert(/^E\d{3}$/.test(epicId), "Invalid epic ID");
  safePath(root, featureDir);
  return withLock(root, () => {
    const state = readState(root);
    assert(!pendingTransaction(root), "Recover onboarding publication first");
    const output = state.outputs.find((entry) => entry.kind === "plan" && entry.target === planPath);
    assert(fileDigest(root, planPath) === output.publishedDigest, "Plan changed outside approved delivery; reconcile before completion");
    const proof = verifyQc();
    assert(proof.QC_COMPLETE === true && proof.COMPLETION_ISSUES.length === 0, "Current QC evidence does not permit epic completion");
    const before = readOptional(root, planPath);
    const expression = new RegExp(`^- \\[ \\] ${epicId} `, "m");
    if (!expression.test(before)) return { valid: true, applicable: true, changed: false };
    const after = before.replace(expression, `- [X] ${epicId} `);
    output.publishedDigest = digest(after);
    output.candidate = null; output.approval = null;
    output.validation = { ...output.validation, digest: output.publishedDigest, at: now() };
    state.events.push({ at: now(), event: "epic-completed", epic: epicId, featureDir, plan: planPath, qcReportDigest: fileDigest(root, `${featureDir}/qc-report.md`), qcMarkerDigest: fileDigest(root, `${featureDir}/.qc-passed`) });
    const journal = { schema: 1, status: "prepared", at: now(), entries: [journalEntry(root, planPath, after), journalEntry(root, ledgerPath, renderLedger(state))] };
    atomicWrite(root, journalPath, JSON.stringify(journal, null, 2), 0o600);
    try {
      for (const entry of journal.entries) {
        assert(fileDigest(root, entry.path) === entry.beforeDigest, `Concurrent edit: ${entry.path}`);
        atomicWrite(root, entry.path, entry.after);
      }
      journal.status = "committed";
      atomicWrite(root, journalPath, JSON.stringify(journal, null, 2), 0o600);
    } catch (error) { recoverUnlocked(root); throw error; }
    return { valid: true, applicable: true, changed: true };
  });
}
