#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const TASK_ID = /^T\d{3}$/;
const REQUIREMENT_ID = /^(?:FR|TR|OR|RR)-\d{3}$/;
const FINDING_TYPES = new Set(["tentative"]);
const FIELDS = ["version", "task", "requirements", "type", "evidence", "paths"];

function error(line, code, message, source) {
  return { line, code, message, source };
}

function validPath(value) {
  return typeof value === "string"
    && value.length > 0
    && value !== "."
    && !value.startsWith("/")
    && !value.startsWith("\\")
    && !/^[A-Za-z]:[\\/]/.test(value)
    && !/[\r\n]/.test(value)
    && !value.split(/[\\/]/).includes("..");
}

function validateStringArray(value, predicate) {
  return Array.isArray(value)
    && new Set(value).size === value.length
    && value.every(predicate);
}

export function serializeReviewFinding(finding) {
  const result = parseReviewFindings(`${JSON.stringify(finding)}\n`);
  if (!result.valid) throw new TypeError(result.errors[0].message);
  return `${JSON.stringify(result.findings[0])}\n`;
}

export function parseReviewFindings(input) {
  const text = Buffer.isBuffer(input) ? input.toString("utf8") : String(input);
  const errors = [];
  const findings = [];
  const lines = text.split(/\r?\n/);

  for (const [index, source] of lines.entries()) {
    const line = index + 1;
    if (source.trim() === "") continue;

    let finding;
    try {
      finding = JSON.parse(source);
    } catch {
      errors.push(error(line, "invalid-json", "entry must be one JSON object on one line", source));
      continue;
    }

    if (!finding || Array.isArray(finding) || typeof finding !== "object") {
      errors.push(error(line, "invalid-entry", "entry must be a JSON object", source));
      continue;
    }

    const keys = Object.keys(finding);
    if (keys.length !== FIELDS.length || FIELDS.some((field) => !keys.includes(field))) {
      errors.push(error(line, "invalid-fields", `entry must contain exactly: ${FIELDS.join(", ")}`, source));
      continue;
    }
    if (finding.version !== 1) errors.push(error(line, "unsupported-version", `unsupported review finding version: ${JSON.stringify(finding.version)}`, source));
    if (!TASK_ID.test(finding.task)) errors.push(error(line, "invalid-task", "task must match T###", source));
    if (!validateStringArray(finding.requirements, (value) => REQUIREMENT_ID.test(value))) {
      errors.push(error(line, "invalid-requirements", "requirements must be a unique array of requirement IDs", source));
    }
    if (!FINDING_TYPES.has(finding.type)) errors.push(error(line, "invalid-type", `unsupported review finding type: ${JSON.stringify(finding.type)}`, source));
    if (typeof finding.evidence !== "string" || finding.evidence.trim() === "" || /[\r\n]/.test(finding.evidence)) {
      errors.push(error(line, "invalid-evidence", "evidence must be a non-empty single-line string", source));
    }
    if (!validateStringArray(finding.paths, validPath)) {
      errors.push(error(line, "invalid-paths", "paths must be a unique array of repository-relative paths without '..' segments", source));
    }

    if (!errors.some((entry) => entry.line === line)) {
      const canonical = Object.fromEntries(FIELDS.map((field) => [field, finding[field]]));
      if (source !== JSON.stringify(canonical)) {
        errors.push(error(line, "noncanonical-entry", "entry must use canonical JSON field order without duplicate keys or extra whitespace", source));
      } else {
        findings.push(canonical);
      }
    }
  }

  if (findings.length === 0 && errors.length === 0) {
    errors.push(error(1, "empty-file", "review findings file has no entries", ""));
  }

  const valid = errors.length === 0;
  return { valid, version: 1, findingCount: valid ? findings.length : 0, findings: valid ? findings : [], errors };
}

async function main() {
  const findingsPath = process.argv[2];
  if (!findingsPath) {
    console.error("Usage: node .github/skills/quality-control/scripts/parse-review-findings.mjs <.review-findings>");
    process.exitCode = 2;
    return;
  }
  const result = parseReviewFindings(await readFile(findingsPath));
  console.log(JSON.stringify(result));
  if (!result.valid) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((cause) => {
    console.error(cause.message);
    process.exitCode = 1;
  });
}
