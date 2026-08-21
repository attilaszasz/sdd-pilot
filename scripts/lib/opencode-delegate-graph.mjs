import { readFile } from "node:fs/promises";
import path from "node:path";
import { collectCanonicalWorkflowGraph } from "./canonical-workflow-graph.mjs";

const builtInAgents = new Set(["build", "plan", "general", "explore"]);

function frontmatter(content) {
  return content.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? "";
}

function field(content, name) {
  return frontmatter(content).match(new RegExp(`^${name}:\\s*([^\\n]+?)\\s*$`, "m"))?.[1]?.replace(/^['"]|['"]$/g, "") ?? null;
}

function delegates(content) {
  const body = content.replace(/^---\n[\s\S]*?\n---\n/, "");
  return [...body.split(/\r?\n/).entries()].flatMap(([index, line]) => {
    if (/^\s*<!--/.test(line)) return [];
    return [...line.matchAll(/invoke\s+`(sddp-[a-z0-9-]+)`/g)].map((match) => ({ delegate: match[1], lineNumber: index + 1 }));
  });
}

function taskPermission(content) {
  const block = frontmatter(content).match(/^\s{2}task:\s*\n((?:^\s{4}[^\n]+\n?)*)/m)?.[1] ?? "";
  return [...block.matchAll(/^\s{4}([^:]+):\s*(allow|ask|deny)\s*$/gm)].map((match) => ({ pattern: match[1].trim().replace(/^['"]|['"]$/g, ""), action: match[2] }));
}

function taskAction(rules, target) {
  let action = null;
  for (const rule of rules) {
    if (rule.pattern === "*" || rule.pattern === target) action = rule.action;
  }
  return action;
}

async function readOptional(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

function requiredCapabilities(content) {
  const value = frontmatter(content).match(/^required-capabilities:\s*\[([^\]]*)\]\s*$/m)?.[1] ?? "";
  return [...value.matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
}

function bashPermission(content) {
  return frontmatter(content).match(/^[ \t]{2}bash:\s*["']?(allow|ask|deny)["']?\s*$/m)?.[1] ?? null;
}

async function selectedAgentRules(repoRoot, selectedAgent) {
  const agentPath = path.join(repoRoot, ".opencode", "agents", `${selectedAgent}.md`);
  const agentContent = await readOptional(agentPath);
  if (agentContent) return { filePath: agentPath, rules: taskPermission(agentContent) };

  if (!builtInAgents.has(selectedAgent)) return { filePath: agentPath, rules: null };
  const configPath = path.join(repoRoot, "opencode.json");
  const configContent = await readOptional(configPath);
  if (!configContent) return { filePath: configPath, rules: null };
  try {
    const config = JSON.parse(configContent);
    const task = config.agent?.[selectedAgent]?.permission?.task;
    if (!task || typeof task !== "object" || Array.isArray(task)) return { filePath: configPath, rules: null };
    return { filePath: configPath, rules: Object.entries(task).map(([pattern, action]) => ({ pattern, action })) };
  } catch {
    return { filePath: configPath, rules: null };
  }
}

export async function validateOpenCodeDelegateGraph(repoRoot, commands) {
  const graph = await collectCanonicalWorkflowGraph(repoRoot, commands);
  const graphByCommand = new Map(graph.rows.map((row) => [row.command, row]));
  const findings = [...graph.findings];
  const rows = [];

  for (const command of commands) {
    const commandPath = path.join(repoRoot, ".opencode", "commands", `${command.command}.md`);
    const content = await readOptional(commandPath);
    if (!content) {
      findings.push({ command: command.command, filePath: commandPath, detail: "OpenCode command is missing" });
      continue;
    }
    const selectedAgent = field(content, "agent");
    if (!selectedAgent) {
      findings.push({ command: command.command, filePath: commandPath, detail: "OpenCode command has no selected agent" });
      continue;
    }
    if (selectedAgent !== command.hostRoles.opencode) {
      findings.push({ command: command.command, filePath: commandPath, detail: `Expected OpenCode agent ${command.hostRoles.opencode}, found ${selectedAgent}` });
    }
    const expected = graphByCommand.get(command.command)?.delegates.map((id) => `sddp-${id}`).sort() ?? [];
    const mappings = delegates(content);
    const mapped = mappings.map((mapping) => mapping.delegate);
    const missing = expected.filter((delegate) => !mapped.includes(delegate));
    const unexpected = mapped.filter((delegate) => !expected.includes(delegate));
    const duplicates = mapped.filter((delegate, index) => mapped.indexOf(delegate) !== index);
    if (missing.length > 0) findings.push({ command: command.command, filePath: commandPath, detail: `Missing delegate mappings: ${missing.join(", ")}` });
    if (unexpected.length > 0) findings.push({ command: command.command, filePath: commandPath, detail: `Unexpected delegate mappings: ${unexpected.join(", ")}` });
    if (duplicates.length > 0) findings.push({ command: command.command, filePath: commandPath, detail: `Duplicate delegate mappings: ${duplicates.join(", ")}` });

    const selected = await selectedAgentRules(repoRoot, selectedAgent);
    if (expected.length > 0 && !selected.rules) {
      findings.push({ command: command.command, filePath: selected.filePath, detail: `Selected agent ${selectedAgent} has no task permission allowlist` });
    } else if (selected.rules) {
      const unreachable = expected.filter((delegate) => taskAction(selected.rules, delegate) !== "allow");
      if (unreachable.length > 0) findings.push({ command: command.command, filePath: selected.filePath, detail: `Selected agent ${selectedAgent} cannot reach delegates: ${unreachable.join(", ")}` });
    }

    for (const delegate of new Set([...expected, ...mapped])) {
      const agentPath = path.join(repoRoot, ".opencode", "agents", `${delegate}.md`);
      const canonicalPath = path.join(repoRoot, ".github", "agents", `_${delegate.slice("sddp-".length)}.md`);
      const [agentContent, canonicalContent] = await Promise.all([readOptional(agentPath), readOptional(canonicalPath)]);
      if (canonicalContent && requiredCapabilities(canonicalContent).includes("bash/runCommand") && bashPermission(agentContent ?? "") !== "allow") {
        findings.push({ command: command.command, filePath: agentPath, detail: `Canonical bash/runCommand capability requires ${delegate} to allow Bash` });
      }
    }
    rows.push({ command: command.command, commandPath, selectedAgent, expected, mapped });
  }
  return { findings, rows };
}
