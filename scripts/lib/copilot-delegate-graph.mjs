import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { collectCanonicalWorkflowGraph } from "./canonical-workflow-graph.mjs";
import { delegatedAgents } from "./delegated-agents.mjs";
import { compareDeclaredTargets } from "./delegated-agent-host-policy.mjs";

const methodologyById = new Map(delegatedAgents.filter((agent) => agent.kind === "methodology").map((agent) => [agent.id, agent]));
const roleByName = new Map(delegatedAgents.filter((agent) => agent.kind === "role").map((agent) => [agent.name, agent]));

function frontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  return match?.[1] ?? "";
}

function field(content, name) {
  return frontmatter(content).match(new RegExp(`^${name}:\\s*(.+?)\\s*$`, "m"))?.[1]?.replace(/^['"]|['"]$/g, "") ?? null;
}

function arrayField(content, name) {
  const value = field(content, name);
  if (!value?.startsWith("[") || !value.endsWith("]")) return [];
  return [...value.matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
}

export function compareCopilotDelegates(agentContent, reachableAgents) {
  const allowed = arrayField(agentContent, "agents");
  return compareDeclaredTargets({ expected: reachableAgents, actual: allowed });
}

export const missingCopilotDelegates = (agentContent, reachableAgents) => compareCopilotDelegates(agentContent, reachableAgents).missing;

const normalizeName = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export async function validateCopilotDelegateGraph(repoRoot, commands) {
  const allAgentFiles = (await readdir(path.join(repoRoot, ".github", "agents"))).filter((file) => file.endsWith(".md"));
  const agentFiles = allAgentFiles.filter((file) => !file.startsWith("_"));
  const agentsByName = new Map();
  const agentsByPath = new Map();
  const delegateNames = new Map();
  for (const file of allAgentFiles.filter((file) => file.startsWith("_"))) {
    const name = field(await readFile(path.join(repoRoot, ".github", "agents", file), "utf8"), "name");
    delegateNames.set(normalizeName(name), name);
  }
  for (const file of agentFiles) {
    const filePath = path.join(repoRoot, ".github", "agents", file);
    const content = await readFile(filePath, "utf8");
    const agent = { content, filePath };
    agentsByName.set(field(content, "name"), agent);
    agentsByPath.set(`.github/agents/${file}`, agent);
  }

  const findings = [];
  const rows = [];
  const graph = await collectCanonicalWorkflowGraph(repoRoot, commands);
  findings.push(...graph.findings);
  const graphByCommand = new Map(graph.rows.map((row) => [row.command, row]));
  const expectedByAgent = new Map();
  for (const command of commands) {
    const copilotAgent = command.hostRoles.copilot;
    const expected = expectedByAgent.get(copilotAgent) ?? new Set();
    for (const id of graphByCommand.get(command.command).delegates) expected.add(methodologyById.get(id)?.name ?? delegateNames.get(normalizeName(id)) ?? id);
    expectedByAgent.set(copilotAgent, expected);
  }
  for (const command of commands) {
    const promptPath = path.join(repoRoot, ".github", "prompts", `${command.command}.prompt.md`);
    let promptContent;
    try {
      promptContent = await readFile(promptPath, "utf8");
    } catch {
      findings.push({ command: command.command, filePath: promptPath, detail: "Copilot prompt is missing" });
      continue;
    }

    const selectedAgent = field(promptContent, "agent");
    const copilotAgent = command.hostRoles.copilot;
    const roleContract = roleByName.get(copilotAgent);
    const registeredAgent = roleContract ? agentsByPath.get(roleContract.hosts.copilot) : null;
    const agent = roleContract
      ? (registeredAgent && field(registeredAgent.content, "name") === roleContract.name ? registeredAgent : null)
      : agentsByName.get(selectedAgent);
    if (selectedAgent !== copilotAgent || !agent) {
      findings.push({ command: command.command, filePath: promptPath, detail: `Expected Copilot agent ${copilotAgent}, found ${selectedAgent ?? "none"}` });
      continue;
    }

    const expectedSkill = command.canonicalWorkflow;
    if (!promptContent.includes(expectedSkill)) {
      findings.push({ command: command.command, filePath: promptPath, detail: `Missing canonical workflow reference ${expectedSkill}` });
    }
    if (/perform the task yourself|execute the delegated work/i.test(promptContent)) {
      findings.push({ command: command.command, filePath: promptPath, detail: "Prompt relies on parent self-performance instead of selected-agent dispatch" });
    }

    const reachableAgents = [...expectedByAgent.get(copilotAgent)].sort();
    const comparison = compareCopilotDelegates(agent.content, reachableAgents);
    if (reachableAgents.length > 0 && !arrayField(agent.content, "tools").includes("agent")) {
      findings.push({ command: command.command, filePath: agent.filePath, detail: "Selected agent lacks the agent tool" });
    }
    if (comparison.missing.length > 0) findings.push({ command: command.command, filePath: agent.filePath, detail: `Missing reachable agents: ${comparison.missing.join(", ")}` });
    if (comparison.unexpected.length > 0) findings.push({ command: command.command, filePath: agent.filePath, detail: `Unexpected reachable agents: ${comparison.unexpected.join(", ")}` });
    if (comparison.duplicates.length > 0) findings.push({ command: command.command, filePath: agent.filePath, detail: `Duplicate reachable agents: ${comparison.duplicates.join(", ")}` });
    rows.push({ command: command.command, promptPath, selectedAgent, reachableAgents });
  }
  return { findings, rows };
}
