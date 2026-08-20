#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CAPABILITY_COLUMNS = ["Capability ID", "Capability", "Priority", "Outcome"];
const CAPABILITY_ID = /^CAP-\d{3}$/;
const PRIORITIES = new Set(["P1", "P2", "P3"]);
const PROFILES = new Set(["draft", "planning-ready"]);
const DISCOVERY_STATUSES = new Set(["active", "ready-to-synthesize", "completed", "abandoned"]);
const DISCOVERY_STAGES = new Set(["framing", "evidence", "research+stakeholders", "scope-options", "decision-checkpoints", "readiness", "synthesis", "none"]);
const METADATA_FIELDS = ["product", "prd_maturity", "created", "updated"];
const CORE_SECTIONS = [
  "Product Overview",
  "Problem Statement",
  "Scope Summary",
  "Product Capability Map",
];
const PLANNING_READY_SECTIONS = [
  "Vision and Why Now",
  "Background and Evidence",
  "Target Users, Stakeholders, and Core Personas",
  "User Needs / Jobs To Be Done",
  "Product Principles or UX Principles",
  "In-Scope Capabilities",
  "Out-of-Scope Items",
  "Success Metrics / KPIs / Desired Outcomes",
  "Assumptions",
  "Constraints",
  "Dependencies",
  "Risks",
  "Open Questions",
  "Release or Validation Approach",
  "Handoff Guidance",
  "Project Context Baseline Updates",
];
const DOWNSTREAM_CATEGORIES = Object.freeze({
  "product-vision-purpose": ["Product Overview", "Vision and Why Now"],
  "target-audience-actors": ["Target Users, Stakeholders, and Core Personas"],
  "domain-context": ["Background and Evidence", "User Needs / Jobs To Be Done"],
  "scope-boundaries": ["Scope Summary", "In-Scope Capabilities", "Out-of-Scope Items"],
  "success-measures": ["Success Metrics / KPIs / Desired Outcomes"],
});

function textOf(source) {
  if (Buffer.isBuffer(source)) return source.toString("utf8");
  if (typeof source !== "string") throw new TypeError("PRD source must be a string or Buffer");
  return source;
}

function issue(code, message, line = null, extra = {}) {
  return { code, message, ...(line === null ? {} : { line }), ...extra };
}

function scalar(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'")))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  const metadata = {};
  const metadataLines = {};
  const errors = [];

  if (lines[0]?.trim() !== "---") {
    return { metadata, metadataLines, bodyStart: 0, errors: [issue("missing-frontmatter", "PRD must start with YAML-like frontmatter", 1)] };
  }

  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end === -1) {
    return { metadata, metadataLines, bodyStart: lines.length, errors: [issue("unterminated-frontmatter", "PRD frontmatter is missing its closing ---", 1)] };
  }

  for (let index = 1; index < end; index += 1) {
    const line = lines[index];
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*?)\s*$/);
    if (!match) {
      errors.push(issue("invalid-frontmatter-line", "frontmatter entries must use key: value", index + 1));
      continue;
    }
    const [, key, rawValue] = match;
    if (Object.hasOwn(metadata, key)) {
      errors.push(issue("duplicate-metadata", `duplicate frontmatter field ${key}`, index + 1, { field: key }));
      continue;
    }
    metadata[key] = scalar(rawValue);
    metadataLines[key] = index + 1;
  }

  return { metadata, metadataLines, bodyStart: end + 1, errors };
}

function parseSections(lines, bodyStart) {
  const sections = {};
  const order = [];
  const errors = [];
  let current = null;

  for (let index = bodyStart; index < lines.length; index += 1) {
    const heading = lines[index].match(/^(##|###) ([^#].*?)\s*$/);
    if (heading) {
      if (current) current.content = lines.slice(current.start, index).join("\n").trim();
      const title = heading[2];
      current = { title, level: heading[1].length, line: index + 1, start: index + 1, content: "" };
      if (Object.hasOwn(sections, title)) {
        errors.push(issue("duplicate-section", `duplicate section ${title}`, index + 1, { section: title }));
      } else {
        sections[title] = current;
        order.push(title);
      }
    }
  }
  if (current) current.content = lines.slice(current.start).join("\n").trim();

  return { sections, sectionOrder: order, errors };
}

function splitTableRow(line) {
  const value = line.trim();
  if (!value.startsWith("|") || !value.endsWith("|")) return null;
  const cells = [];
  let cell = "";
  let escaped = false;
  for (const character of value.slice(1, -1)) {
    if (escaped) {
      cell += character;
      escaped = false;
    } else if (character === "\\") {
      cell += character;
      escaped = true;
    } else if (character === "|") {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function isSeparator(cells) {
  return cells?.length === CAPABILITY_COLUMNS.length && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseCapabilities(section) {
  if (!section) return { capabilities: [], tableFound: false, errors: [] };
  const lines = section.content.split(/\r?\n/);
  const errors = [];
  const capabilities = [];
  let headerIndex = -1;
  let candidateHeader = -1;

  for (const [index, line] of lines.entries()) {
    const cells = splitTableRow(line);
    if (!cells) continue;
    if (cells.some((cell) => /capability id/i.test(cell))) candidateHeader = index;
    if (cells.length === CAPABILITY_COLUMNS.length && cells.every((cell, cellIndex) => cell === CAPABILITY_COLUMNS[cellIndex])) {
      headerIndex = index;
      break;
    }
  }

  if (headerIndex === -1) {
    errors.push(issue(
      "invalid-capability-table-header",
      `Product Capability Map must use columns: ${CAPABILITY_COLUMNS.join(" | ")}`,
      section.line + Math.max(candidateHeader, 0) + 1,
    ));
    return { capabilities, tableFound: false, errors };
  }

  const separator = splitTableRow(lines[headerIndex + 1] ?? "");
  if (!isSeparator(separator)) {
    errors.push(issue("invalid-capability-table-separator", "capability table header must be followed by a Markdown separator row", section.line + headerIndex + 2));
    return { capabilities, tableFound: true, errors };
  }

  let sawData = false;
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const line = lines[index];
    const cells = splitTableRow(line);
    if (!cells) {
      if (sawData || line.trim()) break;
      continue;
    }
    sawData = true;
    const lineNumber = section.line + index + 1;
    if (cells.length !== CAPABILITY_COLUMNS.length) {
      errors.push(issue("invalid-capability-row", `capability row must contain ${CAPABILITY_COLUMNS.length} columns`, lineNumber));
      continue;
    }
    const [id, capability, priority, outcome] = cells;
    const parsed = { id, capability, priority, outcome, line: lineNumber };
    capabilities.push(parsed);
    if (!CAPABILITY_ID.test(id)) errors.push(issue("invalid-capability-id", `invalid capability ID ${id || "(empty)"}; expected CAP-###`, lineNumber, { id }));
    if (!PRIORITIES.has(priority)) errors.push(issue("invalid-capability-priority", `invalid priority ${priority || "(empty)"}; expected P1, P2, or P3`, lineNumber, { id }));
    if (!isSubstantive(capability)) errors.push(issue("empty-capability", "capability name must be substantive", lineNumber, { id }));
    if (!isSubstantive(outcome)) errors.push(issue("empty-capability-outcome", "capability outcome must be substantive", lineNumber, { id }));
  }

  const seen = new Map();
  for (const capability of capabilities) {
    if (!CAPABILITY_ID.test(capability.id)) continue;
    if (seen.has(capability.id)) {
      errors.push(issue("duplicate-capability-id", `duplicate capability ID ${capability.id}; first seen on line ${seen.get(capability.id)}`, capability.line, { id: capability.id }));
    } else {
      seen.set(capability.id, capability.line);
    }
  }

  return { capabilities, tableFound: true, errors };
}

function hasPlaceholder(value) {
  const text = value.replace(/<!--[^]*?-->/g, "");
  return /\b(?:TODO|TBD|TBC|FIXME|XXX)\b/i.test(text)
    || /\[(?:PRODUCT|YYYY-MM-DD|CANONICAL_PRD|SHA-256 OR EMPTY|PATH)\]/.test(text)
    || /\[(?:Describe|What the product|Vision, urgency|Core problem|Relevant EVD|Primary user|Business, operational|Persona|Need or JTBD|Principle|Decided release|Decided capability|Deferred or excluded|Capability cluster|Outcome|metric|target|reason|window|Unverified condition|External dependency|Risk|PDQ-###|How value|Term|Definition|Non-negotiable outcome|Boundary|Constraint|Question or none|Reusable project-level)[^\]]*\]/i.test(text)
    || /<(?:insert|replace|describe|add|your|placeholder)[^>]*>/i.test(text)
    || /\b(?:lorem ipsum|placeholder text)\b/i.test(text);
}

function plainText(value) {
  return value
    .replace(/<!--[^]*?-->/g, " ")
    .replace(/[`*_>#|\[\]()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSubstantive(value) {
  const plain = plainText(value ?? "");
  return plain.length >= 3
    && /[A-Za-z0-9]/.test(plain)
    && !/^(?:n\/?a|none|unknown|pending)$/i.test(plain)
    && !hasPlaceholder(value ?? "");
}

function publicCapabilities(capabilities) {
  return capabilities.map(({ line, ...capability }) => capability);
}

export function parsePrd(source) {
  const text = textOf(source);
  const lines = text.split(/\r?\n/);
  const frontmatter = parseFrontmatter(text);
  const parsedSections = parseSections(lines, frontmatter.bodyStart);
  const parsedCapabilities = parseCapabilities(parsedSections.sections["Product Capability Map"]);
  const errors = [...frontmatter.errors, ...parsedSections.errors, ...parsedCapabilities.errors];

  return {
    valid: errors.length === 0,
    metadata: frontmatter.metadata,
    sections: Object.fromEntries(Object.entries(parsedSections.sections).map(([title, section]) => [title, {
      level: section.level,
      line: section.line,
      content: section.content,
    }])),
    sectionOrder: parsedSections.sectionOrder,
    capabilities: publicCapabilities(parsedCapabilities.capabilities),
    capabilityTableFound: parsedCapabilities.tableFound,
    errors,
  };
}

function normalizedCapabilityMap(value) {
  const capabilities = Array.isArray(value) ? value : value?.capabilities;
  if (!Array.isArray(capabilities)) throw new TypeError("capabilities must be an array or a parsed PRD result");
  return capabilities.map(({ id, capability, priority, outcome }) => ({ id, capability, priority, outcome }));
}

export function computeCapabilityDigest(capabilities) {
  const canonical = normalizedCapabilityMap(capabilities)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(({ id, capability, priority, outcome }) => ({ id, capability, priority, outcome }));
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export function compareCapabilityMaps(before, after) {
  const beforeMap = new Map(normalizedCapabilityMap(before).map((item) => [item.id, item]));
  const afterMap = new Map(normalizedCapabilityMap(after).map((item) => [item.id, item]));
  const ids = [...new Set([...beforeMap.keys(), ...afterMap.keys()])].sort();
  const result = { added: [], removed: [], priorityChanged: [], changed: [] };

  for (const id of ids) {
    const previous = beforeMap.get(id);
    const current = afterMap.get(id);
    if (!previous) {
      result.added.push(id);
      continue;
    }
    if (!current) {
      result.removed.push(id);
      continue;
    }
    if (previous.priority !== current.priority) {
      result.priorityChanged.push({ id, before: previous.priority, after: current.priority });
    }
    const fields = ["capability", "outcome"].filter((field) => previous[field] !== current[field]);
    if (fields.length > 0) result.changed.push({ id, fields, before: previous, after: current });
  }

  return result;
}

function digestFromResult(prdResult) {
  if (typeof prdResult?.capabilityDigest === "string") return prdResult.capabilityDigest;
  return computeCapabilityDigest(prdResult);
}

export function validatePrdPlanFreshness(prdResult, projectPlanSource) {
  const expectedDigest = digestFromResult(prdResult);
  const frontmatter = parseFrontmatter(textOf(projectPlanSource));
  const actualDigest = frontmatter.metadata.prd_capability_digest || null;
  const expectedSource = normalizedPath(prdResult?.canonicalPath ?? "specs/prd.md");
  const actualSource = frontmatter.metadata.prd_source ? normalizedPath(frontmatter.metadata.prd_source) : null;
  const errors = [...frontmatter.errors];

  if (!actualSource) {
    errors.push(issue("missing-prd-source", "project plan frontmatter is missing prd_source"));
  } else if (actualSource !== expectedSource) {
    errors.push(issue("prd-source-mismatch", "project plan prd_source does not match the canonical PRD", frontmatter.metadataLines.prd_source ?? null, {
      expected: expectedSource,
      actual: actualSource,
    }));
  }

  if (!actualDigest) {
    errors.push(issue("missing-prd-capability-digest", "project plan frontmatter is missing prd_capability_digest"));
  } else if (actualDigest !== expectedDigest) {
    errors.push(issue("prd-capability-digest-mismatch", "project plan capability digest does not match the current PRD", frontmatter.metadataLines.prd_capability_digest ?? null, {
      expected: expectedDigest,
      actual: actualDigest,
    }));
  }

  return { valid: errors.length === 0, expectedSource, actualSource, expectedDigest, actualDigest, errors };
}

function normalizedPath(value) {
  return value.trim().replace(/^\.\//, "").replaceAll("\\", "/").replace(/\/+$/, "");
}

function isSafeRepositoryPath(value) {
  if (typeof value !== "string" || !value.trim() || value.includes("\0") || value.includes("\\")) return false;
  const candidate = value.trim().replace(/^\.\//, "");
  if (path.posix.isAbsolute(candidate) || /^[A-Za-z]:/.test(candidate)) return false;
  const segments = candidate.split("/");
  return segments.every((segment) => segment && segment !== "." && segment !== "..");
}

function validateConfig(configSource, canonicalPath) {
  const text = textOf(configSource);
  const lines = text.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim() === "## Product Document");
  if (headingIndex === -1) return issue("missing-config-product-document", "config is missing the ## Product Document section");
  let configured = null;
  for (let index = headingIndex + 1; index < lines.length && !/^##\s/.test(lines[index]); index += 1) {
    const match = lines[index].match(/^\*\*Path\*\*:\s*(.*?)\s*$/);
    if (match) {
      configured = scalar(match[1]);
      break;
    }
  }
  if (!configured) return issue("missing-config-product-document-path", "config Product Document path is empty");
  if (!isSafeRepositoryPath(configured)) return issue("unsafe-config-product-document-path", `config Product Document path is not a safe repository-relative path: ${configured}`);
  if (normalizedPath(configured) !== normalizedPath(canonicalPath)) {
    return issue("config-product-document-mismatch", `config Product Document path ${configured} does not match canonical path ${canonicalPath}`, null, {
      expected: normalizedPath(canonicalPath),
      actual: normalizedPath(configured),
    });
  }
  return null;
}

function validateDiscovery(discoverySource, canonicalPath) {
  const frontmatter = parseFrontmatter(textOf(discoverySource));
  const status = (frontmatter.metadata.status ?? "").toLowerCase();
  const errors = [...frontmatter.errors];
  if (!DISCOVERY_STATUSES.has(status)) errors.push(issue("invalid-discovery-status", "discovery status must be active, ready-to-synthesize, completed, or abandoned"));
  const unsupportedTargetFields = ["target", "target_path", "target_document", "prd_path", "canonical_prd", "product_document"]
    .filter((field) => Object.hasOwn(frontmatter.metadata, field));
  if (unsupportedTargetFields.length > 0) {
    errors.push(issue("unsupported-discovery-target-field", `discovery must use target_prd only; remove ${unsupportedTargetFields.join(", ")}`));
  }
  const target = frontmatter.metadata.target_prd ?? "";
  if (!target) errors.push(issue("missing-discovery-target", "discovery frontmatter must identify target_prd"));
  else if (!isSafeRepositoryPath(target)) errors.push(issue("unsafe-discovery-target", `discovery target is not a safe repository-relative path: ${target}`));
  const awaitingUser = frontmatter.metadata.awaiting_user;
  if (!new Set(["true", "false"]).has(awaitingUser)) errors.push(issue("invalid-discovery-awaiting-user", "discovery awaiting_user must be true or false"));
  for (const field of ["current_stage", "next_stage"]) {
    const stage = frontmatter.metadata[field];
    if (!DISCOVERY_STAGES.has(stage)) errors.push(issue("invalid-discovery-stage", `discovery ${field} is missing or invalid`, null, { field }));
  }
  const currentStage = frontmatter.metadata.current_stage;
  const nextStage = frontmatter.metadata.next_stage;
  if (status === "active" && (currentStage === "none" || nextStage === "none")) {
    errors.push(issue("invalid-discovery-transition", "active discovery must retain current and next stages"));
  }
  if (status === "ready-to-synthesize" && (awaitingUser !== "false" || nextStage !== "synthesis" || !new Set(["readiness", "synthesis"]).has(currentStage))) {
    errors.push(issue("invalid-discovery-transition", "ready-to-synthesize discovery must be non-waiting and point from readiness/synthesis to synthesis"));
  }
  if (new Set(["completed", "abandoned"]).has(status) && (awaitingUser !== "false" || currentStage !== "none" || nextStage !== "none")) {
    errors.push(issue("invalid-discovery-transition", `${status} discovery must be non-waiting with current_stage and next_stage set to none`));
  }
  const normalizedTarget = normalizedPath(target);
  const matches = normalizedTarget === normalizedPath(canonicalPath)
    || ["prd", "canonical", "canonical-prd", "canonical prd", "product-document"].includes(normalizedTarget.toLowerCase());
  if (matches && (status === "active" || status === "ready-to-synthesize")) {
    errors.push(issue("active-prd-discovery", `discovery with status ${status} still targets ${canonicalPath}`, null, { status, target }));
  }
  return errors;
}

function contentErrors(text) {
  const errors = [];
  const lines = text.split(/\r?\n/);
  const bodyStart = parseFrontmatter(text).bodyStart;
  for (let index = bodyStart; index < lines.length; index += 1) {
    const line = lines[index];
    if (hasPlaceholder(line)) errors.push(issue("placeholder-content", "PRD contains unresolved placeholder content", index + 1));
    if (/^\s*(?:[-*]\s*)?(?:\*\*)?(?:Given|When|Then)(?:\*\*)?(?:\s|[:,-]|$)/i.test(line)) {
      errors.push(issue("given-when-then-content", "PRD must not contain Given/When/Then scenarios", index + 1));
    }
    if (/^#{1,6}\s+.*acceptance criteria\s*$/i.test(line) || /^\s*[-*]\s*\*\*Acceptance Criteria\*\*\s*:/i.test(line)) {
      errors.push(issue("feature-acceptance-criteria", "PRD must not contain feature-level acceptance criteria", index + 1));
    }
    if (/^#{1,6}\s+(?:Implementation Plan|Backlog|Tasks?|User Stories)(?:\s|$)/i.test(line)
      || /^\s*- \[[ xX]\]\s+(?:T\d{3}\b|.+)/.test(line)
      || /^\s*-\s+T\d{3}\b/.test(line)) {
      errors.push(issue("implementation-content", "PRD must not contain implementation-plan, backlog, or task content", index + 1));
    }
  }
  return errors;
}

function validateMetadata(parsed, profile) {
  const errors = [];
  for (const field of METADATA_FIELDS) {
    const value = parsed.metadata[field];
    const valid = field === "product" ? Boolean(value?.trim()) && !hasPlaceholder(value) : isSubstantive(value);
    if (!valid) errors.push(issue("missing-metadata", `frontmatter field ${field} must be substantive`, null, { field }));
  }
  if (parsed.metadata.prd_maturity && !PROFILES.has(parsed.metadata.prd_maturity)) {
    errors.push(issue("invalid-prd-maturity", "prd_maturity must be draft or planning-ready", null, { field: "prd_maturity" }));
  } else if (parsed.metadata.prd_maturity && parsed.metadata.prd_maturity !== profile) {
    errors.push(issue("prd-maturity-mismatch", `prd_maturity ${parsed.metadata.prd_maturity} does not match validation profile ${profile}`, null, { field: "prd_maturity" }));
  }
  for (const field of ["created", "updated"]) {
    const value = parsed.metadata[field];
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(value ?? "")
      && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
      && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
    if (value && !validDate) {
      errors.push(issue("invalid-metadata-date", `${field} must use YYYY-MM-DD`, null, { field }));
    }
  }
  if (parsed.metadata.created && parsed.metadata.updated && parsed.metadata.updated < parsed.metadata.created) {
    errors.push(issue("invalid-metadata-date-order", "updated must not be earlier than created"));
  }
  return errors;
}

function hasSubstantiveSection(parsed, name) {
  const direct = parsed.sections[name];
  if (direct && isSubstantive(direct.content)) return true;
  const childSections = {
    "Target Users, Stakeholders, and Core Personas": ["Target Users", "Stakeholders", "Core Personas"],
  }[name] ?? [];
  return childSections.some((child) => parsed.sections[child] && isSubstantive(parsed.sections[child].content));
}

export function validatePrd(source, options = {}) {
  const profile = options.profile ?? "draft";
  if (!PROFILES.has(profile)) throw new TypeError("profile must be draft or planning-ready");
  const text = textOf(source);
  const parsed = parsePrd(text);
  const errors = [...parsed.errors, ...validateMetadata(parsed, profile), ...contentErrors(text)];

  for (const section of CORE_SECTIONS) {
    if (!parsed.sections[section]) errors.push(issue("missing-section", `missing required section ## ${section}`, null, { section }));
    else if (!hasSubstantiveSection(parsed, section)) errors.push(issue("empty-section", `section ## ${section} must be substantive`, parsed.sections[section].line, { section }));
  }
  if (profile === "planning-ready") {
    for (const section of PLANNING_READY_SECTIONS) {
      if (!parsed.sections[section]) errors.push(issue("missing-section", `missing required section ## ${section}`, null, { section }));
      else if (!hasSubstantiveSection(parsed, section)) errors.push(issue("empty-section", `section ## ${section} must be substantive`, parsed.sections[section].line, { section }));
    }
  }

  const categories = {};
  for (const [category, sections] of Object.entries(DOWNSTREAM_CATEGORIES)) {
    const missing = sections.filter((section) => !parsed.sections[section] || !hasSubstantiveSection(parsed, section));
    categories[category] = { valid: missing.length === 0, missing };
    if (profile === "planning-ready" && missing.length > 0) {
      errors.push(issue("missing-downstream-category", `downstream category ${category} is incomplete; missing ${missing.join(", ")}`, null, { category, missing }));
    }
  }

  if (profile === "planning-ready" && !parsed.capabilities.some(({ priority, id }) => priority === "P1" && CAPABILITY_ID.test(id))) {
    errors.push(issue("missing-p1-capability", "planning-ready PRD must contain at least one valid P1 capability"));
  }

  const canonicalPath = options.canonicalPath ?? "specs/prd.md";
  if (options.configSource !== undefined) {
    const configError = validateConfig(options.configSource, canonicalPath);
    if (configError) errors.push(configError);
  }
  if (profile === "planning-ready" && options.discoverySource !== undefined) {
    errors.push(...validateDiscovery(options.discoverySource, canonicalPath));
  }

  const capabilityDigest = computeCapabilityDigest(parsed.capabilities);
  let projectPlanFreshness = null;
  if (options.projectPlanSource !== undefined) {
    projectPlanFreshness = validatePrdPlanFreshness({ ...parsed, canonicalPath, capabilityDigest }, options.projectPlanSource);
    errors.push(...projectPlanFreshness.errors);
  }

  return {
    valid: errors.length === 0,
    profile,
    metadata: parsed.metadata,
    canonicalPath,
    sections: parsed.sectionOrder,
    categories,
    capabilities: parsed.capabilities,
    capabilityDigest,
    projectPlanFreshness,
    errors,
  };
}

function parseArguments(argv) {
  const result = { prdPath: null, profile: null, configPath: null, discoveryPath: null, projectPlanPath: null };
  const optionNames = { "--profile": "profile", "--config": "configPath", "--discovery": "discoveryPath", "--project-plan": "projectPlanPath" };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("-") && !result.prdPath) {
      result.prdPath = argument;
      continue;
    }
    const property = optionNames[argument];
    if (!property) throw new Error(`unknown argument: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`missing value for ${argument}`);
    result[property] = value;
    index += 1;
  }
  if (!result.prdPath) throw new Error("missing PRD path");
  if (!result.profile) throw new Error("missing required --profile");
  if (!PROFILES.has(result.profile)) throw new Error("--profile must be draft or planning-ready");
  return result;
}

async function readOptional(inputPath, option, { allowMissing = false } = {}) {
  if (!inputPath) return undefined;
  if (path.isAbsolute(inputPath) || /^[A-Za-z]:/.test(inputPath) || inputPath.includes("\\")) {
    throw new Error(`${option} path must be a normalized repository-relative path: ${inputPath}`);
  }
  const lexicalRoot = path.resolve(process.cwd());
  const lexicalTarget = path.resolve(lexicalRoot, inputPath);
  const relativeTarget = path.relative(lexicalRoot, lexicalTarget);
  if (relativeTarget === ".." || relativeTarget.startsWith(`..${path.sep}`) || path.isAbsolute(relativeTarget)) {
    throw new Error(`${option} path escapes the repository: ${inputPath}`);
  }
  try {
    const [rootReal, targetReal] = await Promise.all([realpath(lexicalRoot), realpath(lexicalTarget)]);
    const expectedReal = path.resolve(rootReal, relativeTarget);
    const realRelative = path.relative(rootReal, targetReal);
    if (targetReal !== expectedReal || realRelative === ".." || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) {
      throw new Error(`${option} path uses a symlink or escapes the repository: ${inputPath}`);
    }
    return await readFile(targetReal);
  } catch (error) {
    if (allowMissing && error.code === "ENOENT") return undefined;
    if (error.message?.startsWith(`${option} path `)) throw error;
    throw new Error(`${option} file cannot be read: ${inputPath} (${error.code ?? error.message})`);
  }
}

async function main() {
  let args;
  try {
    args = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(`Usage: node scripts/validate-prd.mjs <prd-path> --profile draft|planning-ready [--config path] [--discovery path] [--project-plan path]\n${error.message}`);
    process.exitCode = 2;
    return;
  }

  try {
    const [source, configSource, discoverySource, projectPlanSource] = await Promise.all([
      readOptional(args.prdPath, "PRD"),
      readOptional(args.configPath, "config"),
      readOptional(args.discoveryPath, "discovery", { allowMissing: true }),
      readOptional(args.projectPlanPath, "project plan"),
    ]);
    const result = validatePrd(source, {
      profile: args.profile,
      canonicalPath: args.prdPath,
      ...(configSource === undefined ? {} : { configSource }),
      ...(discoverySource === undefined ? {} : { discoverySource }),
      ...(projectPlanSource === undefined ? {} : { projectPlanSource }),
    });
    console.log(JSON.stringify(result));
    if (!result.valid) process.exitCode = 1;
  } catch (error) {
    console.log(JSON.stringify({ valid: false, errors: [issue("file-read-error", error.message)] }));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
