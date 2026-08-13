import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";

const normalizeName = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const agentPathPattern = /^\.github\/agents\/_([a-z0-9-]+)\.md$/;

function frontmatterField(content, name) {
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)?.[1] ?? "";
  return frontmatter.match(new RegExp(`^${name}:\\s*(.+?)\\s*$`, "m"))?.[1]?.replace(/^['"]|['"]$/g, "") ?? null;
}

function executableLines(content) {
  const lines = [];
  let fenced = false;
  let exampleFence = false;
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    const fence = line.match(/^\s*(```|~~~)(.*)$/);
    if (fence) {
      if (!fenced) exampleFence = fence[2].trim().length > 0;
      fenced = !fenced;
      if (!fenced) exampleFence = false;
      continue;
    }
    if (!fenced || !exampleFence) lines.push({ line, lineNumber: index + 1 });
  }
  return lines;
}

async function loadAgents(repoRoot) {
  const agentRoot = path.join(repoRoot, ".github", "agents");
  const byName = new Map();
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
    else byName.set(normalized, { name, relativePath: `.github/agents/${file}`, filePath });
  }
  return { byName, findings };
}

function referencedDocuments(filePath, lines, repoRoot) {
  const references = [];
  for (const { line, lineNumber } of lines) {
    for (const match of line.matchAll(/`([^`]+\.md)`/g)) {
      const reference = match[1];
      const instruction = line.slice(0, match.index);
      const loadsReference = /(?:load\+execute|execute|invoke|load|read|follow|run)(?:\s+and\s+execute)?\s*$/i.test(instruction.replace(/[*_>:()-]+\s*$/, "").trimEnd());
      let target = null;
      if (reference.startsWith("references/") && loadsReference) target = path.resolve(path.dirname(filePath), reference);
      else if (reference.startsWith(".github/skills/") && loadsReference) target = path.resolve(repoRoot, reference);
      if (target) references.push({ target, reference, lineNumber });
    }
  }
  return references;
}

export async function validateCodexDelegateGraph(repoRoot, commands) {
  const resolvedRoot = await realpath(repoRoot);
  const skillRoot = path.join(resolvedRoot, ".github", "skills");
  const agents = await loadAgents(resolvedRoot);
  const findings = [...agents.findings.map((finding) => ({ command: "agent-manifest", ...finding }))];
  const rows = [];

  for (const command of commands) {
    const entryPath = path.join(skillRoot, command.skill, "SKILL.md");
    const pending = [entryPath];
    const visited = new Set();
    const delegates = new Set();

    while (pending.length > 0) {
      const filePath = pending.pop();
      if (visited.has(filePath)) continue;
      visited.add(filePath);

      let content;
      try {
        const metadata = await lstat(filePath);
        const resolvedPath = await realpath(filePath);
        if (!metadata.isFile() || metadata.isSymbolicLink() || (resolvedPath !== skillRoot && !resolvedPath.startsWith(`${skillRoot}${path.sep}`))) {
          throw new Error("target is not a regular in-tree skill file");
        }
        content = await readFile(filePath, "utf8");
      } catch (error) {
        findings.push({ command: command.command, filePath, detail: `Missing or invalid reachable document: ${error.message}` });
        continue;
      }

      const lines = executableLines(content);
      for (const { line, lineNumber } of lines) {
        for (const match of line.matchAll(/\*\*Delegate:\s*([^*]+?)\*\*/g)) {
          const label = match[1].trim().replace(/\s*\([^)]*\)\s*$/, "");
          const suffix = line.slice(match.index + match[0].length);
          const paths = [...suffix.matchAll(/`(\.github\/agents\/[^`]+\.md)`/g)].map((item) => item[1]);
          if (paths.length !== 1) {
            findings.push({ command: command.command, filePath, lineNumber, detail: `Delegate ${label} must reference exactly one canonical agent path; found ${paths.length}` });
            continue;
          }
          const pathMatch = paths[0].match(agentPathPattern);
          if (!pathMatch) {
            findings.push({ command: command.command, filePath, lineNumber, detail: `Delegate ${label} has invalid canonical path ${paths[0]}` });
            continue;
          }
          const expected = agents.byName.get(normalizeName(label));
          if (!expected) {
            findings.push({ command: command.command, filePath, lineNumber, detail: `Delegate role ${label} does not resolve uniquely` });
            continue;
          }
          if (paths[0] !== expected.relativePath) {
            findings.push({ command: command.command, filePath, lineNumber, detail: `Delegate ${label} resolves to ${expected.relativePath}, not ${paths[0]}` });
            continue;
          }
          delegates.add(expected.relativePath);
        }
      }

      for (const reference of referencedDocuments(filePath, lines, resolvedRoot)) {
        if (reference.target !== skillRoot && !reference.target.startsWith(`${skillRoot}${path.sep}`)) {
          findings.push({ command: command.command, filePath, lineNumber: reference.lineNumber, detail: `Reachable reference escapes skill root: ${reference.reference}` });
          continue;
        }
        pending.push(reference.target);
      }
    }
    rows.push({ command: command.command, entryPath, visited: [...visited].sort(), delegates: [...delegates].sort() });
  }

  return { findings, rows };
}
