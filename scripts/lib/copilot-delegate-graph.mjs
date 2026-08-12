import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

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

export function missingCopilotDelegates(agentContent, reachableAgents) {
  const allowed = new Set(arrayField(agentContent, "agents"));
  return reachableAgents.filter((agent) => !allowed.has(agent));
}

const normalizeName = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

async function collectSkillGraph(repoRoot, entryPath, delegateNames) {
  const pending = [entryPath];
  const visited = new Set();
  const delegates = new Set();

  while (pending.length > 0) {
    const filePath = pending.pop();
    if (visited.has(filePath)) continue;
    visited.add(filePath);
    const content = await readFile(filePath, "utf8");

    for (const match of content.matchAll(/\.github\/agents\/(_[a-z0-9-]+)\.md/g)) {
      const agentPath = path.join(repoRoot, ".github", "agents", `${match[1]}.md`);
      delegates.add(field(await readFile(agentPath, "utf8"), "name"));
    }
    for (const match of content.matchAll(/\*\*Delegate:\s*([^*]+)\*\*/g)) {
      const label = match[1].trim().replace(/\s*\([^)]*\)\s*$/, "");
      delegates.add(delegateNames.get(normalizeName(label)) ?? label);
    }

    for (const match of content.matchAll(/`([^`]+\.md)`/g)) {
      const reference = match[1];
      const lineStart = content.lastIndexOf("\n", match.index) + 1;
      const lineEnd = content.indexOf("\n", match.index);
      const line = content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd);
      let target = null;
      if (reference.startsWith(".github/skills/") && /(?:execute|invoke|load|read|follow|run)\b/i.test(line)) target = path.join(repoRoot, reference);
      else if (reference.startsWith("references/")) target = path.join(path.dirname(filePath), reference);
      if (target?.startsWith(path.join(repoRoot, ".github", "skills"))) {
        try {
          await access(target);
          pending.push(target);
        } catch {
          // Prose may mention a reference relative to an inline child skill.
        }
      }
    }
  }

  delegates.delete(null);
  return [...delegates].sort();
}

export async function validateCopilotDelegateGraph(repoRoot, commands) {
  const allAgentFiles = (await readdir(path.join(repoRoot, ".github", "agents"))).filter((file) => file.endsWith(".md"));
  const agentFiles = allAgentFiles.filter((file) => !file.startsWith("_"));
  const agentsByName = new Map();
  const delegateNames = new Map();
  for (const file of allAgentFiles.filter((file) => file.startsWith("_"))) {
    const name = field(await readFile(path.join(repoRoot, ".github", "agents", file), "utf8"), "name");
    delegateNames.set(normalizeName(name), name);
  }
  for (const file of agentFiles) {
    const filePath = path.join(repoRoot, ".github", "agents", file);
    const content = await readFile(filePath, "utf8");
    agentsByName.set(field(content, "name"), { content, filePath });
  }

  const findings = [];
  const rows = [];
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
    const agent = agentsByName.get(selectedAgent);
    if (selectedAgent !== command.copilotAgent || !agent) {
      findings.push({ command: command.command, filePath: promptPath, detail: `Expected Copilot agent ${command.copilotAgent}, found ${selectedAgent ?? "none"}` });
      continue;
    }

    const expectedSkill = `.github/skills/${command.skill}/SKILL.md`;
    if (!promptContent.includes(expectedSkill)) {
      findings.push({ command: command.command, filePath: promptPath, detail: `Missing canonical skill reference ${expectedSkill}` });
    }
    if (/perform the task yourself|execute the delegated work/i.test(promptContent)) {
      findings.push({ command: command.command, filePath: promptPath, detail: "Prompt relies on parent self-performance instead of selected-agent dispatch" });
    }

    const reachableAgents = await collectSkillGraph(repoRoot, path.join(repoRoot, expectedSkill), delegateNames);
    const missing = missingCopilotDelegates(agent.content, reachableAgents);
    if (reachableAgents.length > 0 && !arrayField(agent.content, "tools").includes("agent")) {
      findings.push({ command: command.command, filePath: agent.filePath, detail: "Selected agent lacks the agent tool" });
    }
    if (missing.length > 0) {
      findings.push({ command: command.command, filePath: agent.filePath, detail: `Missing reachable agents: ${missing.join(", ")}` });
    }
    rows.push({ command: command.command, promptPath, selectedAgent, reachableAgents });
  }
  return { findings, rows };
}
