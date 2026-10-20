#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { readOptional, registration, safePath } from "./lib/bootstrap-documents.mjs";

const required = ["Deployment Summary and Context", "Environment Strategy", "Deployment Targets and Packaging", "CI/CD Pipeline Design", "Infrastructure and Hosting", "Observability and Monitoring", "Reliability Engineering", "Security and Compliance in Operations", "Operational Ownership and Processes", "Deployment Decisions", "Risks, Assumptions, Constraints, and Open Questions"];

export function validateDod(source, { configSource, canonicalPath = "specs/dod.md" } = {}) {
  source = source.replace(/\r\n/g, "\n");
  const errors = [];
  const headings = [...source.matchAll(/^## (.+)$/gm)].map((match) => match[1].trim());
  for (const heading of required) {
    const start = source.indexOf(`## ${heading}`);
    if (!headings.includes(heading)) errors.push(`Missing section: ${heading}`);
    else {
      const body = source.slice(start + heading.length + 3).split(/^## /m)[0].trim();
      if (!body) errors.push(`Empty section: ${heading}`);
    }
  }
  if (new Set(headings).size !== headings.length) errors.push("Duplicate DOD sections");
  if (/\[(?:PROJECT|DATE|e\.g\.|e\.g |provider|tool\/|tooling|cadence|frameworks\/|Deployment|Rollback|e\.g)[^\]]*\]/i.test(source)) errors.push("Unresolved template example");
  const ids = [...source.matchAll(/^### (DDR-\d{3}):/gm)].map((match) => match[1]);
  if (ids.length !== new Set(ids).size) errors.push("Duplicate DDR IDs");
  for (const match of source.matchAll(/^### (DDR-\d{3}):[^\n]*\n([\s\S]*?)(?=^### DDR-|^## |$(?![\s\S]))/gm)) {
    if (!/\*\*Status\*\*:\s*(?:Proposed|Accepted|Superseded)\s*$/m.test(match[2])) errors.push(`Invalid status: ${match[1]}`);
    for (const field of ["Context", "Decision", "Rationale", "Alternatives Considered", "Tradeoffs", "Consequences"]) {
      if (!new RegExp(`\\*\\*${field}\\*\\*:\\s*\\S`).test(match[2])) errors.push(`Missing ${field}: ${match[1]}`);
    }
  }
  for (const diagram of source.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)) {
    if (/C4(?:Dynamic|Deployment)|\\n/.test(diagram[1])) errors.push("Use standard Mermaid and <br> labels");
  }
  if (configSource !== undefined && registration(configSource, "Deployment & Operations Document") !== canonicalPath) errors.push("DOD registration mismatch");
  return { valid: !errors.length, profile: "reference", certification: false, errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [file, ...args] = process.argv.slice(2);
    if (!file || (args.length && (args.length !== 2 || args[0] !== "--config"))) throw new Error("Usage: node scripts/validate-dod.mjs <dod> [--config path]");
    safePath(process.cwd(), file);
    const source = readOptional(process.cwd(), file);
    if (source === null) throw new Error(`Missing DOD: ${file}`);
    const result = validateDod(source, { canonicalPath: file, ...(args.length ? { configSource: readOptional(process.cwd(), args[1]) ?? "" } : {}) });
    console.log(JSON.stringify(result));
    if (!result.valid) process.exitCode = 1;
  } catch (error) { console.log(JSON.stringify({ valid: false, errors: [error.message] })); process.exitCode = 1; }
}
