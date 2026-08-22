import { readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { collectCanonicalWorkflowGraph, executableLines } from "./canonical-workflow-graph.mjs";
import { delegatedAgents } from "./delegated-agents.mjs";

const normalizeName = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const agentPathPattern = /^\.github\/agents\/_([a-z0-9-]+)\.md$/;
const methodologyByName = new Map(delegatedAgents
  .filter((agent) => agent.kind === "methodology")
  .map((agent) => [normalizeName(agent.name), agent]));

function frontmatterField(content, name) {
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)?.[1] ?? "";
  return frontmatter.match(new RegExp(`^${name}:\\s*(.+?)\\s*$`, "m"))?.[1]?.replace(/^['"]|['"]$/g, "") ?? null;
}

async function loadAgents(repoRoot) {
  const agentRoot = path.join(repoRoot, ".github", "agents");
  const byName = new Map();
  const byPath = new Map();
  const findings = [];
  for (const file of (await readdir(agentRoot)).filter((item) => item.startsWith("_") && item.endsWith(".md")).sort()) {
    const filePath = path.join(agentRoot, file);
    const name = frontmatterField(await readFile(filePath, "utf8"), "name");
    if (!name) {
      findings.push({ filePath, detail: "Delegate target has no frontmatter name" });
      continue;
    }
    const normalized = normalizeName(name);
    const previous = byName.get(normalized);
    if (previous) findings.push({ filePath, detail: `Ambiguous delegate name ${name}: ${previous.relativePath} and .github/agents/${file}` });
    else {
      const agent = { name, relativePath: `.github/agents/${file}`, filePath };
      byName.set(normalized, agent);
      byPath.set(agent.relativePath, agent);
    }
  }
  return { byName, byPath, findings };
}

export async function validateCodexDelegateGraph(repoRoot, commands) {
  const resolvedRoot = await realpath(repoRoot);
  const agents = await loadAgents(resolvedRoot);
  const findings = [...agents.findings.map((finding) => ({ command: "agent-manifest", ...finding }))];
  const graph = await collectCanonicalWorkflowGraph(resolvedRoot, commands);
  findings.push(...graph.findings);

  for (const row of graph.rows) {
    for (const filePath of row.visited) {
      let content;
      try {
        content = await readFile(filePath, "utf8");
      } catch {
        continue;
      }
      for (const { line, lineNumber } of executableLines(content)) {
        for (const match of line.matchAll(/\*\*Delegate:\s*([^*]+?)\*\*/g)) {
          const label = match[1].trim().replace(/\s*\([^)]*\)\s*$/, "");
          const suffix = line.slice(match.index + match[0].length);
          const paths = [...suffix.matchAll(/`(\.github\/agents\/[^`]+\.md)`/g)].map((item) => item[1]);
          if (paths.length !== 1) {
            findings.push({ command: row.command, filePath, lineNumber, detail: `Delegate ${label} must reference exactly one canonical agent path; found ${paths.length}` });
            continue;
          }
          const normalizedLabel = normalizeName(label);
          const contract = methodologyByName.get(normalizedLabel);
          const registered = contract ? agents.byPath.get(contract.canonicalPath) : null;
          const expected = contract
            ? (registered && normalizeName(registered.name) === normalizeName(contract.name) ? registered : null)
            : agents.byName.get(normalizedLabel);
          if (!paths[0].match(agentPathPattern) || !expected) findings.push({ command: row.command, filePath, lineNumber, detail: `Delegate role ${label} does not resolve uniquely` });
          else if (paths[0] !== expected.relativePath) findings.push({ command: row.command, filePath, lineNumber, detail: `Delegate ${label} resolves to ${expected.relativePath}, not ${paths[0]}` });
        }
      }
    }
  }

  return { findings, rows: graph.rows.map((row) => ({ ...row, delegates: row.delegateOccurrences.map((item) => item.path).filter((item, index, all) => all.indexOf(item) === index).sort() })) };
}
