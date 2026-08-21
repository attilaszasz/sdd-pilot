import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";

export function executableLines(content) {
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

function referencedDocuments(filePath, lines, repoRoot) {
  const references = [];
  for (const { line, lineNumber } of lines) {
    for (const match of line.matchAll(/`([^`]+\.md)`/g)) {
      const reference = match[1];
      const instruction = line.slice(0, match.index);
      const loadsReference = /(?:load\+execute|execute|invoke|load|read|follow|run)(?:\s+and\s+execute)?\s*$/i.test(instruction.replace(/[*_>:()-]+\s*$/, "").trimEnd());
      let target = null;
      if (reference.startsWith("references/") && loadsReference) target = path.resolve(path.dirname(filePath), reference);
      else if ((reference.startsWith(".github/sddp/workflows/") || reference.startsWith(".github/skills/")) && loadsReference) target = path.resolve(repoRoot, reference);
      if (target) references.push({ target, reference, lineNumber });
    }
  }
  return references;
}

export async function collectCanonicalWorkflowGraph(repoRoot, commands) {
  const resolvedRoot = await realpath(repoRoot);
  const workflowRoot = path.join(resolvedRoot, ".github", "sddp", "workflows");
  const supportSkillRoot = path.join(resolvedRoot, ".github", "skills");
  const allowedRoots = [workflowRoot, supportSkillRoot];
  const isWithin = (filePath, root) => filePath === root || filePath.startsWith(`${root}${path.sep}`);
  const rows = [];
  const findings = [];

  for (const command of commands) {
    const entryPath = path.resolve(resolvedRoot, command.canonicalWorkflow);
    if (!isWithin(entryPath, workflowRoot)) {
      findings.push({ command: command.command, filePath: entryPath, detail: "Canonical workflow entry escapes workflow root" });
      rows.push({ command: command.command, entryPath, visited: [], delegateOccurrences: [], delegates: [] });
      continue;
    }
    const pending = [entryPath];
    const visited = new Set();
    const delegateOccurrences = [];

    while (pending.length > 0) {
      const filePath = pending.pop();
      if (visited.has(filePath)) continue;
      visited.add(filePath);
      let content;
      try {
        const metadata = await lstat(filePath);
        const resolvedPath = await realpath(filePath);
        if (!metadata.isFile() || metadata.isSymbolicLink() || !allowedRoots.some((root) => isWithin(resolvedPath, root))) {
          throw new Error("target is not a regular canonical workflow or support-skill file");
        }
        content = await readFile(filePath, "utf8");
      } catch (error) {
        findings.push({ command: command.command, filePath, detail: `Missing or invalid reachable document: ${error.message}` });
        continue;
      }

      const lines = executableLines(content);
      for (const { line, lineNumber } of lines) {
        for (const match of line.matchAll(/\.github\/agents\/(_[a-z0-9-]+)\.md/g)) {
          delegateOccurrences.push({ id: match[1].slice(1), path: match[0], filePath, lineNumber });
        }
      }
      for (const reference of referencedDocuments(filePath, lines, resolvedRoot)) {
        if (!allowedRoots.some((root) => isWithin(reference.target, root))) {
          findings.push({ command: command.command, filePath, lineNumber: reference.lineNumber, detail: `Reachable reference escapes canonical roots: ${reference.reference}` });
        } else {
          pending.push(reference.target);
        }
      }
    }

    rows.push({
      command: command.command,
      entryPath,
      visited: [...visited].sort(),
      delegateOccurrences,
      delegates: [...new Set(delegateOccurrences.map((item) => item.id))].sort(),
    });
  }
  return { findings, rows };
}
