#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const REQUIREMENT_ID = "(?:FR|TR|OR|RR)-\\d{3}";
const OWNER_ID = "(?:US|OBJ)\\d+";
const requirementLine = new RegExp(`^- \\*\\*(${REQUIREMENT_ID})\\*\\* \\[(${OWNER_ID})\\]:\\s+(.+)$`);
const requirementCandidate = /^\s*-\s*(?:\*\*)?((?:FR|TR|OR|RR)-\d+)\b/;
const workItemHeading = /^### (User Story|Objective) (\d+) - .+ \(Priority: (P[1-9]\d*)\)\s*$/;

export function parseRequirementOwnership(source) {
  const text = Buffer.isBuffer(source) ? source.toString("utf8") : source;
  const errors = [];
  const typeMatch = text.match(/^spec_type:\s*["']?(product|technical|operational)["']?\s*$/m);
  const specType = typeMatch?.[1] ?? "product";
  const expectedOwnerPrefix = specType === "product" ? "US" : "OBJ";
  const allowedFamilies = specType === "product" ? new Set(["FR"]) : specType === "technical" ? new Set(["TR"]) : new Set(["OR", "RR"]);
  const workItems = new Map();
  const requirements = [];
  const seenRequirements = new Set();

  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const heading = line.match(workItemHeading);
    if (heading) {
      const owner = `${heading[1] === "User Story" ? "US" : "OBJ"}${heading[2]}`;
      if (workItems.has(owner)) errors.push(`line ${index + 1}: duplicate work item ${owner}`);
      else workItems.set(owner, { id: owner, priority: heading[3] });
      continue;
    }

    const requirement = line.match(requirementLine);
    if (requirement) {
      const [, id, owner, description] = requirement;
      if (seenRequirements.has(id)) errors.push(`line ${index + 1}: duplicate requirement ${id}`);
      seenRequirements.add(id);
      if (!allowedFamilies.has(id.slice(0, 2))) errors.push(`line ${index + 1}: ${id} is invalid for spec_type ${specType}`);
      if (!owner.startsWith(expectedOwnerPrefix)) errors.push(`line ${index + 1}: ${id} must use a ${expectedOwnerPrefix} owner`);
      requirements.push({ id, owner, description, line: index + 1 });
      continue;
    }

    const candidate = line.match(requirementCandidate);
    if (candidate) errors.push(`line ${index + 1}: ${candidate[1]} must use - **REQ-###** [US#|OBJ#]: description`);
  }

  for (const requirement of requirements) {
    if (!workItems.has(requirement.owner)) errors.push(`line ${requirement.line}: ${requirement.id} references unknown owner ${requirement.owner}`);
  }

  for (const item of workItems.values()) {
    if (item.priority === "P1" && !requirements.some(({ owner }) => owner === item.id)) {
      errors.push(`P1 work item ${item.id} has no owned requirements`);
    }
  }

  const ownedRequirements = requirements.map(({ id, owner, description }) => ({
    id,
    owner,
    priority: workItems.get(owner)?.priority ?? null,
    description,
  }));

  return {
    valid: errors.length === 0,
    specType,
    requirements: ownedRequirements,
    p1RequirementIds: ownedRequirements.filter(({ priority }) => priority === "P1").map(({ id }) => id),
    errors,
  };
}

export function verifyRequirementSnapshot(source, snapshot) {
  const bytes = Buffer.isBuffer(source) ? source : Buffer.from(source, "utf8");
  const parsed = parseRequirementOwnership(bytes);
  const digest = createHash("sha256").update(bytes).digest("hex");
  const ids = snapshot?.requirementIds;
  const shapeValid = typeof snapshot === "object"
    && snapshot !== null
    && /^[a-f0-9]{64}$/.test(snapshot.specSha256 ?? "")
    && Array.isArray(ids)
    && ids.every((id) => new RegExp(`^${REQUIREMENT_ID}$`).test(id))
    && new Set(ids).size === ids.length;
  const idsMatch = shapeValid
    && ids.length === parsed.p1RequirementIds.length
    && ids.every((id, index) => id === parsed.p1RequirementIds[index]);

  return { valid: parsed.valid && shapeValid && snapshot.specSha256 === digest && idsMatch, digest, parsed };
}

async function main() {
  const specPath = process.argv[2];
  if (!specPath) {
    console.error("Usage: node scripts/parse-requirement-ownership.mjs <spec.md>");
    process.exitCode = 2;
    return;
  }
  const bytes = await readFile(specPath);
  const result = parseRequirementOwnership(bytes);
  console.log(JSON.stringify({ ...result, specSha256: createHash("sha256").update(bytes).digest("hex") }));
  if (!result.valid) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
