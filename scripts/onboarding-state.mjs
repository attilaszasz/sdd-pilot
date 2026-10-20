#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { configPath, detectRepositoryState, fileDigest, inventory, metadata, readOptional, resolveBootstrap, safePath, sensitivePath } from "./lib/bootstrap-documents.mjs";
import { checkpoint, initialize, isActiveDecision, onboardingGate, onboardingStatus, publish, readState, recover } from "./lib/onboarding.mjs";
import { validatePrd } from "./validate-prd.mjs";
import { validateSad } from "./validate-sad.mjs";
import { validateDod } from "./validate-dod.mjs";
import { parseEpics, validateProjectPlan } from "./validate-project-plan.mjs";

export function validatePublication(root, state, selected, projection, live) {
  const get = (file) => Object.hasOwn(projection, file) ? projection[file] : readOptional(root, file);
  const targets = Object.fromEntries(state.outputs.filter((output) => output.kind !== "detail").map((output) => [output.kind, output.target]));
  const config = get(configPath) ?? "";
  const previousSource = (output) => {
    const retarget = !output.publishedDigest && state.events.findLast((event) => event.event === "retargeted" && event.kind === output.kind && event.to === output.target);
    if (!retarget) return readOptional(root, output.target);
    if (fileDigest(root, retarget.from) !== retarget.priorDigest) throw new Error(`Prior canonical document changed during retargeting: ${retarget.from}`);
    const existingPlan = readOptional(root, targets.plan);
    if (["prd", "sad", "dod"].includes(output.kind) && existingPlan && metadata(existingPlan)[`${output.kind}_source`] === retarget.from && !Object.hasOwn(projection, targets.plan)) throw new Error("Canonical input relocation must update its consuming project plan in the same publication");
    return readOptional(root, retarget.from);
  };
  for (const output of selected) {
    const source = get(output.target);
    if (!live) {
      const previous = previousSource(output);
      for (const id of new Set(previous?.match(/\b(?:CAP-\d{3}|FLOW-\d{3}|DDR-\d+)\b/g) ?? [])) if (!source.includes(id)) throw new Error(`Protected bootstrap ID removed: ${id}; reconcile through the owning workflow`);
      if (output.kind === "plan") {
        const checked = new Set(parseEpics(previous ?? "").filter((epic) => epic.state === "X").map((epic) => epic.line));
        for (const epic of parseEpics(source).filter((entry) => entry.state === "X")) if (!checked.has(epic.line)) throw new Error(`Onboarding cannot manufacture completed epic: ${epic.id}`);
      }
      if (output.kind === "detail") {
        const id = output.target.match(/\/(E\d{3})\.md$/)?.[1];
        if (!parseEpics(get(targets.plan) ?? "").some((epic) => epic.id === id)) throw new Error(`Detail has no associated planned epic: ${id}`);
      }
    }
    let result;
    if (output.kind === "prd") result = validatePrd(source, { profile: output.profile, canonicalPath: output.target, configSource: config, ...(get("specs/prd-discovery.md") !== null ? { discoverySource: get("specs/prd-discovery.md") } : {}) });
    if (!live && output.kind === "prd" && result.valid) {
      const previous = previousSource(output);
      const existing = previous ? validatePrd(previous, { profile: metadata(previous).prd_maturity ?? "draft" }).capabilities : [];
      for (const capability of result.capabilities) if (!existing.some((entry) => entry.id === capability.id && ["capability", "priority", "outcome"].every((field) => entry[field] === capability[field]))) {
        const decided = state.records.some((record) => isActiveDecision(state, record) && record.scope === "product-scope" && record.targets.includes(output.target) && record.capabilities?.some((entry) => entry.name === capability.capability && entry.priority === capability.priority && entry.outcome === capability.outcome));
        if (!decided) throw new Error(`Capability scope/outcome/priority is not explicitly decided: ${capability.id}`);
      }
    }
    if (output.kind === "sad") {
      result = validateSad(source, { profile: output.profile, canonicalPath: output.target, configSource: config });
      for (const row of source.matchAll(/^\| (ADR-\d{4}) \|[^\n]*?\| (proposed|accepted|deprecated|superseded) \|[^\n]*?\[[^\]]+\]\(([^)]+)\)/gm)) {
        const file = path.posix.normalize(path.posix.join(path.posix.dirname(output.target), row[3]));
        if (!/^specs\/adrs\/\d{4}-[a-z0-9-]+\.md$/.test(file)) throw new Error(`Unsafe ADR link: ${file}`);
        const adr = get(file);
        if (adr === null || metadata(adr).adr_id !== row[1] || metadata(adr).status !== row[2]) throw new Error(`Missing or inconsistent standalone ADR: ${row[1]}. Use the architecture owner and ADR Author.`);
        if (!output.dependencies.includes(file)) throw new Error(`Untracked ADR dependency: ${file}`);
      }
    }
    if (output.kind === "dod") result = validateDod(source, { canonicalPath: output.target, configSource: config });
    if (output.kind === "plan") {
      for (const file of [targets.prd, targets.sad, ...(get(targets.dod) === null ? [] : [targets.dod])]) if (!output.dependencies.includes(file)) throw new Error(`Plan must track its canonical dependency: ${file}`);
      for (const epic of parseEpics(source).filter((entry) => entry.id)) if (!output.dependencies.includes(`specs/plan/${epic.id}.md`)) throw new Error(`Untracked epic detail dependency: ${epic.id}`);
      const details = Object.fromEntries(parseEpics(source).filter((epic) => epic.id).map((epic) => [epic.id, get(`specs/plan/${epic.id}.md`)]));
      result = validateProjectPlan(source, { canonicalPath: output.target, prdPath: targets.prd, sadPath: targets.sad, dodPath: targets.dod, prdSource: get(targets.prd), sadSource: get(targets.sad), dodSource: get(targets.dod), configSource: config, ledger: state, previousSource: live ? undefined : previousSource(output), details });
    }
    if (!live && ["plan", "detail"].includes(output.kind)) {
      const previous = readOptional(root, targets.plan);
      if (output.kind === "detail" && previous && parseEpics(previous).some((epic) => epic.state === "X" && output.target === `specs/plan/${epic.id}.md`) && source !== readOptional(root, output.target)) throw new Error(`Completed epic detail is immutable: ${output.target}`);
    }
    if (output.kind === "detail") result = { valid: Boolean(source?.startsWith("# Epic Details: E")), errors: ["Invalid epic detail"] };
    if (!result?.valid) throw new Error(`${output.target}: ${JSON.stringify(result?.errors ?? ["No validator"])}; ${live ? "live" : "candidate"} validation failed`);
    // Existing product decisions used by planned/completed work cannot be silently redefined.
    if (!live && output.kind === "prd") {
      const previous = previousSource(output);
      const plan = get(targets.plan);
      if (previous && plan) {
        const old = validatePrd(previous, { profile: metadata(previous).prd_maturity ?? "draft" });
        const next = validatePrd(source, { profile: output.profile });
        for (const capability of old.capabilities) {
          const replacement = next.capabilities.find((entry) => entry.id === capability.id);
          if (plan.includes(capability.id) && (!replacement || ["capability", "priority", "outcome"].some((field) => replacement[field] !== capability[field]))) throw new Error(`Referenced capability ${capability.id} changed; use /sddp-amend`);
        }
      }
    }
  }
}

function localGit(root, args) {
  try { return execFileSync("git", ["-c", "core.fsmonitor=false", ...args], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return null; }
}

export function survey(root, prefixes = []) {
  const files = inventory(root, prefixes);
  const targets = resolveBootstrap(root, { allowBroken: true });
  const sources = files.filter((file) => !Object.values(targets).includes(file) && file !== configPath);
  return { valid: true, targets, repository: detectRepositoryState(root), baseline: { head: localGit(root, ["rev-parse", "HEAD"]), shallow: localGit(root, ["rev-parse", "--is-shallow-repository"]), dirty: localGit(root, ["status", "--porcelain", "--untracked-files=normal"]), files: {}, inventory: sources }, files: sources };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [action, ...args] = process.argv.slice(2);
    const root = process.cwd();
    let result;
    if (action === "init" && !args.length) result = initialize(root);
    else if (action === "survey") result = survey(root, args);
    else if (action === "snapshot" && args.length) result = { valid: true, sources: args.map((file) => { safePath(root, file); if (sensitivePath(file)) throw new Error(`Sensitive path excluded: ${file}`); return { path: file, digest: fileDigest(root, file), locator: "Specify symbol or line range" }; }) };
    else if (action === "status" && !args.length) result = onboardingStatus(root);
    else if (action === "check" && !args.length) result = { valid: true, exists: Boolean(readState(root)) };
    else if (action === "checkpoint" && args.length === 3 && args[1] === "--expected") result = checkpoint(root, JSON.parse(readOptional(root, args[0])), args[2]);
    else if (action === "publish" && args.length >= 3 && args[0] === "--expected") result = publish(root, args.slice(2), args[1], (state, selected, projection, live) => validatePublication(root, state, selected, projection, live));
    else if (action === "recover" && !args.length) result = recover(root);
    else if (action === "gate" && args.length) result = onboardingGate(root, args.filter((value) => value !== "--write"), { writing: args.includes("--write") });
    else if (action === "layout" && !args.length) result = { valid: true, ...detectRepositoryState(root) };
    else throw new Error("Usage: node scripts/onboarding-state.mjs init|survey [prefixes]|snapshot <paths>|status|check|checkpoint <state.json> --expected <ledger-digest>|publish --expected <ledger-digest> <targets>|recover|gate [--write] <targets>|layout");
    console.log(JSON.stringify(result, null, 2));
    if (result.valid === false) process.exitCode = 1;
  } catch (error) { console.log(JSON.stringify({ valid: false, errors: [error.message] })); process.exitCode = 1; }
}
