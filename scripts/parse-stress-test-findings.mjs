#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const CATEGORIES = new Set([
  "cross-requirement-contradiction",
  "constraint-impossibility",
  "concurrent-trigger-ambiguity",
  "boundary-scale-stress",
]);
const SEVERITIES = new Set(["CRITICAL", "HIGH", "MEDIUM"]);
const AFFECTED_ID = /^(?:FR|TR|OR|RR|SC)-\d{3}$|^(?:US|OBJ)\d+$/;
const definitionLine = /^STF-(\d{3}): \[([^\]]+)\] \(([^)]+)\) — Affected: (.+?) — (.+)$/;
const definitionCandidate = /^STF-\S*:/;
const reference = /\bSTF-\d{3}\b/g;
const unresolvedMarker = /\[NEEDS CLARIFICATION:\s*(STF-\d{3})\s*\]/g;
const deferredMarker = /\[DEFERRED TO NEXT CLARIFY\]/;
const requirement = /^- \*\*((?:FR|TR|OR|RR)-\d{3})\*\* \[(?:US|OBJ)\d+\]:/;
const successCriterion = /^(SC-\d{3}) \[(?:US|OBJ)\d+\]:/;
const workItem = /^### (?:User Story|Objective) (\d+) -/;

function issue(line, code, message) {
  return { line, code, message };
}

export function parseStressTestFindings(source) {
  const text = Buffer.isBuffer(source) ? source.toString("utf8") : source;
  const definitions = [];
  const errors = [];
  const references = [];
  const unresolvedIds = new Set();
  const seen = new Map();
  const knownAffectedIds = new Set();

  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const lineNumber = index + 1;
    const requirementMatch = line.match(requirement);
    if (requirementMatch) knownAffectedIds.add(requirementMatch[1]);
    const criterionMatch = line.match(successCriterion);
    if (criterionMatch) knownAffectedIds.add(criterionMatch[1]);
    const workItemMatch = line.match(workItem);
    if (workItemMatch) knownAffectedIds.add(`${line.includes("User Story") ? "US" : "OBJ"}${workItemMatch[1]}`);
    for (const match of line.matchAll(reference)) references.push({ id: match[0], line: lineNumber });
    for (const match of line.matchAll(unresolvedMarker)) unresolvedIds.add(match[1]);

    const match = line.match(definitionLine);
    if (!match) {
      if (definitionCandidate.test(line)) errors.push(issue(lineNumber, "invalid-definition", "STF definition must use canonical grammar"));
      continue;
    }

    const [, number, category, severity, affectedText, summary] = match;
    const id = `STF-${number}`;
    if (seen.has(id)) errors.push(issue(lineNumber, "duplicate-definition", `duplicate STF definition ${id}; first seen on line ${seen.get(id)}`));
    else seen.set(id, lineNumber);
    if (!CATEGORIES.has(category)) errors.push(issue(lineNumber, "invalid-category", `invalid STF category ${category}`));
    if (!SEVERITIES.has(severity)) errors.push(issue(lineNumber, "invalid-severity", `invalid STF severity ${severity}`));
    const affectedIds = affectedText.split(",").map((value) => value.trim()).filter(Boolean);
    if (affectedIds.length === 0 || affectedIds.some((id) => !AFFECTED_ID.test(id))) errors.push(issue(lineNumber, "invalid-affected-ids", `invalid affected IDs ${affectedText}`));
    if (!summary.trim()) errors.push(issue(lineNumber, "missing-summary", "STF summary must be non-empty"));
    definitions.push({ id, number: Number(number), category, severity, affectedIds, summary, deferred: deferredMarker.test(line), line: lineNumber });
  }

  if (definitions.length > 5) errors.push(issue(null, "finding-limit", `finding count ${definitions.length} exceeds the maximum of 5`));
  for (const { id, affectedIds, line } of definitions) {
    if (affectedIds.some((affected) => !knownAffectedIds.has(affected))) errors.push(issue(line, "unknown-affected-id", `finding ${id} references unknown affected ID`));
  }
  for (const id of unresolvedIds) {
    if (!seen.has(id)) errors.push(issue(null, "unknown-unresolved-reference", `unresolved marker references undefined finding ${id}`));
  }

  return {
    valid: errors.length === 0,
    definitions: definitions.map(({ number, line, deferred, ...definition }) => ({
      ...definition,
      resolution: unresolvedIds.has(definition.id) || deferred ? "unresolved" : "resolved",
    })),
    references,
    knownAffectedIds: [...knownAffectedIds],
    highestFindingNumber: definitions.reduce((highest, { number }) => Math.max(highest, number), 0),
    errors,
  };
}

export function validateScannerFindings(value, persisted) {
  const errors = [];
  if (!value || typeof value !== "object" || !Array.isArray(value.findings)) return { valid: false, errors: [issue(null, "invalid-output", "scanner output must contain a findings array")] };
  if (value.error) return { valid: false, errors: [issue(null, "scanner-error", `scanner returned ${value.error}`)] };
  if (value.findings.length > 5) errors.push(issue(null, "finding-limit", `finding count ${value.findings.length} exceeds the maximum of 5`));
  const existing = new Set(persisted.definitions.map(({ id }) => id));
  const returned = new Set();
  let expectedNumber = persisted.highestFindingNumber + 1;

  for (const finding of value.findings) {
    const id = finding?.id;
    const number = /^STF-(\d{3})$/.exec(id ?? "")?.[1];
    if (!number) errors.push(issue(null, "invalid-id", `invalid STF ID ${id}`));
    else if (Number(number) !== expectedNumber++) errors.push(issue(null, "non-monotonic-id", `expected STF-${String(expectedNumber - 1).padStart(3, "0")}, received ${id}`));
    if (existing.has(id) || returned.has(id)) errors.push(issue(null, "id-collision", `STF ID collision ${id}`));
    returned.add(id);
    if (!CATEGORIES.has(finding?.category)) errors.push(issue(null, "invalid-category", `invalid STF category ${finding?.category}`));
    if (!SEVERITIES.has(finding?.severity)) errors.push(issue(null, "invalid-severity", `invalid STF severity ${finding?.severity}`));
    if (!Array.isArray(finding?.affected_ids) || finding.affected_ids.length === 0 || finding.affected_ids.some((affected) => !AFFECTED_ID.test(affected) || !persisted.knownAffectedIds.includes(affected))) errors.push(issue(null, "invalid-affected-ids", `invalid affected IDs for ${id}`));
    for (const field of ["summary", "scenario", "recommended_resolution"]) if (typeof finding?.[field] !== "string" || !finding[field].trim()) errors.push(issue(null, "invalid-field", `missing ${field} for ${id}`));
  }
  return { valid: errors.length === 0, errors };
}

async function main() {
  const specPath = process.argv[2];
  if (!specPath) {
    console.error("Usage: node scripts/parse-stress-test-findings.mjs <spec.md>");
    process.exitCode = 2;
    return;
  }
  const result = parseStressTestFindings(await readFile(specPath));
  console.log(JSON.stringify(result));
  if (!result.valid) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((cause) => {
    console.error(cause.message);
    process.exitCode = 1;
  });
}
