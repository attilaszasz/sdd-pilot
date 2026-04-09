#!/usr/bin/env node

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publicCommands } from "./lib/public-commands.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const DEFAULT_OUTPUT = path.join(repoRoot, ".build", "drift-report");
const DEFAULT_GEMINI_OUTPUT = path.join(repoRoot, ".build", "sdd-pilot");

const FAILING_STATUSES = new Set(["missing", "stale-reference", "normalized-drift", "generated-mismatch", "unsupported-extra"]);
const OK_STATUS = "in-sync";
const NA_STATUS = "n/a";

const workflowSurfaces = [
  {
    key: "claude",
    label: "Claude",
    pathFor(command) {
      return path.join(repoRoot, ".claude", "skills", command.command, "SKILL.md");
    },
    expectedMode: "task-tool-subagent",
    requiresInput: false,
    requiresAutopilot: false,
    requiresProgress: true,
  },
  {
    key: "agentsSkill",
    label: "Agents Skill",
    pathFor(command) {
      return path.join(repoRoot, ".agents", "skills", command.command, "SKILL.md");
    },
    expectedMode: "read-agent-file",
    requiresInput: true,
    requiresAutopilot: true,
    requiresProgress: true,
  },
  {
    key: "agentsWorkflow",
    label: "Agents Workflow",
    pathFor(command) {
      return path.join(repoRoot, ".agents", "workflows", `${command.command}.md`);
    },
    expectedMode: "read-agent-file",
    requiresInput: true,
    requiresAutopilot: false,
    requiresProgress: true,
  },
  {
    key: "openCodeCommand",
    label: "OpenCode Command",
    pathFor(command) {
      return path.join(repoRoot, ".opencode", "commands", `${command.command}.md`);
    },
    expectedMode: "invoke-subagent",
    requiresInput: true,
    requiresAutopilot: false,
    requiresProgress: true,
    requiresAgentReference: true,
  },
  {
    key: "windsurf",
    label: "Windsurf",
    pathFor(command) {
      return path.join(repoRoot, ".windsurf", "workflows", `${command.command}.md`);
    },
    expectedMode: "read-agent-file",
    requiresInput: true,
    requiresAutopilot: false,
    requiresProgress: true,
  },
  {
    key: "gemini",
    label: "Gemini Built",
    pathFor(command, options) {
      return path.join(options.geminiOutput, "skills", command.skill, "SKILL.md");
    },
    commandPathFor(command, options) {
      return path.join(options.geminiOutput, "commands", `${command.command}.toml`);
    },
    expectedMode: "read-agent-file",
    requiresInput: true,
    requiresAutopilot: false,
    requiresProgress: true,
    peerSurface: "agentsWorkflow",
    generated: true,
  },
];

const opencodeAgentSurface = {
  key: "openCodeAgent",
  label: "OpenCode Agent",
  dir: path.join(repoRoot, ".opencode", "agents"),
};

const codexAgentSurface = {
  key: "codex",
  label: "Codex",
  dir: path.join(repoRoot, ".codex", "agents"),
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.output, { recursive: true });

  const workflowRows = await buildWorkflowRows(options);
  const agentRows = await buildAgentRows();
  const extras = await collectExtras(options, workflowRows, agentRows);

  const report = buildReport(options, workflowRows, agentRows, extras);
  await writeOutputs(options.output, report);

  const failureCount = report.findings.filter((finding) => FAILING_STATUSES.has(finding.status)).length;
  console.log(`Drift report written to ${path.relative(repoRoot, options.output)}`);
  console.log(`Workflow rows: ${workflowRows.length}`);
  console.log(`Agent rows: ${agentRows.length}`);
  console.log(`Findings: ${report.findings.length}`);

  if (options.strict && failureCount > 0) {
    throw new Error(`Drift detected: ${failureCount} failing finding(s)`);
  }
}

function parseArgs(argv) {
  const options = {
    output: DEFAULT_OUTPUT,
    geminiOutput: DEFAULT_GEMINI_OUTPUT,
    strict: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output") {
      const value = argv[index + 1];
      if (!value) throw new Error("Missing value for --output");
      options.output = path.resolve(value);
      index += 1;
      continue;
    }
    if (arg === "--gemini-output") {
      const value = argv[index + 1];
      if (!value) throw new Error("Missing value for --gemini-output");
      options.geminiOutput = path.resolve(value);
      index += 1;
      continue;
    }
    if (arg === "--strict") {
      options.strict = true;
      continue;
    }
    if (arg === "--no-strict") {
      options.strict = false;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function buildWorkflowRows(options) {
  const rows = [];

  for (const command of publicCommands) {
    const canonicalPath = path.join(repoRoot, ".github", "skills", command.skill, "SKILL.md");
    const canonicalContent = await readRequiredText(canonicalPath, `canonical skill ${command.skill}`);
    const canonicalParse = parseWorkflowDocument(canonicalContent, { canonicalizeBundlePaths: false });

    const baselinePath = path.join(repoRoot, ".agents", "workflows", `${command.command}.md`);
    const baselineDocument = await parseWorkflowSurfaceFile(baselinePath);
    const expectedDelegates = baselineDocument.exists
      ? baselineDocument.delegates
      : extractCanonicalDelegateIds(canonicalContent);

    const row = {
      id: command.command,
      title: command.command,
      canonicalSkill: command.skill,
      canonicalPath: relativePath(canonicalPath),
      canonicalTarget: `.github/skills/${command.skill}/SKILL.md`,
      canonicalDelegates: expectedDelegates,
      surfaces: {},
    };

    for (const surface of workflowSurfaces) {
      const filePath = surface.pathFor(command, options);
      const document = await parseWorkflowSurfaceFile(filePath);
      const geminiCommand = surface.generated ? await parseGeminiCommandFile(surface.commandPathFor(command, options)) : null;
      const evaluation = evaluateWorkflowSurface({
        surface,
        document,
        baselineDocument,
        geminiCommand,
        command,
        row,
      });
      row.surfaces[surface.key] = evaluation;
    }

    rows.push(row);
  }

  return rows;
}

async function buildAgentRows() {
  const canonicalAgentFiles = (await listFiles(path.join(repoRoot, ".github", "agents"))).filter((file) => file.endsWith(".md")).sort();
  const openCodeAgents = await loadOpenCodeAgents();
  const codexAgents = await loadCodexAgents();
  const rows = [];

  for (const filePath of canonicalAgentFiles) {
    const content = await readRequiredText(filePath, `canonical agent ${filePath}`);
    const canonical = parseAgentDocument(content, filePath);
    const row = {
      id: canonical.id,
      title: canonical.id,
      canonicalPath: relativePath(filePath),
      canonical: canonical.summary,
      surfaces: {},
    };

    const openCodeWrapper = matchOpenCodeAgent(openCodeAgents, canonical);
    row.surfaces.openCodeAgent = evaluateAgentSurface({
      surfaceKey: opencodeAgentSurface.key,
      label: opencodeAgentSurface.label,
      wrapper: openCodeWrapper,
      canonical,
      expected: "required",
    });

    if (canonical.kind === "methodology") {
      const codexWrapper = matchCodexAgent(codexAgents, canonical);
      row.surfaces.codex = evaluateAgentSurface({
        surfaceKey: codexAgentSurface.key,
        label: codexAgentSurface.label,
        wrapper: codexWrapper,
        canonical,
        expected: "required",
      });
    } else {
      row.surfaces.codex = {
        status: NA_STATUS,
        label: codexAgentSurface.label,
        filePath: null,
        details: ["No Codex workflow-agent wrapper expected"],
      };
    }

    rows.push(row);
  }

  return rows;
}

function evaluateWorkflowSurface({ surface, document, baselineDocument, geminiCommand, command, row }) {
  const details = [];

  if (!document.exists) {
    return {
      status: surface.generated ? "generated-mismatch" : "missing",
      label: surface.label,
      filePath: relativePath(document.filePath),
      details: [surface.generated ? "Generated Gemini skill bundle is missing" : "Expected wrapper file is missing"],
    };
  }

  if (document.targetSkill !== row.canonicalTarget) {
    details.push(`Expected ${row.canonicalTarget}, found ${document.targetSkill || "none"}`);
    return {
      status: surface.generated ? "generated-mismatch" : "stale-reference",
      label: surface.label,
      filePath: relativePath(document.filePath),
      details,
    };
  }

  if (surface.key !== "openCodeCommand") {
    const expectedDelegates = row.canonicalDelegates;
    const missingDelegates = expectedDelegates.filter((delegateId) => !document.delegates.includes(delegateId));
    const extraDelegates = document.delegates.filter((delegateId) => !expectedDelegates.includes(delegateId));
    if (missingDelegates.length > 0 || extraDelegates.length > 0) {
      if (missingDelegates.length > 0) details.push(`Missing delegates: ${missingDelegates.join(", ")}`);
      if (extraDelegates.length > 0) details.push(`Unexpected delegates: ${extraDelegates.join(", ")}`);
      return {
        status: "stale-reference",
        label: surface.label,
        filePath: relativePath(document.filePath),
        details,
      };
    }
  }

  const contractIssues = validateWorkflowContract(surface, document);
  if (contractIssues.length > 0) {
    return {
      status: surface.generated ? "generated-mismatch" : "normalized-drift",
      label: surface.label,
      filePath: relativePath(document.filePath),
      details: contractIssues,
    };
  }

  if (surface.generated) {
    if (!geminiCommand?.exists) {
      return {
        status: "generated-mismatch",
        label: surface.label,
        filePath: relativePath(document.filePath),
        details: ["Generated Gemini command TOML is missing"],
      };
    }
    if (geminiCommand.skill !== command.skill) {
      return {
        status: "generated-mismatch",
        label: surface.label,
        filePath: relativePath(document.filePath),
        details: [`Expected Gemini command prompt to reference ${command.skill}, found ${geminiCommand.skill || "none"}`],
      };
    }
  }

  if (surface.peerSurface && baselineDocument.exists) {
    const baselineComparable = baselineDocument.normalizedComparable;
    if (document.normalizedComparable !== baselineComparable) {
      return {
        status: surface.generated ? "generated-mismatch" : "normalized-drift",
        label: surface.label,
        filePath: relativePath(document.filePath),
        details: [`Normalized body diverges from ${workflowSurfaces.find((item) => item.key === surface.peerSurface)?.label || surface.peerSurface}`],
      };
    }
  }

  return {
    status: OK_STATUS,
    label: surface.label,
    filePath: relativePath(document.filePath),
    details: [],
  };
}

function validateWorkflowContract(surface, document) {
  const issues = [];

  if (!document.hasLoadWorkflowLine) {
    issues.push("Missing canonical workflow load instruction");
  }
  if (surface.key !== "openCodeCommand" && document.delegates.length > 0 && document.delegationMode !== surface.expectedMode) {
    issues.push(`Expected delegation mode ${surface.expectedMode}, found ${document.delegationMode || "none"}`);
  }
  if (surface.requiresAgentReference && !document.agentReference) {
    issues.push("Missing OpenCode agent reference");
  }

  return issues;
}

function evaluateAgentSurface({ wrapper, canonical, expected }) {
  if (expected === "required" && !wrapper) {
    return {
      status: "missing",
      filePath: null,
      details: ["Expected wrapper is missing"],
    };
  }
  if (!wrapper) {
    return {
      status: NA_STATUS,
      filePath: null,
      details: ["No wrapper expected"],
    };
  }

  const details = [];
  if (canonical.kind === "methodology") {
    if (wrapper.targetAgent !== canonical.targetAgent) {
      details.push(`Expected ${canonical.targetAgent}, found ${wrapper.targetAgent || "none"}`);
    }
    if (wrapper.kind !== "methodology") {
      details.push(`Expected methodology wrapper, found ${wrapper.kind}`);
    }
  } else {
    if (wrapper.targetSkill !== canonical.targetSkill) {
      details.push(`Expected ${canonical.targetSkill}, found ${wrapper.targetSkill || "none"}`);
    }
    const missingDelegates = canonical.delegates.filter((delegateId) => !wrapper.delegates.includes(delegateId));
    const extraDelegates = wrapper.delegates.filter((delegateId) => !canonical.delegates.includes(delegateId));
    if (missingDelegates.length > 0) {
      details.push(`Missing delegates: ${missingDelegates.join(", ")}`);
    }
    if (extraDelegates.length > 0) {
      details.push(`Unexpected delegates: ${extraDelegates.join(", ")}`);
    }
  }

  if (wrapper.modeIssue) {
    details.push(wrapper.modeIssue);
  }

  return {
    status: details.length === 0 ? OK_STATUS : wrapper.surfaceKey === "codex" ? "stale-reference" : "normalized-drift",
    filePath: relativePath(wrapper.filePath),
    details,
  };
}

async function collectExtras(options, workflowRows, agentRows) {
  const findings = [];

  for (const surface of workflowSurfaces.filter((item) => !item.generated)) {
    const expectedFiles = new Set(publicCommands.map((command) => relativePath(surface.pathFor(command, options))));
    const actualFiles = (await listFiles(path.dirname(surface.pathFor(publicCommands[0], options)))).map(relativePath);
    for (const filePath of actualFiles) {
      if (!expectedFiles.has(filePath)) {
        findings.push({
          status: "unsupported-extra",
          scope: "workflow",
          surface: surface.label,
          row: path.basename(filePath),
          filePath,
          detail: "Unexpected wrapper file present",
        });
      }
    }
  }

  const expectedOpenCodeAgents = new Set(agentRows.map((row) => row.surfaces.openCodeAgent.filePath).filter(Boolean));
  for (const fullPath of await listFiles(opencodeAgentSurface.dir)) {
    const filePath = relativePath(fullPath);
    if (!expectedOpenCodeAgents.has(filePath)) {
      const content = await readFile(fullPath, "utf8");
      const parsed = parseWorkflowDocument(content, { canonicalizeBundlePaths: false });
      const knownSkillTarget = parsed.targetSkill && publicCommands.some((command) => `.github/skills/${command.skill}/SKILL.md` === parsed.targetSkill);
      const knownMethodologyTarget = /Read and follow the methodology in `\.github\/agents\/_/.test(content);
      if (knownSkillTarget || knownMethodologyTarget) {
        continue;
      }
      findings.push({
        status: "unsupported-extra",
        scope: "agent",
        surface: opencodeAgentSurface.label,
        row: path.basename(filePath),
        filePath,
        detail: "Unexpected agent wrapper file present",
      });
    }
  }

  const expectedCodexAgents = new Set(agentRows.map((row) => row.surfaces.codex.filePath).filter(Boolean));
  for (const filePath of (await listFiles(codexAgentSurface.dir)).map(relativePath)) {
    if (!expectedCodexAgents.has(filePath)) {
      findings.push({
        status: "unsupported-extra",
        scope: "agent",
        surface: codexAgentSurface.label,
        row: path.basename(filePath),
        filePath,
        detail: "Unexpected agent wrapper file present",
      });
    }
  }

  const geminiCommandsDir = path.join(options.geminiOutput, "commands");
  if (await pathExists(geminiCommandsDir)) {
    const expectedCommands = new Set(publicCommands.map((command) => relativePath(path.join(geminiCommandsDir, `${command.command}.toml`))));
    for (const filePath of (await listFiles(geminiCommandsDir)).map(relativePath)) {
      if (!expectedCommands.has(filePath)) {
        findings.push({
          status: "unsupported-extra",
          scope: "workflow",
          surface: "Gemini Built",
          row: path.basename(filePath),
          filePath,
          detail: "Unexpected generated Gemini command present",
        });
      }
    }
  }

  return findings;
}

function buildReport(options, workflowRows, agentRows, extras) {
  const findings = [];

  for (const row of workflowRows) {
    for (const surface of workflowSurfaces) {
      const result = row.surfaces[surface.key];
      if (result.status === OK_STATUS || result.status === NA_STATUS) {
        continue;
      }
      findings.push({
        status: result.status,
        scope: "workflow",
        surface: result.label,
        row: row.id,
        filePath: result.filePath,
        detail: result.details.join("; "),
      });
    }
  }

  for (const row of agentRows) {
    for (const [surfaceKey, result] of Object.entries(row.surfaces)) {
      if (result.status === OK_STATUS || result.status === NA_STATUS) {
        continue;
      }
      findings.push({
        status: result.status,
        scope: "agent",
        surface: surfaceKey === "openCodeAgent" ? opencodeAgentSurface.label : codexAgentSurface.label,
        row: row.id,
        filePath: result.filePath,
        detail: result.details.join("; "),
      });
    }
  }

  findings.push(...extras);

  const summary = summarizeFindings(findings);
  const mermaid = renderMermaid(workflowRows, agentRows);
  const markdown = renderMarkdown({ options, workflowRows, agentRows, findings, summary, mermaid });

  return {
    generatedAt: new Date().toISOString(),
    options: {
      output: relativePath(options.output),
      geminiOutput: relativePath(options.geminiOutput),
      strict: options.strict,
    },
    summary,
    workflowRows,
    agentRows,
    findings,
    mermaid,
    markdown,
  };
}

async function writeOutputs(outputDir, report) {
  await writeTextFile(path.join(outputDir, "drift-report.json"), `${JSON.stringify(report, null, 2)}${os.EOL}`);
  await writeTextFile(path.join(outputDir, "drift-report.md"), report.markdown);
  await writeTextFile(path.join(outputDir, "drift-report.mmd"), `${report.mermaid}${os.EOL}`);
}

function renderMarkdown({ options, workflowRows, agentRows, findings, summary, mermaid }) {
  const lines = [
    "# Drift Report",
    "",
    `- Generated: ${new Date().toISOString()}`,
    `- Strict mode: ${options.strict ? "true" : "false"}`,
    `- Gemini output: ${relativePath(options.geminiOutput)}`,
    "",
    "## Status Legend",
    "",
    "- `in-sync`: wrapper target, delegate mapping, and surface contract matched expectations",
    "- `missing`: expected wrapper file was not found",
    "- `stale-reference`: wrapper points at the wrong canonical target or delegate set",
    "- `normalized-drift`: wrapper shape diverged from the expected tool-specific contract",
    "- `generated-mismatch`: generated Gemini output differs from the source workflow contract",
    "- `unsupported-extra`: unexpected wrapper file exists outside the supported inventory",
    "- `n/a`: surface intentionally not present for that row",
    "",
    "## Summary",
    "",
    "| Status | Count |",
    "| --- | ---: |",
  ];

  for (const [status, count] of Object.entries(summary.byStatus)) {
    lines.push(`| ${status} | ${count} |`);
  }

  lines.push("", "## Workflow Matrix", "", workflowMatrixTable(workflowRows), "", "## Agent Matrix", "", agentMatrixTable(agentRows));

  lines.push("", "## Findings", "");
  if (findings.length === 0) {
    lines.push("No drift findings.");
  } else {
    for (const finding of findings) {
      lines.push(`- [${finding.status}] ${finding.scope} :: ${finding.row} :: ${finding.surface} :: ${finding.filePath || "(no file)"} :: ${finding.detail}`);
    }
  }

  lines.push("", "## Mermaid", "", "```mermaid", mermaid, "```", "");
  return lines.join(os.EOL);
}

function workflowMatrixTable(rows) {
  const header = ["| Workflow | Canonical Skill | Claude | Agents Skill | Agents Workflow | OpenCode Command | Windsurf | Gemini |", "| --- | --- | --- | --- | --- | --- | --- | --- |"]; 
  const body = rows.map((row) => [
    `| ${row.id}`,
    `${row.canonicalSkill}`,
    `${row.surfaces.claude.status}`,
    `${row.surfaces.agentsSkill.status}`,
    `${row.surfaces.agentsWorkflow.status}`,
    `${row.surfaces.openCodeCommand.status}`,
    `${row.surfaces.windsurf.status}`,
    `${row.surfaces.gemini.status} |`,
  ].join(" | "));
  return [...header, ...body].join(os.EOL);
}

function agentMatrixTable(rows) {
  const header = ["| Canonical Agent | OpenCode Agent | Codex |", "| --- | --- | --- |"]; 
  const body = rows.map((row) => `| ${row.id} | ${row.surfaces.openCodeAgent.status} | ${row.surfaces.codex.status} |`);
  return [...header, ...body].join(os.EOL);
}

function renderMermaid(workflowRows, agentRows) {
  const lines = [
    "flowchart TB",
    "  classDef ok fill:#daf5d7,stroke:#2f7d32,color:#123a18;",
    "  classDef fail fill:#fde2e1,stroke:#c62828,color:#4a1111;",
    "  classDef neutral fill:#eceff1,stroke:#546e7a,color:#22313a;",
  ];

  for (const row of workflowRows) {
    const rowId = sanitizeId(`wf-${row.id}`);
    lines.push(`  ${rowId}["${escapeMermaid(`${row.id} -> ${row.canonicalSkill}`)}"]`);
    for (const surface of workflowSurfaces) {
      const result = row.surfaces[surface.key];
      const nodeId = sanitizeId(`${row.id}-${surface.key}`);
      lines.push(`  ${nodeId}["${escapeMermaid(`${surface.label}: ${result.status}`)}"]`);
      lines.push(`  ${rowId} --> ${nodeId}`);
      lines.push(`  class ${nodeId} ${result.status === OK_STATUS ? "ok" : result.status === NA_STATUS ? "neutral" : "fail"};`);
    }
    lines.push(`  class ${rowId} neutral;`);
  }

  for (const row of agentRows) {
    const rowId = sanitizeId(`agent-${row.id}`);
    lines.push(`  ${rowId}["${escapeMermaid(row.id)}"]`);
    for (const [surfaceKey, result] of Object.entries(row.surfaces)) {
      const label = surfaceKey === "openCodeAgent" ? opencodeAgentSurface.label : codexAgentSurface.label;
      const nodeId = sanitizeId(`${row.id}-${surfaceKey}`);
      lines.push(`  ${nodeId}["${escapeMermaid(`${label}: ${result.status}`)}"]`);
      lines.push(`  ${rowId} --> ${nodeId}`);
      lines.push(`  class ${nodeId} ${result.status === OK_STATUS ? "ok" : result.status === NA_STATUS ? "neutral" : "fail"};`);
    }
    lines.push(`  class ${rowId} neutral;`);
  }

  return lines.join(os.EOL);
}

function summarizeFindings(findings) {
  const byStatus = {
    [OK_STATUS]: 0,
    missing: 0,
    "stale-reference": 0,
    "normalized-drift": 0,
    "generated-mismatch": 0,
    "unsupported-extra": 0,
  };

  for (const finding of findings) {
    if (!(finding.status in byStatus)) {
      byStatus[finding.status] = 0;
    }
    byStatus[finding.status] += 1;
  }

  return { byStatus, failing: findings.filter((finding) => FAILING_STATUSES.has(finding.status)).length };
}

async function parseWorkflowSurfaceFile(filePath) {
  const exists = await pathExists(filePath);
  if (!exists) {
    return {
      exists: false,
      filePath,
      delegates: [],
      normalizedComparable: "",
    };
  }
  const content = await readFile(filePath, "utf8");
  const parsed = parseWorkflowDocument(content, { canonicalizeBundlePaths: true });
  return {
    ...parsed,
    exists: true,
    filePath,
  };
}

async function parseGeminiCommandFile(filePath) {
  const exists = await pathExists(filePath);
  if (!exists) {
    return { exists: false, filePath, skill: null };
  }
  const content = await readFile(filePath, "utf8");
  const match = content.match(/Activate and follow the `([^`]+)` skill/);
  return {
    exists: true,
    filePath,
    skill: match?.[1] ?? null,
  };
}

function parseWorkflowDocument(content, options) {
  const canonicalized = options.canonicalizeBundlePaths ? canonicalizeBundledPaths(content) : content;
  const { body, frontmatter } = stripFrontmatter(canonicalized);
  const targetSkill = extractWorkflowTarget(body);
  const delegates = extractDelegateIds(body);
  const delegationMode = inferDelegationMode(body);
  const normalizedComparable = normalizeComparableBody(body);

  return {
    surfaceKey: null,
    frontmatter,
    body,
    targetSkill,
    delegates,
    delegationMode,
    hasLoadWorkflowLine: Boolean(targetSkill),
    hasInputSection: /(^|\n)## Input\n/.test(body),
    hasAutopilotBlock: body.includes("AUTOPILOT = true"),
    hasProgressDirective: /Report progress/i.test(body),
    agentReference: body.match(/^@([a-z0-9-]+)$/m)?.[1] ?? null,
    normalizedComparable,
  };
}

function parseAgentDocument(content, filePath) {
  const { body } = stripFrontmatter(content);
  const baseName = path.basename(filePath, ".md");
  const methodology = baseName.startsWith("_");
  const targetSkill = methodology ? null : extractWorkflowTarget(body);
  const targetAgent = methodology ? `.github/agents/${baseName}.md` : null;
  const delegates = extractDelegateIds(body);
  const kind = methodology ? "methodology" : "workflow";
  const id = baseName.startsWith("_") ? baseName.slice(1) : baseName;

  return {
    id,
    kind,
    targetSkill,
    targetAgent: targetAgent ?? `.github/agents/${baseName}.md`,
    delegates,
    summary: targetAgent || targetSkill || "self",
  };
}

async function loadOpenCodeAgents() {
  const wrappers = [];
  for (const filePath of (await listFiles(opencodeAgentSurface.dir)).filter((file) => file.endsWith(".md"))) {
    const content = await readFile(filePath, "utf8");
    const parsed = parseWorkflowDocument(content, { canonicalizeBundlePaths: false });
    const targetAgent = parsed.body.match(/Read and follow the methodology in `([^`]+)`\./)?.[1] ?? null;
    const modeIssue = !/^---[\s\S]*mode:\s*subagent/m.test(content) ? "Missing or invalid subagent mode frontmatter" : null;
    wrappers.push({
      surfaceKey: opencodeAgentSurface.key,
      filePath,
      kind: targetAgent ? "methodology" : "workflow",
      targetSkill: parsed.targetSkill,
      targetAgent,
      delegates: parsed.delegates,
      modeIssue,
    });
  }
  return wrappers;
}

async function loadCodexAgents() {
  const wrappers = [];
  for (const filePath of (await listFiles(codexAgentSurface.dir)).filter((file) => file.endsWith(".toml"))) {
    const content = await readFile(filePath, "utf8");
    const targetAgent = content.match(/Read and follow the methodology in `([^`]+)`\./)?.[1] ?? null;
    wrappers.push({
      surfaceKey: codexAgentSurface.key,
      filePath,
      kind: "methodology",
      targetAgent,
      delegates: [],
      modeIssue: null,
    });
  }
  return wrappers;
}

function matchOpenCodeAgent(wrappers, canonical) {
  if (canonical.kind === "methodology") {
    return wrappers.find((wrapper) => wrapper.kind === "methodology" && wrapper.targetAgent === canonical.targetAgent) ?? null;
  }

  const exactSkill = wrappers.filter((wrapper) => wrapper.kind === "workflow" && wrapper.targetSkill === canonical.targetSkill);
  if (exactSkill.length === 1) {
    return exactSkill[0];
  }

  return exactSkill.find((wrapper) => sameSet(wrapper.delegates, canonical.delegates)) ?? null;
}

function matchCodexAgent(wrappers, canonical) {
  return wrappers.find((wrapper) => wrapper.targetAgent === canonical.targetAgent) ?? null;
}

function extractCanonicalDelegateIds(content) {
  return [...new Set([...content.matchAll(/\.github\/agents\/(_[a-z0-9-]+)\.md/g)].map((match) => match[1].slice(1)))].sort();
}

function extractDelegateIds(body) {
  const ids = [];
  const lines = body.split(/\r?\n/);
  let delegateContext = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      delegateContext = false;
      continue;
    }

    if (/delegate/i.test(trimmed)) {
      delegateContext = true;
    }

    if (!delegateContext) {
      continue;
    }

    for (const candidate of extractDelegateCandidates(trimmed)) {
      ids.push(candidate);
    }
  }
  return [...new Set(ids)].sort();
}

function extractDelegateCandidates(line) {
  const candidates = [];

  for (const match of line.matchAll(/\.github\/agents\/_?([a-z0-9-]+)\.md/g)) {
    candidates.push(match[1]);
  }
  for (const match of line.matchAll(/`sddp-([a-z0-9-]+)`/g)) {
    candidates.push(match[1]);
  }
  for (const match of line.matchAll(/`([A-Z][A-Za-z0-9]+)`/g)) {
    candidates.push(camelToKebab(match[1]));
  }

  return candidates;
}

function normalizeDelegateTarget(target) {
  const markdownAgent = target.match(/\.github\/agents\/_?([a-z0-9-]+)\.md/);
  if (markdownAgent) {
    return markdownAgent[1];
  }
  const sddpAgent = target.match(/`sddp-([a-z0-9-]+)`/);
  if (sddpAgent) {
    return sddpAgent[1];
  }
  const camelAgent = target.match(/`([A-Za-z][A-Za-z0-9]+)`/);
  if (camelAgent) {
    return camelToKebab(camelAgent[1]);
  }
  return null;
}

function inferDelegationMode(body) {
  if (body.includes("via Task") || body.includes("Task tool to invoke") || body.includes("use the Task tool to invoke")) {
    return "task-tool-subagent";
  }
  if (body.includes("invoke the corresponding subagent") || body.includes("invoke `sddp-")) {
    return "invoke-subagent";
  }
  if (body.includes("read the referenced sub-agent file") || body.includes("read `.github/agents/_") || body.includes("Read `.github/agents/_")) {
    return "read-agent-file";
  }
  if (body.includes("Read and follow the methodology")) {
    return "methodology-follow";
  }
  return null;
}

function normalizeComparableBody(body) {
  return body
    .replace(/^@([a-z0-9-]+)\n+/m, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

function canonicalizeBundledPaths(content) {
  return content
    .replace(/references\/shared-skills\/([a-z0-9-]+)\/SKILL\.md/g, ".github/skills/$1/SKILL.md")
    .replace(/references\/shared-skills\/([a-z0-9-]+)\/assets\//g, ".github/skills/$1/assets/")
    .replace(/references\/shared-agents\/([A-Za-z0-9._-]+\.md)/g, ".github/agents/$1")
    .replace(/references\/shared-instructions\/([A-Za-z0-9._\/-]+)/g, ".github/instructions/$1");
}

function stripFrontmatter(content) {
  if (!content.startsWith("---\n")) {
    return { frontmatter: null, body: content };
  }
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) {
    return { frontmatter: null, body: content };
  }
  return {
    frontmatter: content.slice(4, end),
    body: content.slice(end + 5),
  };
}

function sameSet(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function camelToKebab(value) {
  return value
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

function extractWorkflowTarget(body) {
  const patterns = [
    /Load and follow the workflow in `([^`]+)`\.?/,
    /Load and follow the workflow defined in `([^`]+)`\.?/,
    /Follow `([^`]+)`\.?/,
    /Follow the workflow in `([^`]+)`\.?/,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function sanitizeId(value) {
  return value.replace(/[^A-Za-z0-9_]/g, "_");
}

function escapeMermaid(value) {
  return value.replace(/"/g, "'");
}

function relativePath(targetPath) {
  if (!targetPath) {
    return null;
  }
  return path.relative(repoRoot, targetPath) || ".";
}

async function listFiles(directory) {
  if (!(await pathExists(directory))) {
    return [];
  }
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
      continue;
    }
    if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

async function readRequiredText(filePath, label) {
  if (!(await pathExists(filePath))) {
    throw new Error(`Missing required ${label}: ${relativePath(filePath)}`);
  }
  return readFile(filePath, "utf8");
}

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function writeTextFile(targetPath, content) {
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, content, "utf8");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});