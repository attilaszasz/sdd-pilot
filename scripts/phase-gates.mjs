import { parseRequirementOwnership } from "./parse-requirement-ownership.mjs";
import { parseStressTestFindings } from "./parse-stress-test-findings.mjs";
import { parseTasks } from "./parse-tasks.mjs";

const requiredSpecSections = {
  product: ["Problem Statement", "Scope", "User Scenarios & Testing", "Requirements", "Assumptions & Risks", "Implementation Signals", "Success Criteria"],
  technical: ["Problem Statement", "Scope", "Technical Objectives", "Requirements", "Integration Points", "Assumptions & Risks", "Implementation Signals", "Success Criteria"],
  operational: ["Problem Statement", "Scope", "Operational Objectives", "Requirements", "Integration Points", "Assumptions & Risks", "Implementation Signals", "Success Criteria"],
};
const requiredPhases = ["Setup", "Foundational", "Delivery", "Polish"];
const placeholder = /\[REPLACE:[^\]]*\]|\bTBD\b/i;

function section(source, name) {
  const match = source.match(new RegExp(`^## ${name}\\s*$([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m"));
  return match?.[1].trim() ?? "";
}

function frontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return { values: {}, issues: ["spec.md missing YAML frontmatter"] };
  const values = {};
  const issues = [];
  for (const [index, line] of match[1].split(/\r?\n/).entries()) {
    if (!line || line.startsWith("#")) continue;
    const entry = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*?)\s*$/);
    if (!entry || Object.hasOwn(values, entry[1])) issues.push(`spec.md malformed or duplicate frontmatter at line ${index + 2}`);
    else values[entry[1]] = entry[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return { values, issues };
}

function coverageRows(source) {
  const lines = source.split(/\r?\n/);
  const normalize = (value) => value.trim().toLowerCase();
  const cells = (line) => line.trim().replace(/^\||\|$/g, "").split("|").map((value) => value.trim());
  const headerIndex = lines.findIndex((line) => {
    if (!line.trim().startsWith("|")) return false;
    const header = cells(line).map(normalize);
    return (header.includes("req id") || header.includes("requirement")) && header.includes("file path(s)") && header.includes("function(s)/symbol(s)");
  });
  if (headerIndex < 0) return [];
  const header = cells(lines[headerIndex]).map(normalize);
  const index = (names) => header.findIndex((value) => names.includes(value));
  const requirement = index(["req id", "requirement"]);
  const paths = index(["file path(s)"]);
  const symbols = index(["function(s)/symbol(s)"]);
  const consumer = index(["notes", "decision", "consumer", "consumers"]);
  const rows = [];
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.trim().startsWith("|")) break;
    const row = cells(line);
    if (!/^(?:FR|TR|OR|RR)-\d{3}$/.test(row[requirement] ?? "")) continue;
    rows.push({ id: row[requirement], paths: row[paths] ?? "", symbols: row[symbols] ?? "", consumer: consumer < 0 ? "" : row[consumer] ?? "" });
  }
  return rows;
}

function values(value) {
  return value.split(/\s*(?:,|;|<br\s*\/?>)\s*/i).map((item) => item.replace(/`/g, "").split(" — ")[0].trim()).filter(Boolean);
}

function symbolName(symbol) {
  return symbol.trim().match(/^([\w$]+)/)?.[1] ?? symbol.trim();
}

function referencesDecision(source, id) {
  return new RegExp(`\\b${id}\\b`).test(source);
}

function hasExplicitDecisionNote(source, id) {
  return new RegExp(`^\\s*(?:N/A|Orphan(?:ed)?)\\s*(?::|—|-)?[^\\n]*\\b${id}\\b`, "im").test(source);
}

export function evaluateSpecGate(source, { projectPlanExists = false } = {}) {
  const text = Buffer.isBuffer(source) ? source.toString("utf8") : source;
  const metadata = frontmatter(text);
  const issues = [...metadata.issues];
  const specType = metadata.values.spec_type;
  if (!specType || !["product", "technical", "operational"].includes(specType)) issues.push("spec.md frontmatter spec_type must be product, technical, or operational");
  if (!metadata.values.spec_maturity) issues.push("spec.md frontmatter spec_maturity is missing");
  if (projectPlanExists && !metadata.values.epic_id) issues.push("spec.md frontmatter epic_id is missing");
  for (const [key, value] of Object.entries(metadata.values)) if (!value) issues.push(`spec.md frontmatter ${key} is empty`);
  for (const name of requiredSpecSections[specType] ?? []) if (!section(text, name)) issues.push(`spec.md missing or empty ${name}`);
  const scope = section(text, "Scope");
  for (const name of ["Included", "Excluded", "Edge Cases & Boundaries"]) {
    if (!new RegExp(`^### ${name}\\s*$[\\s\\S]+?(?=^### |(?![\\s\\S]))`, "m").test(scope)) issues.push(`spec.md Scope missing or empty ${name}`);
  }
  const parsed = parseRequirementOwnership(text);
  issues.push(...parsed.errors);
  const markers = (text.match(/\[NEEDS CLARIFICATION(?::[^\]]*)?\]/g) ?? []).length;
  if (markers > 3) issues.push(`unresolved clarification marker count ${markers} exceeds 3`);
  const findings = parseStressTestFindings(text);
  issues.push(...findings.errors.map(({ line, message }) => line ? `line ${line}: ${message}` : message));
  if (findings.definitions.some(({ severity, resolution }) => ["CRITICAL", "HIGH"].includes(severity) && resolution === "unresolved")) issues.push("unresolved CRITICAL/HIGH stress-test finding");
  const workItems = [...text.matchAll(/^### (?:User Story|Objective) (\d+) - .+ \(Priority: (P\d+)\)\s*$/gm)].map(([, id, priority]) => `${specType === "product" ? "US" : "OBJ"}${id}:${priority}`);
  for (const item of workItems.filter((item) => item.endsWith(":P1"))) {
    const owner = item.split(":")[0];
    if (!new RegExp(`^SC-\\d{3} \\[${owner}\\]: .+`, "m").test(section(text, "Success Criteria"))) issues.push(`P1 work item ${owner} has no success criterion`);
  }
  return { valid: issues.length === 0, issues: [...new Set(issues)], p1RequirementIds: parsed.p1RequirementIds };
}

export function evaluatePlanGate(source, p1RequirementIds) {
  const text = Buffer.isBuffer(source) ? source.toString("utf8") : source;
  const issues = [];
  for (const heading of ["Instructions Check", "Technical Context", "Requirement Coverage Map", "Acceptance Test Stubs"]) if (!section(text, heading)) issues.push(`plan.md missing or empty ${heading}`);
  if (Buffer.byteLength(text) > 10240) issues.push("plan.md exceeds 10 KB");
  if (placeholder.test(text)) issues.push("plan.md contains a placeholder");
  const coverageSection = section(text, "Requirement Coverage Map");
  const rows = coverageRows(coverageSection);
  const coverage = new Map(rows.map((row) => [row.id, row]));
  for (const id of p1RequirementIds) {
    const row = coverage.get(id);
    if (!row) issues.push(`plan.md has no concrete coverage row for ${id}`);
    else if (!row.paths || /^(?:—|-|N\/A)$/i.test(row.paths) || placeholder.test(row.paths)) issues.push(`plan.md has no concrete file path for ${id}`);
    else if (!row.symbols || /^(?:—|-|N\/A)$/i.test(row.symbols) || placeholder.test(row.symbols)) issues.push(`plan.md has no concrete symbol for ${id}`);
  }
  const decisions = [...section(text, "Architecture Decisions").matchAll(/^\|\s*(AD-\d{3})\s*\|/gm)].map(([, id]) => id);
  if (!decisions.length && !/^N\/A\s+—\s+\S/m.test(section(text, "Architecture Decisions"))) issues.push("plan.md has no Architecture Decisions row or N/A reason");
  if (new Set(decisions).size !== decisions.length) issues.push("plan.md has duplicate architecture decision IDs");
  const coverageConsumers = rows.map((row) => row.consumer).join("\n");
  const projectStructure = section(text, "Project Structure");
  const decisionNotes = section(text, "Architecture Decisions");
  for (const id of new Set(decisions)) {
    if (!referencesDecision(coverageConsumers, id) && !referencesDecision(projectStructure, id) && !hasExplicitDecisionNote(decisionNotes, id)) {
      issues.push(`orphaned architecture decision ${id}: add it to a coverage-map consumer, Project Structure, or an explicit N/A/orphan note`);
    }
  }
  return { valid: issues.length === 0, issues: [...new Set(issues)] };
}

export function evaluateTasksGate(source, p1RequirementIds) {
  const text = Buffer.isBuffer(source) ? source.toString("utf8") : source;
  const parsed = parseTasks(text);
  const issues = parsed.errors.map(({ line, message }) => `line ${line}: ${message}`);
  if (parsed.taskCount === 0) issues.push("tasks.md has no parsed tasks");
  if (Buffer.byteLength(text) > 6144) issues.push("tasks.md exceeds 6 KB");
  for (const id of p1RequirementIds) if (!parsed.tasks.some((task) => task.requirements.includes(id))) issues.push(`tasks.md has no task for ${id}`);
  const ids = new Set(parsed.tasks.map((task) => task.id));
  for (const task of parsed.tasks) for (const dependency of task.dependencies) if (!ids.has(dependency)) issues.push(`tasks.md dependency ${dependency} does not exist`);
  const graph = new Map(parsed.tasks.map((task) => [task.id, task.dependencies]));
  const active = new Set(); const done = new Set();
  const visit = (id) => { if (active.has(id)) return true; if (done.has(id)) return false; active.add(id); const cycle = (graph.get(id) ?? []).some((dependency) => graph.has(dependency) && visit(dependency)); active.delete(id); done.add(id); return cycle; };
  if ([...graph.keys()].some(visit)) issues.push("tasks.md has a circular after: chain");
  const allPhases = [...text.matchAll(/^## Phase \d+: (.+?)\s*$/gm)].map(([, name]) => name);
  const phases = allPhases.filter((name) => requiredPhases.some((phase) => name.startsWith(phase)));
  if (allPhases.length !== phases.length) issues.push("tasks.md has invalid phase structure");
  let previous = -1;
  for (const phase of phases) { const index = requiredPhases.findIndex((name) => phase.includes(name)); if (index < previous) issues.push("tasks.md has invalid phase structure"); previous = index; }
  for (const phase of requiredPhases) {
    const heading = phases.find((name) => name.includes(phase));
    if (heading && !parsed.tasks.some((task) => task.phase?.includes(heading))) issues.push(`tasks.md has empty ${phase} phase`);
  }
  for (const phase of phases.filter((name) => name.includes("Delivery"))) if (!/\[(?:US|OBJ)\d+\]/.test(phase)) issues.push("tasks.md delivery phase lacks work-item tag");
  const numbers = parsed.tasks.map((task) => Number(task.id.slice(1))).sort((a, b) => a - b);
  if (numbers.some((number, index) => number !== index + 1)) issues.push("tasks.md task IDs are not sequential");
  return { valid: issues.length === 0, issues: [...new Set(issues)] };
}

export function evaluateCheckedTaskProvenance(specSource, planSource, tasksSource) {
  const requirements = new Set(parseRequirementOwnership(specSource).requirements.map(({ id }) => id));
  const coverage = new Map(coverageRows(Buffer.isBuffer(planSource) ? planSource.toString("utf8") : planSource).map((row) => [row.id, row]));
  const parsed = parseTasks(tasksSource);
  const issues = [];
  const tasks = new Map(parsed.tasks.map((task) => [task.id, task]));

  for (const task of parsed.tasks.filter(({ status }) => status === "completed")) {
    const taskRequirements = [...new Set([...task.requirements, task.completesRequirement].filter(Boolean))];
    for (const id of taskRequirements) {
      if (!requirements.has(id)) {
        issues.push(`checked ${task.id} references removed requirement ${id}`);
        continue;
      }
      const row = coverage.get(id);
      if (!row) {
        issues.push(`checked ${task.id} has no current coverage row for ${id}`);
        continue;
      }
      if (task.filePath && !values(row.paths).includes(task.filePath)) issues.push(`checked ${task.id} path ${task.filePath} no longer matches coverage for ${id}`);
      if (task.exports.length > 0) {
        const expectedSymbols = new Set(values(row.symbols).map(symbolName));
        for (const exported of task.exports) if (!expectedSymbols.has(symbolName(exported))) issues.push(`checked ${task.id} export ${symbolName(exported)} no longer matches coverage for ${id}`);
      }
    }
    for (const dependency of task.dependencies) {
      const prerequisite = tasks.get(dependency);
      if (!prerequisite || prerequisite.status !== "completed") issues.push(`checked ${task.id} depends on incomplete ${dependency}`);
    }
    for (const imported of task.imports.filter(({ sourceTask }) => sourceTask !== "plan")) {
      const producer = tasks.get(imported.sourceTask);
      if (!producer) continue;
      const producerExports = new Set(producer.exports.map(symbolName));
      for (const symbol of imported.symbols) if (!producerExports.has(symbolName(symbol))) issues.push(`checked ${task.id} imports ${symbolName(symbol)} not exported by ${producer.id}`);
    }
  }
  return { valid: issues.length === 0, issues: [...new Set(issues)] };
}
