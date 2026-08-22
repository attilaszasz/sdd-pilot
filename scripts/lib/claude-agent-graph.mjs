import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { delegatedAgents } from "./delegated-agents.mjs";

const delegatePattern = /delegate to `(sddp-[a-z0-9-]+)`/g;
const targetPattern = /Read and follow the methodology in `([^`]+)`\./;
const handoffContract = /return `USER_INPUT_REQUIRED` with `question`, `options`, and `recommended` fields to the parent skill/;
const bashCapability = "bash/runCommand";
const claudeContracts = new Map(delegatedAgents
  .filter((agent) => agent.hosts.claude)
  .map((agent) => [path.basename(agent.hosts.claude, ".md"), agent]));

const requiredTools = new Map([
  ["sddp-adversarial-scanner", ["Read"]],
  ["sddp-plan-validator", ["Read", "Bash"]],
  ["sddp-tasks-validator", ["Read", "Bash"]],
]);

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  const fields = new Map();
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([a-z-]+):\s*(.*?)\s*$/);
    if (!field || fields.has(field[1])) return null;
    fields.set(field[1], field[2]);
  }
  return fields;
}

const parseTools = (value) => value ? value.split(",").map((tool) => tool.trim()).filter(Boolean) : [];
const parseCapabilities = (value) => value ? [...value.matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]) : [];
const sameArray = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);

export async function validateClaudeAgentGraph(repoRoot, commands) {
  const findings = [];
  const rows = [];
  const referencedAgents = new Map();

  for (const command of commands) {
    const skillPath = path.join(repoRoot, ".claude", "skills", command.command, "SKILL.md");
    let skill;
    try {
      skill = await readFile(skillPath, "utf8");
    } catch {
      continue;
    }
    for (const match of skill.matchAll(delegatePattern)) {
      const commandsForAgent = referencedAgents.get(match[1]) ?? [];
      commandsForAgent.push(command.command);
      referencedAgents.set(match[1], commandsForAgent);
    }
  }

  for (const [agent, agentCommands] of [...referencedAgents].sort(([left], [right]) => left.localeCompare(right))) {
    const contract = claudeContracts.get(agent);
    const relativeWrapperPath = contract?.hosts.claude ?? `.claude/agents/${agent}.md`;
    const filePath = path.join(repoRoot, relativeWrapperPath);
    let content;
    try {
      const metadata = await stat(filePath);
      if (!metadata.isFile()) throw new Error("not a regular file");
      content = await readFile(filePath, "utf8");
    } catch {
      findings.push({ agent, commands: agentCommands, filePath, status: "missing", detail: "Referenced Claude agent wrapper is missing" });
      continue;
    }

    const frontmatter = parseFrontmatter(content);
    if (!frontmatter || frontmatter.get("name") !== agent || !frontmatter.get("description")) {
      findings.push({ agent, commands: agentCommands, filePath, status: "normalized-drift", detail: "Malformed Claude agent frontmatter" });
      continue;
    }

    const expectedTarget = contract?.canonicalPath ?? `.github/agents/_${agent.slice("sddp-".length)}.md`;
    const target = content.match(targetPattern)?.[1] ?? null;
    if (target !== expectedTarget) {
      findings.push({ agent, commands: agentCommands, filePath, status: "stale-reference", detail: `Expected ${expectedTarget}, found ${target ?? "none"}` });
      continue;
    }
    try {
      const targetMetadata = await stat(path.join(repoRoot, target));
      if (!targetMetadata.isFile()) throw new Error("not a regular file");
    } catch {
      findings.push({ agent, commands: agentCommands, filePath, status: "stale-reference", detail: `Canonical methodology target is missing: ${target}` });
      continue;
    }

    const canonical = contract ? null : await readFile(path.join(repoRoot, target), "utf8");
    const requiredCapabilities = contract?.requiredCapabilities ?? parseCapabilities(parseFrontmatter(canonical)?.get("required-capabilities"));
    const tools = parseTools(frontmatter.get("tools"));
    if (requiredCapabilities.includes(bashCapability) && !tools.includes("Bash")) {
      findings.push({ agent, commands: agentCommands, filePath, status: "normalized-drift", detail: `Canonical ${bashCapability} capability requires Claude Bash, found ${tools.join(", ") || "none"}` });
      continue;
    }

    const expectedTools = requiredTools.get(agent);
    if (expectedTools) {
      if (!sameArray(tools, expectedTools)) {
        findings.push({ agent, commands: agentCommands, filePath, status: "normalized-drift", detail: `Expected tools ${expectedTools.join(", ")}, found ${tools.join(", ") || "none"}` });
        continue;
      }
      if (!handoffContract.test(content)) {
        findings.push({ agent, commands: agentCommands, filePath, status: "normalized-drift", detail: "Missing structured parent user-input handoff" });
        continue;
      }
    }

    rows.push({ agent, commands: [...agentCommands].sort(), filePath, target, tools });
  }

  return { findings, rows };
}
