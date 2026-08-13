#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const TASK_ID = /^T\d{3}$/;
const REQUIREMENT_ID = /^(?:FR|TR|OR|RR)-\d{3}$/;
const WORK_ITEM = /^(?:US|OBJ)\d+$/;
const BUG_SEVERITIES = new Set(["CRITICAL", "ERROR", "WARNING"]);
const BUG_CATEGORIES = new Set(["test-failure", "lint-error", "security-vuln", "coverage-gap", "requirement-gap", "pi-violation", "runtime-error"]);

function error(line, code, message, source) {
  return { line, code, message, source };
}

function splitList(value) {
  const items = [];
  let depth = 0;
  let start = 0;
  for (const [index, character] of [...value].entries()) {
    if (character === "(") depth += 1;
    else if (character === ")" && depth > 0) depth -= 1;
    else if (character === "," && depth === 0) {
      items.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  items.push(value.slice(start).trim());
  return items.filter(Boolean);
}

function extractFilePath(description) {
  return description.match(/(?:^|\s)([\w.@-]+(?:\/[\w.@-]+)+\.[A-Za-z0-9]+)(?::\d+)?(?:\s|$)/)?.[1] ?? null;
}

function parseAnnotations(rest, lineNumber, source, errors) {
  const requirements = [];
  const dependencies = [];
  const imports = [];
  const exports = [];
  const verify = [];
  let parallel = false;
  let workItem = null;
  let completesRequirement = null;
  let bugSeverity = null;
  let bugCategory = null;
  const modifiers = [];

  const consumeLeading = (pattern, handler) => {
    const match = rest.match(pattern);
    if (!match) return false;
    handler(match);
    rest = rest.slice(match[0].length).trimStart();
    return true;
  };

  if (consumeLeading(/^\[BUG:([^\]]+)\]\s*/, (match) => {
    bugSeverity = match[1];
    if (!BUG_SEVERITIES.has(bugSeverity)) errors.push(error(lineNumber, "invalid-bug-severity", `invalid bug severity ${bugSeverity}`, source));
  })) {
    while (consumeLeading(/^\[(RECURRING|ESCALATED|DEFERRED)\]\s*/, (match) => modifiers.push(match[1]))) {}
    for (const modifier of new Set(modifiers.filter((value, index) => modifiers.indexOf(value) !== index))) {
      errors.push(error(lineNumber, "duplicate-bug-modifier", `duplicate bug modifier ${modifier}`, source));
    }
  } else {
    consumeLeading(/^\[P\]\s*/, () => { parallel = true; });
    consumeLeading(/^\[((?:US|OBJ)\d+)\]\s*/, (match) => { workItem = match[1]; });
  }

  const leadingAnnotation = rest.match(/^(\[[^\]]+\]|\{[^}]*\})/);
  if (leadingAnnotation && !/^\[COMPLETES\s/.test(leadingAnnotation[1]) && !/^\{/.test(leadingAnnotation[1])) {
    const value = leadingAnnotation[1].slice(1, -1);
    if (/^(?:US|OBJ)/.test(value) && !WORK_ITEM.test(value)) errors.push(error(lineNumber, "invalid-work-item", `invalid work-item annotation ${leadingAnnotation[1]}`, source));
    else if (value.startsWith("BUG:")) errors.push(error(lineNumber, "invalid-bug-annotation", `invalid bug annotation ${leadingAnnotation[1]}`, source));
    else if (value.startsWith("P")) errors.push(error(lineNumber, "invalid-parallel-annotation", `invalid parallel annotation ${leadingAnnotation[1]}`, source));
    else errors.push(error(lineNumber, "invalid-annotation", `invalid task annotation ${leadingAnnotation[1]}`, source));
  } else if (/^(?:\[(?:P|US|OBJ|BUG:|COMPLETES|VERIFY:)|\{(?:FR|TR|OR|RR)-)/.test(rest) && !leadingAnnotation) {
    errors.push(error(lineNumber, "invalid-annotation", "unterminated task annotation", source));
  }

  consumeLeading(/^\{([^}]*)\}\s*/, (match) => {
    const ids = splitList(match[1]);
    if (ids.length === 0 || ids.some((id) => !REQUIREMENT_ID.test(id))) {
      errors.push(error(lineNumber, "invalid-requirements", `invalid requirement annotation {${match[1]}}`, source));
    } else requirements.push(...ids);
  });

  consumeLeading(/^\[COMPLETES\s+([^\]]+)\]\s*/, (match) => {
    completesRequirement = match[1];
    if (!REQUIREMENT_ID.test(completesRequirement)) errors.push(error(lineNumber, "invalid-completes", `invalid COMPLETES annotation ${match[0].trim()}`, source));
  });

  if (bugSeverity) {
    const category = rest.match(/^\[([^\]]+)\]\s*/);
    if (category) {
      bugCategory = category[1];
      rest = rest.slice(category[0].length);
      if (!BUG_CATEGORIES.has(bugCategory)) errors.push(error(lineNumber, "invalid-bug-category", `invalid bug category ${bugCategory}`, source));
    } else errors.push(error(lineNumber, "missing-bug-category", "BUG task must include a category", source));
  }

  rest = rest.replace(/\bafter:([^\s\[\]←→]+)/g, (segment, value) => {
    const ids = splitList(value);
    if (ids.length === 0 || ids.some((id) => !TASK_ID.test(id))) errors.push(error(lineNumber, "invalid-dependency", `invalid dependency annotation ${segment}`, source));
    else dependencies.push(...ids);
    return " ";
  });

  rest = rest.replace(/←\s*([^\s:]+):([^\[→←]+?)(?=\s+(?:→|←|\[VERIFY:)|$)/g, (segment, sourceTask, symbolsText) => {
    const symbols = splitList(symbolsText.trim());
    if ((sourceTask !== "plan" && !TASK_ID.test(sourceTask)) || symbols.length === 0) {
      errors.push(error(lineNumber, "invalid-import", `invalid import annotation ${segment.trim()}`, source));
    } else if (sourceTask === "plan" && (symbols.length !== 1 || symbols[0] !== "AcceptanceTestStubs")) {
      errors.push(error(lineNumber, "invalid-import", `invalid plan import annotation ${segment.trim()}`, source));
    } else imports.push({ sourceTask, filePath: null, symbols });
    return " ";
  });

  rest = rest.replace(/→\s*exports:\s*([^\[←→]+?)(?=\s+(?:←|→|\[VERIFY:)|$)/g, (segment, symbolsText) => {
    const symbols = splitList(symbolsText.trim());
    if (symbols.length === 0) errors.push(error(lineNumber, "invalid-export", `invalid export annotation ${segment.trim()}`, source));
    else exports.push(...symbols);
    return " ";
  });

  rest = rest.replace(/\[VERIFY:\s*([^\]]*)\]/g, (segment, command) => {
    if (!command.trim()) errors.push(error(lineNumber, "invalid-verify", "VERIFY command must be non-empty", source));
    else verify.push(command.trim());
    return " ";
  });

  if (/\bafter:/.test(rest)) errors.push(error(lineNumber, "invalid-dependency", "malformed dependency annotation", source));
  if (rest.includes("←")) errors.push(error(lineNumber, "invalid-import", "malformed import annotation", source));
  if (rest.includes("→")) errors.push(error(lineNumber, "invalid-export", "malformed export annotation", source));
  if (rest.includes("[VERIFY:")) errors.push(error(lineNumber, "invalid-verify", "unterminated VERIFY annotation", source));

  const description = rest.replace(/\s+/g, " ").trim();
  if (!description) errors.push(error(lineNumber, "missing-description", "task description must be non-empty", source));

  return {
    parallel,
    bugSeverity,
    bugCategory,
    modifiers,
    deferred: modifiers.includes("DEFERRED"),
    workItem,
    story: workItem?.startsWith("US") ? workItem : null,
    objective: workItem?.startsWith("OBJ") ? workItem : null,
    filePath: extractFilePath(description),
    requirements,
    completesRequirement,
    dependencies,
    imports,
    exports,
    verify,
    description,
  };
}

export function parseTasks(source) {
  const text = Buffer.isBuffer(source) ? source.toString("utf8") : source;
  const tasks = [];
  const errors = [];
  let phase = null;

  for (const [index, sourceLine] of text.split(/\r?\n/).entries()) {
    const lineNumber = index + 1;
    const heading = sourceLine.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      phase = heading[1];
      continue;
    }

    const candidate = /^\s*-\s*\[[^\r\n]*?\b[tT]\d+\b/.test(sourceLine);
    if (!candidate) continue;

    const checkbox = sourceLine.match(/^- \[( |X)\] (\S+)(?:\s+(.*))?$/);
    if (!checkbox) {
      errors.push(error(lineNumber, "invalid-checkbox", "invalid checkbox; task must start with - [ ], - [X], or - [x]", sourceLine));
      continue;
    }

    const [, state, id, annotationText = ""] = checkbox;
    if (!TASK_ID.test(id)) {
      errors.push(error(lineNumber, "invalid-task-id", `invalid task ID ${id}; expected T###`, sourceLine));
      continue;
    }

    const parsed = parseAnnotations(annotationText, lineNumber, sourceLine, errors);
    tasks.push({
      id,
      status: state === " " ? "pending" : "completed",
      ...parsed,
      phase,
      _line: lineNumber,
    });
  }

  const seen = new Map();
  for (const task of tasks) {
    if (seen.has(task.id)) errors.push(error(task._line, "duplicate-task-id", `duplicate task ID ${task.id}; first seen on line ${seen.get(task.id)}`, text.split(/\r?\n/)[task._line - 1]));
    else seen.set(task.id, task._line);
  }

  if (tasks.length > 40) {
    const task = tasks[40];
    errors.push(error(task._line, "task-limit", `task count ${tasks.length} exceeds the maximum of 40`, text.split(/\r?\n/)[task._line - 1]));
  }

  const paths = new Map(tasks.map((task) => [task.id, task.filePath]));
  for (const task of tasks) {
    for (const item of task.imports) {
      if (item.sourceTask !== "plan") item.filePath = paths.get(item.sourceTask) ?? null;
    }
  }

  const publicTasks = tasks.map(({ _line, ...task }) => task);
  return { valid: errors.length === 0, taskCount: publicTasks.length, tasks: publicTasks, errors };
}

async function main() {
  const tasksPath = process.argv[2];
  if (!tasksPath) {
    console.error("Usage: node scripts/parse-tasks.mjs <tasks.md>");
    process.exitCode = 2;
    return;
  }
  const result = parseTasks(await readFile(tasksPath));
  console.log(JSON.stringify(result));
  if (!result.valid) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((cause) => {
    console.error(cause.message);
    process.exitCode = 1;
  });
}
