#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PROFILES = new Set(["draft", "planning-ready"]);
const METADATA_FIELDS = ["sad_schema", "sad_maturity", "created", "updated"];
const TECHNICAL_FIELDS = [
  "Language/Version",
  "Primary Dependencies",
  "Storage",
  "Testing",
  "Target Platform",
  "Project Type",
  "Performance Goals",
  "Constraints",
  "Scale/Scope",
];
const CORE_SECTIONS = [
  "Purpose and Scope",
  "Technical Context",
  "System Decomposition",
  "System Scope and Context",
  "Architecture View Catalog",
  "Solution Strategy and Architecture Style",
  "Major Data Flow Catalog",
  "Major Data Flow Diagrams",
  "Deployment and Trust Topology",
  "Cross-Cutting Concerns",
  "Quality Attributes",
  "Architecture Traceability",
  "Architecture Decision Records",
  "Risks, Assumptions, Constraints, and Open Questions",
  "Project Context Baseline Updates",
];
const CROSS_CUTTING_SECTIONS = ["Security", "Reliability", "Observability", "Data Management", "Integration Strategy", "Operations"];
const TABLES = Object.freeze({
  decomposition: {
    section: "System Decomposition",
    columns: ["Boundary", "Responsibilities", "Data Ownership", "Exposed Interfaces", "Dependencies", "Deployment Independence"],
  },
  views: {
    section: "Architecture View Catalog",
    columns: ["View", "Concern", "Scope", "Notation", "Rationale"],
  },
  flows: {
    section: "Major Data Flow Catalog",
    columns: ["Flow ID", "Trigger", "Source / Actor", "Processing Boundaries", "Stores", "Egress", "Trust / Data Class", "Consistency / Transaction", "Failure / Recovery", "Diagram"],
  },
  quality: {
    section: "Quality Attributes",
    columns: ["Attribute", "Target", "Measurement", "Architectural Response"],
  },
  traceability: {
    section: "Architecture Traceability",
    columns: ["Capability / Objective", "Boundary", "Major Flow", "Quality Target", "ADRs"],
  },
  adrs: {
    section: "Architecture Decision Records",
    columns: ["ADR ID", "Title", "Status", "Date", "Supersedes", "File"],
  },
});
const FLOW_ID = /^FLOW-\d{3}$/;
const ADR_ID = /^ADR-\d{4}$/;
const ADR_STATUSES = new Set(["proposed", "accepted", "deprecated", "superseded"]);

function textOf(source) {
  if (Buffer.isBuffer(source)) return source.toString("utf8");
  if (typeof source !== "string") throw new TypeError("SAD source must be a string or Buffer");
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
    return { metadata, metadataLines, bodyStart: 0, errors: [issue("missing-frontmatter", "SAD must start with YAML-like frontmatter", 1)] };
  }
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end === -1) {
    return { metadata, metadataLines, bodyStart: lines.length, errors: [issue("unterminated-frontmatter", "SAD frontmatter is missing its closing ---", 1)] };
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

function parseDocumentSections(lines, bodyStart) {
  const sections = {};
  const headings = [];
  const errors = [];
  let current = null;
  for (let index = bodyStart; index < lines.length; index += 1) {
    const heading = lines[index].match(/^(#{2,3})\s+([^#].*?)\s*$/);
    if (!heading) continue;
    const item = { title: heading[2], level: heading[1].length, line: index + 1, start: index + 1, content: "" };
    headings.push(item);
    if (item.level !== 2) continue;
    if (current) current.content = lines.slice(current.start, index).join("\n").trim();
    current = item;
    if (Object.hasOwn(sections, item.title)) errors.push(issue("duplicate-section", `duplicate section ${item.title}`, item.line, { section: item.title }));
    else sections[item.title] = item;
  }
  if (current) current.content = lines.slice(current.start).join("\n").trim();
  return { sections, headings, errors };
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
    } else cell += character;
  }
  cells.push(cell.trim());
  return cells;
}

function parseTable(section, columns) {
  if (!section) return { rows: [], errors: [] };
  const lines = section.content.split(/\r?\n/);
  const errors = [];
  let headerIndex = -1;
  for (const [index, line] of lines.entries()) {
    const cells = splitTableRow(line);
    if (cells?.length === columns.length && cells.every((cell, cellIndex) => cell === columns[cellIndex])) {
      headerIndex = index;
      break;
    }
  }
  if (headerIndex === -1) {
    errors.push(issue("invalid-table-header", `section ## ${section.title} must use columns: ${columns.join(" | ")}`, section.line, { section: section.title }));
    return { rows: [], errors };
  }
  const separator = splitTableRow(lines[headerIndex + 1] ?? "");
  if (!separator || separator.length !== columns.length || !separator.every((cell) => /^:?-{3,}:?$/.test(cell))) {
    errors.push(issue("invalid-table-separator", `section ## ${section.title} table requires a Markdown separator row`, section.line + headerIndex + 2, { section: section.title }));
    return { rows: [], errors };
  }
  const rows = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const cells = splitTableRow(lines[index]);
    if (!cells) {
      if (rows.length > 0 || lines[index].trim()) break;
      continue;
    }
    const line = section.line + index + 1;
    if (cells.length !== columns.length) {
      errors.push(issue("invalid-table-row", `section ## ${section.title} row must contain ${columns.length} columns`, line, { section: section.title }));
      continue;
    }
    rows.push({ line, values: Object.fromEntries(columns.map((column, cellIndex) => [column, cells[cellIndex]])) });
  }
  return { rows, errors };
}

function hasPlaceholder(value) {
  const text = value.replace(/<!--[^]*?-->/g, "");
  return /\b(?:TODO|TBD|TBC|FIXME|XXX|NEEDS CLARIFICATION)\b/i.test(text)
    || /\[(?:PROJECT|DATE|Describe|Summarize|Runtime|Test framework|single service|Users|Boundary|Owned|API|Required|Independent|Primary|Additional|Question|Domain|Sequence|Why needed|Modular|Adopted|Brief rationale|Rejected|Trigger|Source|Store|Destination|Trust|Consistency|Timeout|Flow Name|State retry|Include only|Authentication|Availability|Logs|Ownership|Protocols|Operational|Measurable|Measurement|Design response|P1 capability|Attribute target|ADR-NNNN|Decision Title|Risk|Assumption|Hard constraint|Reusable project-level)[^\]]*\]/i.test(text)
    || text.includes("[0001-decision-title.md]")
    || /<(?:insert|replace|describe|add|your|placeholder)[^>]*>/i.test(text)
    || /\b(?:lorem ipsum|placeholder text)\b/i.test(text);
}

function plainText(value) {
  return (value ?? "")
    .replace(/<!--[^]*?-->/g, " ")
    .replace(/[`*_>#|\[\]()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSubstantive(value) {
  const plain = plainText(value);
  return plain.length >= 2 && /[A-Za-z0-9]/.test(plain) && !/^(?:n\/?a|none|unknown|pending)$/i.test(plain) && !hasPlaceholder(value ?? "");
}

function parseTechnicalFields(section) {
  const values = {};
  const lines = section?.content.split(/\r?\n/) ?? [];
  for (const line of lines) {
    const match = line.match(/^\*\*([^*]+)\*\*:\s*(.*?)(?:<br>)?\s*$/);
    if (match) values[match[1]] = match[2].replace(/\s{2}$/, "").trim();
  }
  return values;
}

function parseMermaid(text) {
  const diagrams = [];
  const pattern = /```mermaid\s*\n([^]*?)```/g;
  for (const match of text.matchAll(pattern)) {
    const line = text.slice(0, match.index).split(/\r?\n/).length;
    const code = match[1].trim();
    diagrams.push({ line, code, type: code.split(/\r?\n/, 1)[0]?.trim() ?? "", nodes: countNodes(code) });
  }
  return diagrams;
}

function countNodes(code) {
  const lines = code.split(/\r?\n/);
  if (/^C4(?:Context|Container|Component)\b/.test(lines[0]?.trim() ?? "")) {
    return lines.filter((line) => /^\s*(?:Person|Person_Ext|System|System_Ext|SystemDb|SystemQueue|Container|ContainerDb|ContainerQueue|Component|ComponentDb|ComponentQueue|Boundary|Enterprise_Boundary|System_Boundary|Container_Boundary)\s*\(/.test(line)).length;
  }
  if (/^sequenceDiagram\b/.test(lines[0]?.trim() ?? "")) return new Set(lines.map((line) => line.match(/^\s*(?:participant|actor)\s+([^\s]+)/)?.[1]).filter(Boolean)).size;
  if (/^(?:flowchart|graph)\b/.test(lines[0]?.trim() ?? "")) {
    const nodes = new Set();
    for (const line of lines.slice(1)) {
      for (const match of line.matchAll(/(?:^|[\s;]|-->|---|-.->|==>)([A-Za-z][A-Za-z0-9_-]*)\s*(?=\[|\(|\{)/g)) nodes.add(match[1]);
    }
    return nodes.size;
  }
  return 0;
}

function validateMetadata(frontmatter, profile) {
  const errors = [];
  for (const field of METADATA_FIELDS) {
    if (!frontmatter.metadata[field]) errors.push(issue("missing-metadata", `frontmatter field ${field} is required`, null, { field }));
  }
  if (frontmatter.metadata.sad_schema && frontmatter.metadata.sad_schema !== "1.0") errors.push(issue("invalid-sad-schema", "sad_schema must be 1.0"));
  if (frontmatter.metadata.sad_maturity && !PROFILES.has(frontmatter.metadata.sad_maturity)) errors.push(issue("invalid-sad-maturity", "sad_maturity must be draft or planning-ready"));
  else if (frontmatter.metadata.sad_maturity && frontmatter.metadata.sad_maturity !== profile) errors.push(issue("sad-maturity-mismatch", `sad_maturity ${frontmatter.metadata.sad_maturity} does not match validation profile ${profile}`));
  for (const field of ["created", "updated"]) {
    const value = frontmatter.metadata[field];
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
    if (value && !valid) errors.push(issue("invalid-metadata-date", `${field} must use YYYY-MM-DD`, frontmatter.metadataLines[field] ?? null, { field }));
  }
  if (frontmatter.metadata.created && frontmatter.metadata.updated && frontmatter.metadata.updated < frontmatter.metadata.created) errors.push(issue("invalid-metadata-date-order", "updated must not be earlier than created"));
  return errors;
}

function normalizedPath(value) {
  return value.trim().replace(/^\.\//, "").replaceAll("\\", "/").replace(/\/+$/, "");
}

function isSafeRepositoryPath(value) {
  if (typeof value !== "string" || !value.trim() || value.includes("\0") || value.includes("\\")) return false;
  const candidate = value.trim().replace(/^\.\//, "");
  if (path.posix.isAbsolute(candidate) || /^[A-Za-z]:/.test(candidate)) return false;
  return candidate.split("/").every((segment) => segment && segment !== "." && segment !== "..");
}

function validateConfig(configSource, canonicalPath) {
  const lines = textOf(configSource).split(/\r?\n/);
  const heading = lines.findIndex((line) => line.trim() === "## Technical Context Document");
  if (heading === -1) return issue("missing-config-technical-context", "config is missing the ## Technical Context Document section");
  let configured = null;
  for (let index = heading + 1; index < lines.length && !/^##\s/.test(lines[index]); index += 1) {
    const match = lines[index].match(/^\*\*Path\*\*:\s*(.*?)\s*$/);
    if (match) {
      configured = scalar(match[1]);
      break;
    }
  }
  if (!configured) return issue("missing-config-technical-context-path", "config Technical Context Document path is empty");
  if (!isSafeRepositoryPath(configured)) return issue("unsafe-config-technical-context-path", `config Technical Context Document path is not safe: ${configured}`);
  if (normalizedPath(configured) !== normalizedPath(canonicalPath)) {
    return issue("config-technical-context-mismatch", `config Technical Context Document path ${configured} does not match canonical path ${canonicalPath}`, null, { expected: normalizedPath(canonicalPath), actual: normalizedPath(configured) });
  }
  return null;
}

export function parseSad(source) {
  const text = textOf(source);
  const lines = text.split(/\r?\n/);
  const frontmatter = parseFrontmatter(text);
  const document = parseDocumentSections(lines, frontmatter.bodyStart);
  const tables = {};
  const errors = [...frontmatter.errors, ...document.errors];
  for (const [name, contract] of Object.entries(TABLES)) {
    tables[name] = parseTable(document.sections[contract.section], contract.columns);
    errors.push(...tables[name].errors);
  }
  return {
    valid: errors.length === 0,
    metadata: frontmatter.metadata,
    metadataLines: frontmatter.metadataLines,
    sections: document.sections,
    headings: document.headings,
    technicalContext: parseTechnicalFields(document.sections["Technical Context"]),
    tables: Object.fromEntries(Object.entries(tables).map(([name, table]) => [name, table.rows])),
    diagrams: parseMermaid(text),
    errors,
  };
}

export function computeArchitectureDigest(source) {
  return createHash("sha256").update(textOf(source).replace(/\r\n/g, "\n").trimEnd() + "\n").digest("hex");
}

export function validateSad(source, options = {}) {
  const profile = options.profile ?? "draft";
  if (!PROFILES.has(profile)) throw new TypeError("profile must be draft or planning-ready");
  const text = textOf(source);
  const parsed = parseSad(text);
  const errors = [...parsed.errors, ...validateMetadata({ metadata: parsed.metadata, metadataLines: parsed.metadataLines }, profile)];

  for (const name of CORE_SECTIONS) {
    const section = parsed.sections[name];
    if (!section) errors.push(issue("missing-section", `missing required section ## ${name}`, null, { section: name }));
    else if (profile === "planning-ready" && !isSubstantive(section.content)) errors.push(issue("empty-section", `section ## ${name} must be substantive`, section.line, { section: name }));
  }
  for (const field of TECHNICAL_FIELDS) {
    const value = parsed.technicalContext[field];
    if (value === undefined) errors.push(issue("missing-technical-context-field", `Technical Context is missing ${field}`, parsed.sections["Technical Context"]?.line ?? null, { field }));
    else if (profile === "planning-ready" && !isSubstantive(value) && !(field === "Storage" && /^N\/?A\b/i.test(value))) errors.push(issue("empty-technical-context-field", `Technical Context field ${field} must be resolved`, parsed.sections["Technical Context"]?.line ?? null, { field }));
  }
  for (const name of CROSS_CUTTING_SECTIONS) {
    const heading = parsed.headings.find((item) => item.level === 3 && item.title === name);
    if (!heading) errors.push(issue("missing-cross-cutting-concern", `Cross-Cutting Concerns is missing ### ${name}`, parsed.sections["Cross-Cutting Concerns"]?.line ?? null, { concern: name }));
  }

  const c4Context = parsed.diagrams.filter(({ type }) => type === "C4Context");
  const c4Container = parsed.diagrams.filter(({ type }) => type === "C4Container");
  if (c4Context.length === 0) errors.push(issue("missing-c4-context", "SAD requires a Mermaid C4Context overview"));
  if (c4Container.length === 0) errors.push(issue("missing-c4-container", "SAD requires at least one Mermaid C4Container view"));
  for (const diagram of parsed.diagrams) {
    if (diagram.code.includes("\\n")) errors.push(issue("invalid-mermaid-label-break", "Mermaid labels must use <br>, never literal \\n", diagram.line));
    if (diagram.nodes > 15) errors.push(issue("diagram-node-limit", `Mermaid view has ${diagram.nodes} nodes; maximum is 15`, diagram.line, { nodes: diagram.nodes }));
  }

  const flowRows = parsed.tables.flows ?? [];
  const flowHeadings = parsed.headings.filter(({ level, title }) => level === 3 && /^FLOW-\d{3}:\s+/.test(title));
  const seenFlows = new Map();
  for (const row of flowRows) {
    const id = row.values["Flow ID"];
    if (!FLOW_ID.test(id)) errors.push(issue("invalid-flow-id", `invalid flow ID ${id || "(empty)"}; expected FLOW-###`, row.line, { id }));
    else if (seenFlows.has(id)) errors.push(issue("duplicate-flow-id", `duplicate flow ID ${id}; first seen on line ${seenFlows.get(id)}`, row.line, { id }));
    else seenFlows.set(id, row.line);
    if (row.values.Diagram !== id) errors.push(issue("flow-diagram-reference-mismatch", `flow ${id || "(empty)"} must reference its own ID in Diagram`, row.line, { id }));
    if (profile === "planning-ready") {
      for (const [column, value] of Object.entries(row.values)) {
        if (!isSubstantive(value) && !(column === "Stores" && /^N\/?A\b/i.test(value))) errors.push(issue("empty-flow-field", `flow ${id || "(empty)"} field ${column} must be resolved`, row.line, { id, field: column }));
      }
    }
  }
  const headingIds = new Map();
  for (const heading of flowHeadings) {
    const id = heading.title.match(/^(FLOW-\d{3}):/)?.[1];
    if (headingIds.has(id)) errors.push(issue("duplicate-flow-diagram", `duplicate diagram heading for ${id}`, heading.line, { id }));
    else headingIds.set(id, heading);
  }
  for (const id of seenFlows.keys()) {
    const heading = headingIds.get(id);
    if (!heading) {
      errors.push(issue("missing-flow-diagram", `flow ${id} has no matching ### ${id}: diagram heading`, seenFlows.get(id), { id }));
      continue;
    }
    const nextHeading = parsed.headings.find((item) => item.line > heading.line && item.level <= heading.level);
    const start = text.split(/\r?\n/).slice(heading.line, (nextHeading?.line ?? text.split(/\r?\n/).length + 1) - 1).join("\n");
    if (!/```mermaid\s*\n/.test(start)) errors.push(issue("missing-flow-mermaid", `flow ${id} must contain a Mermaid diagram`, heading.line, { id }));
    if (profile === "planning-ready" && !/(?:fail|error|timeout|retry|fallback|compensat|recover|unavailable|dead.?letter|replay|idempoten|backpressure)/i.test(start)) {
      errors.push(issue("missing-flow-recovery", `flow ${id} diagram or adjacent text must show failure/recovery behavior`, heading.line, { id }));
    }
  }
  for (const [id, heading] of headingIds) {
    if (!seenFlows.has(id)) errors.push(issue("orphan-flow-diagram", `diagram ${id} is not present in the Major Data Flow Catalog`, heading.line, { id }));
  }
  if (profile === "planning-ready" && flowRows.length === 0) errors.push(issue("missing-major-flow", "planning-ready SAD requires at least one major flow"));

  for (const [name, table] of Object.entries(parsed.tables)) {
    if (profile === "planning-ready" && name !== "adrs" && table.length === 0) errors.push(issue("empty-required-table", `planning-ready SAD requires at least one row in ${TABLES[name].section}`, parsed.sections[TABLES[name].section]?.line ?? null, { section: TABLES[name].section }));
  }
  const qualityRows = parsed.tables.quality ?? [];
  for (const row of qualityRows) {
    if (profile === "planning-ready" && !/(?:\d|%|zero|all|none|RTO|RPO|p\d{2})/i.test(row.values.Target)) errors.push(issue("unmeasurable-quality-target", `quality target for ${row.values.Attribute || "(empty)"} must be measurable`, row.line));
  }
  const traceableFlows = new Set((parsed.tables.traceability ?? []).flatMap((row) => row.values["Major Flow"].match(/FLOW-\d{3}/g) ?? []));
  if (profile === "planning-ready") {
    for (const id of seenFlows.keys()) if (!traceableFlows.has(id)) errors.push(issue("untraced-flow", `major flow ${id} is not referenced by Architecture Traceability`, seenFlows.get(id), { id }));
  }

  for (const row of parsed.tables.adrs ?? []) {
    const id = row.values["ADR ID"];
    if (id === "N/A") continue;
    if (!ADR_ID.test(id)) errors.push(issue("invalid-adr-id", `invalid ADR ID ${id || "(empty)"}; expected ADR-NNNN`, row.line, { id }));
    if (!ADR_STATUSES.has(row.values.Status)) errors.push(issue("invalid-adr-status", `invalid ADR status ${row.values.Status || "(empty)"}`, row.line, { id }));
    if (!/^\[[^\]]+\.md\]\(adrs\/\d{4}-[a-z0-9-]+\.md\)$/.test(row.values.File)) errors.push(issue("invalid-adr-link", `ADR ${id || "(empty)"} must link to adrs/NNNN-title.md`, row.line, { id }));
  }
  if (/^###\s+(?:Context|Decision|Consequences|Status)\s*$/m.test(parsed.sections["Architecture Decision Records"]?.content ?? "")) errors.push(issue("embedded-adr-body", "SAD must not embed full ADR decision bodies"));

  if (profile === "planning-ready") {
    for (const [index, line] of text.split(/\r?\n/).entries()) if (hasPlaceholder(line)) errors.push(issue("placeholder-content", "planning-ready SAD contains unresolved placeholder content", index + 1));
  }
  const canonicalPath = options.canonicalPath ?? "specs/sad.md";
  if (options.configSource !== undefined) {
    const configError = validateConfig(options.configSource, canonicalPath);
    if (configError) errors.push(configError);
  }

  const categories = {
    "language-runtime": Boolean(parsed.technicalContext["Language/Version"]),
    "frameworks-libraries": Boolean(parsed.technicalContext["Primary Dependencies"]),
    "storage-database": Boolean(parsed.technicalContext.Storage),
    "infrastructure-deployment": Boolean(parsed.technicalContext["Target Platform"] && parsed.sections["Deployment and Trust Topology"]),
    "architecture-patterns": Boolean(parsed.sections["System Decomposition"] && parsed.sections["Solution Strategy and Architecture Style"]),
  };
  if (profile === "planning-ready") {
    for (const [category, present] of Object.entries(categories)) if (!present) errors.push(issue("missing-downstream-category", `downstream category ${category} is incomplete`, null, { category }));
  }

  return {
    valid: errors.length === 0,
    profile,
    metadata: parsed.metadata,
    canonicalPath,
    architectureDigest: computeArchitectureDigest(text),
    categories,
    counts: {
      boundaries: parsed.tables.decomposition?.length ?? 0,
      views: parsed.tables.views?.length ?? 0,
      flows: flowRows.length,
      diagrams: parsed.diagrams.length,
      traceabilityRows: parsed.tables.traceability?.length ?? 0,
      adrs: parsed.tables.adrs?.filter((row) => row.values["ADR ID"] !== "N/A").length ?? 0,
    },
    errors,
  };
}

function parseArguments(argv) {
  const result = { sadPath: null, profile: null, configPath: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("-") && !result.sadPath) {
      result.sadPath = argument;
      continue;
    }
    if (!new Set(["--profile", "--config"]).has(argument)) throw new Error(`unknown argument: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`missing value for ${argument}`);
    result[argument === "--profile" ? "profile" : "configPath"] = value;
    index += 1;
  }
  if (!result.sadPath) throw new Error("missing SAD path");
  if (!PROFILES.has(result.profile)) throw new Error("--profile must be draft or planning-ready");
  return result;
}

async function readSafe(inputPath, option) {
  if (path.isAbsolute(inputPath) || /^[A-Za-z]:/.test(inputPath) || inputPath.includes("\\")) throw new Error(`${option} path must be a normalized repository-relative path: ${inputPath}`);
  const lexicalRoot = path.resolve(process.cwd());
  const lexicalTarget = path.resolve(lexicalRoot, inputPath);
  const relativeTarget = path.relative(lexicalRoot, lexicalTarget);
  if (relativeTarget === ".." || relativeTarget.startsWith(`..${path.sep}`) || path.isAbsolute(relativeTarget)) throw new Error(`${option} path escapes the repository: ${inputPath}`);
  try {
    const [rootReal, targetReal] = await Promise.all([realpath(lexicalRoot), realpath(lexicalTarget)]);
    const expectedReal = path.resolve(rootReal, relativeTarget);
    const realRelative = path.relative(rootReal, targetReal);
    if (targetReal !== expectedReal || realRelative === ".." || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) throw new Error(`${option} path uses a symlink or escapes the repository: ${inputPath}`);
    return await readFile(targetReal);
  } catch (error) {
    if (error.message?.startsWith(`${option} path `)) throw error;
    throw new Error(`${option} file cannot be read: ${inputPath} (${error.code ?? error.message})`);
  }
}

async function main() {
  let args;
  try {
    args = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(`Usage: node scripts/validate-sad.mjs <sad-path> --profile draft|planning-ready [--config path]\n${error.message}`);
    process.exitCode = 2;
    return;
  }
  try {
    const [source, configSource] = await Promise.all([readSafe(args.sadPath, "SAD"), args.configPath ? readSafe(args.configPath, "config") : undefined]);
    const result = validateSad(source, { profile: args.profile, canonicalPath: args.sadPath, ...(configSource === undefined ? {} : { configSource }) });
    console.log(JSON.stringify(result));
    if (!result.valid) process.exitCode = 1;
  } catch (error) {
    console.log(JSON.stringify({ valid: false, errors: [issue("file-read-error", error.message)] }));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
