#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import path from "node:path";
import { jsonBlock, metadata, readOptional, registration } from "./lib/bootstrap-documents.mjs";
import { validatePrd, validatePrdPlanFreshness } from "./validate-prd.mjs";
import { validateSad } from "./validate-sad.mjs";
import { decisionFor, isActiveDecision, isHistoricalEvidence, onboardingGate, readState } from "./lib/onboarding.mjs";

const sections = ["Epic Checklist", "Dependency Diagram", "Execution Wave Summary", "Parallel Execution Guidance", "Coverage Validation", "Shared Artifact Surface", "Wave Transition Protocol"];
const epicPattern = /^- \[([ X])\] (E\d{3}) \[(P[123])\] \[(PRODUCT|TECHNICAL|OPERATIONAL)\] (\[P\] )?((?:\{[^}]+\})+) (.+?) \[→ Details\]\(([^)]+)\)$/;

export function parseEpics(source) {
  let wave = null;
  return source.split(/\r?\n/).flatMap((line) => {
    const heading = line.match(/^### Wave (\d+)\b/);
    if (heading) wave = Number(heading[1]);
    if (!/^- \[[^\]]*\] E\d+\b/.test(line)) return [];
    const match = line.match(epicPattern);
    return [match ? { line, state: match[1], id: match[2], priority: match[3], category: match[4], parallel: Boolean(match[5]), tags: match[6], title: match[7], detailLink: match[8], wave } : { line, invalid: true }];
  });
}

function sourceTags(tags) {
  return [...tags.matchAll(/\{(PRD|SAD|DOD):([^}]+)\}/g)].flatMap((match) => match[2].split(",").map((id) => `${match[1]}:${id.trim()}`));
}

export function validateProjectPlan(source, options = {}) {
  source = source.replace(/\r\n/g, "\n");
  const errors = [];
  const { prdSource, sadSource, dodSource, ledger, previousSource, details = {}, canonicalPath = "specs/project-plan.md", prdPath = "specs/prd.md", sadPath = "specs/sad.md" } = options;
  let frontmatter;
  try { frontmatter = metadata(source); } catch (error) { return { valid: false, errors: [error.message] }; }
  const prd = validatePrd(prdSource ?? "", { profile: "planning-ready", canonicalPath: prdPath, ...(options.configSource === undefined ? {} : { configSource: options.configSource }), ...(options.discoverySource === undefined ? {} : { discoverySource: options.discoverySource }) });
  const sad = validateSad(sadSource ?? "", { profile: "planning-ready", canonicalPath: sadPath, ...(options.configSource === undefined ? {} : { configSource: options.configSource }) });
  if (!prd.valid) errors.push(...prd.errors.map((error) => `PRD: ${error.message}`));
  if (!sad.valid) errors.push(...sad.errors.map((error) => `SAD: ${error.message}`));
  if (frontmatter.prd_source !== prdPath || frontmatter.sad_source !== sadPath) errors.push("Project-plan source paths do not match canonical inputs");
  if (dodSource && options.dodPath && frontmatter.dod_source !== options.dodPath) errors.push("Project-plan DOD source does not match the canonical input");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(frontmatter.created ?? "")) errors.push("Missing project-plan creation date");
  for (const field of ["created", "prd_source", "prd_capability_digest", "sad_source", "dod_source"]) if (!Object.hasOwn(frontmatter, field)) errors.push(`Missing project-plan metadata: ${field}`);
  const freshness = validatePrdPlanFreshness(prd, source);
  if (!freshness.valid) errors.push(...freshness.errors.map((error) => error.message));
  let position = -1;
  for (const section of sections) {
    const matches = [...source.matchAll(new RegExp(`^## ${section}$`, "gm"))];
    if (matches.length !== 1 || matches[0].index <= position) errors.push(`Missing, duplicate, or out-of-order section: ${section}`);
    position = matches[0]?.index ?? position;
  }
  const epics = parseEpics(source);
  if (epics.some((epic) => epic.invalid)) errors.push("Malformed epic checklist line");
  const validEpics = epics.filter((epic) => !epic.invalid);
  const epicIds = new Set(validEpics.map((epic) => epic.id));
  if (epicIds.size !== validEpics.length) errors.push("Duplicate epic IDs");
  const sources = new Set(prd.capabilities.map((capability) => `PRD:${capability.id}`));
  for (const row of sadSource?.matchAll(/^\| (ADR-\d{4}) \|[^\n]*?\| accepted \|/gm) ?? []) sources.add(`SAD:${row[1]}`);
  for (const row of dodSource?.matchAll(/^### (DDR-\d{3}):[^\n]*\n([\s\S]*?)(?=^### DDR-|^## |$(?![\s\S]))/gm) ?? []) if (/\*\*Status\*\*:\s*Accepted\b/.test(row[2])) sources.add(`DOD:${row[1]}`);
  const dependencies = new Map();
  for (const epic of validEpics) {
    if (!epic.wave || epic.wave < 1) errors.push(`Epic is missing a numbered wave: ${epic.id}`);
    if (epic.detailLink.includes("\\") || path.posix.isAbsolute(epic.detailLink) || path.posix.normalize(path.posix.join(path.posix.dirname(canonicalPath), epic.detailLink)) !== `specs/plan/${epic.id}.md`) errors.push(`Epic detail link does not resolve to specs/plan/${epic.id}.md`);
    if (epic.title.split(" — ")[0].trim().split(/\s+/).length > 5) errors.push(`Epic title exceeds five words: ${epic.id}`);
    const tags = sourceTags(epic.tags);
    if (!tags.length || tags.some((tag) => !sources.has(tag)) || epic.tags.replace(/\{(?:PRD|SAD|DOD):[^}]+\}/g, "")) errors.push(`Invalid source tag: ${epic.id}`);
    if (prd.capabilities.some((capability) => capability.priority === "P1" && tags.includes(`PRD:${capability.id}`)) && epic.priority !== "P1") errors.push(`P1 capability lowered in epic: ${epic.id}`);
    const detail = details[epic.id];
    if (typeof detail !== "string") errors.push(`Missing epic detail: ${epic.id}`);
    else {
      for (const heading of ["Problem Statement", "Scope", "Demo Plan", "Traceability & Dependencies", "Integration Points", "Acceptance Criteria", "Implementation Signals", "Assumptions & Risks", "Draft Success Criteria", "Specify Input", "Pipeline Hints", epic.category === "PRODUCT" ? "Draft User Scenarios" : "Draft Objectives"]) if (!detail.includes(`## ${heading}`)) errors.push(`Missing detail section ${heading}: ${epic.id}`);
      const field = detail.match(/^- \*\*Depends on\*\*:\s*([^\n]+)/m)?.[1];
      if (!field) errors.push(`Missing dependency declaration: ${epic.id}`);
      dependencies.set(epic.id, field?.match(/\bE\d{3}\b/g) ?? []);
    }
  }
  const visiting = new Set(); const visited = new Set();
  const visit = (id) => {
    if (visiting.has(id)) { errors.push(`Circular epic dependency: ${id}`); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of dependencies.get(id) ?? []) {
      const upstream = validEpics.find((epic) => epic.id === dependency);
      const consumer = validEpics.find((epic) => epic.id === id);
      if (!upstream) errors.push(`Unknown epic dependency: ${id} -> ${dependency}`);
      else {
        if (upstream.wave >= consumer.wave) errors.push(`Dependency must be in an earlier wave: ${id} -> ${dependency}`);
        if (upstream.priority > consumer.priority) errors.push(`Prerequisite priority too low: ${dependency}`);
        visit(dependency);
      }
    }
    visiting.delete(id); visited.add(id);
  };
  for (const id of epicIds) visit(id);
  if (previousSource) {
    for (const epic of parseEpics(previousSource).filter((entry) => entry.state === "X")) if (!source.split(/\r?\n/).includes(epic.line)) errors.push(`Completed epic changed: ${epic.id}`);
  }
  let baseline = null;
  try { baseline = jsonBlock(source, "sddp-baseline-coverage"); } catch (error) { errors.push(error.message); }
  if (baseline !== null) {
    if (baseline.schema !== 1 || !Array.isArray(baseline.items) || !Array.isArray(baseline.futureWork) || !Array.isArray(ledger?.records)) errors.push("Brownfield coverage requires schema 1 and its onboarding decision ledger");
    else {
      const accepted = (id, scope) => ledger.records.find((record) => record.id === id && isActiveDecision(ledger, record) && record.targets.includes(canonicalPath) && (!scope || record.scope === scope));
      const covered = new Set();
      for (const item of baseline.items) {
        if (!item || !Array.isArray(item.epics) || !Array.isArray(item.evidence)) { errors.push("Malformed baseline coverage item"); continue; }
        if (!sources.has(item.source) || covered.has(item.source)) errors.push(`Unknown or duplicate baseline source: ${item.source}`);
        covered.add(item.source);
        if (!["baseline", "partial", "epic", "excluded"].includes(item.disposition) || !item.scope?.trim() || !item.limitation?.trim() || !accepted(item.decision)) errors.push(`Unconfirmed coverage disposition: ${item.source}`);
        if (!Array.isArray(item.epics) || item.epics.some((id) => !epicIds.has(id))) errors.push(`Invalid coverage epic: ${item.source}`);
        if (["partial", "epic"].includes(item.disposition) && !item.epics?.length) errors.push(`Remaining work needs an epic: ${item.source}`);
        if (item.disposition === "baseline" && item.epics?.length) errors.push(`Imported baseline is not an epic: ${item.source}`);
        if (["baseline", "partial"].includes(item.disposition)) {
          if (!Array.isArray(item.evidence) || !item.evidence.length) errors.push(`Baseline needs evidence: ${item.source}`);
          for (const id of item.evidence ?? []) {
            const record = ledger.records.find((entry) => entry.id === id);
            if (!record || isHistoricalEvidence(ledger, record) || !["fact", "inference", "baseline"].includes(record.type) || !record.sources.some((source) => source.role !== "context") || !["implemented", "partial"].includes(record.implementation)) errors.push(`Unsupported implementation baseline: ${id}`);
            if (record?.type === "inference" && decisionFor(ledger, id)?.disposition !== "accepted") errors.push(`Unconfirmed inferred baseline: ${id}`);
          }
        }
        for (const id of item.epics ?? []) if (!sourceTags(validEpics.find((epic) => epic.id === id)?.tags ?? "").includes(item.source)) errors.push(`Coverage tag does not match epic: ${id}`);
      }
      for (const tag of sources) if (!covered.has(tag)) errors.push(`Uncovered canonical source: ${tag}`);
      for (const epic of validEpics.filter((entry) => entry.state === " ")) if (!baseline.futureWork.some((entry) => entry?.epic === epic.id && accepted(entry.decision, "future-work"))) errors.push(`Future work not explicitly approved: ${epic.id}`);
      if (baseline.futureWork.some((entry) => !epicIds.has(entry?.epic))) errors.push("Future-work approval references an absent epic");
      if (new Set(baseline.futureWork.map((entry) => entry?.epic)).size !== baseline.futureWork.length) errors.push("Duplicate future-work approval");
      if (!epics.length && !accepted(baseline.noFutureWork, "no-future-work")) errors.push("Zero-epic plan requires explicit no-future-work confirmation");
      if (validEpics.some((epic) => epic.state === " ") && baseline.noFutureWork) errors.push("Plan conflicts: pending epics and a no-future-work declaration");
    }
  } else {
    if (!epics.length) errors.push("Zero-epic plan requires imported baseline coverage");
    for (const capability of prd.capabilities) if (!validEpics.some((epic) => sourceTags(epic.tags).includes(`PRD:${capability.id}`))) errors.push(`Uncovered capability: ${capability.id}`);
  }
  if (options.configSource !== undefined && registration(options.configSource, "Project Plan") !== canonicalPath) errors.push("Project-plan registration mismatch");
  return { valid: !errors.length, errors, epics: validEpics.length, pendingEpics: validEpics.filter((epic) => epic.state === " ").length, importedBaseline: baseline !== null, noPlannedWork: !epics.length && baseline !== null, capabilityDigest: prd.capabilityDigest };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [file, ...args] = process.argv.slice(2);
    const options = {};
    for (let index = 0; index < args.length; index += 2) {
      if (!["--prd", "--sad", "--dod", "--config", "--previous", "--target", "--details-dir"].includes(args[index]) || !args[index + 1]) throw new Error("Invalid project-plan validator option");
      if (Object.hasOwn(options, args[index])) throw new Error("Duplicate project-plan validator option");
      options[args[index]] = args[index + 1];
    }
    if (!file || !options["--prd"] || !options["--sad"]) throw new Error("Usage: node scripts/validate-project-plan.mjs <plan> --prd path --sad path [--dod path] [--config path] [--previous path] [--target path]");
    const root = process.cwd();
    const source = readOptional(root, file);
    if (source === null) throw new Error("Missing project plan");
    const gate = onboardingGate(root, [file, options["--prd"], options["--sad"]]);
    if (!gate.valid) throw new Error(gate.errors.join("; "));
    const details = Object.fromEntries(parseEpics(source).filter((epic) => epic.id).map((epic) => [epic.id, readOptional(root, `${options["--details-dir"] ?? "specs/plan"}/${epic.id}.md`)]));
    const result = validateProjectPlan(source, { prdPath: options["--prd"], sadPath: options["--sad"], canonicalPath: options["--target"] ?? file, prdSource: readOptional(root, options["--prd"]), sadSource: readOptional(root, options["--sad"]), discoverySource: readOptional(root, "specs/prd-discovery.md") ?? undefined, ...(options["--dod"] ? { dodSource: readOptional(root, options["--dod"]) } : {}), ...(options["--config"] ? { configSource: readOptional(root, options["--config"]) ?? "" } : {}), ...(options["--previous"] ? { previousSource: readOptional(root, options["--previous"]) } : {}), ledger: readState(root), details });
    console.log(JSON.stringify(result));
    if (!result.valid) process.exitCode = 1;
  } catch (error) { console.log(JSON.stringify({ valid: false, errors: [error.message] })); process.exitCode = 1; }
}
