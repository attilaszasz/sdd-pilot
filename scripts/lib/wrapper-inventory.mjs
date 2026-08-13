import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export const commandSurfaces = Object.freeze([
  { key: "copilot", label: "Copilot", root: ".github/prompts", path: (command) => `${command.command}.prompt.md`, frontmatter: true },
  { key: "claude", label: "Claude", root: ".claude/skills", path: (command) => `${command.command}/SKILL.md`, frontmatter: true },
  { key: "codex", label: "Codex", root: ".agents/skills", path: (command) => `${command.command}/SKILL.md`, frontmatter: true },
  { key: "antigravity", label: "Antigravity", root: ".agents/workflows", path: (command) => command.workflowFile, frontmatter: false },
  { key: "opencode", label: "OpenCode", root: ".opencode/commands", path: (command) => `${command.command}.md`, frontmatter: true },
  { key: "windsurf", label: "Windsurf", root: ".windsurf/workflows", path: (command) => command.workflowFile, frontmatter: false },
]);

function validFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return false;
  const keys = new Set();
  for (const line of match[1].split(/\r?\n/)) {
    if (/^\s/.test(line)) continue;
    const field = line.match(/^([a-z-]+):(?:\s*.*)?$/);
    if (!field || keys.has(field[1])) return false;
    keys.add(field[1]);
  }
  return true;
}

function validCodexToml(content, id) {
  const names = [...content.matchAll(/^name\s*=\s*"([^"]+)"\s*$/gm)].map((match) => match[1]);
  const targets = [...content.matchAll(/Read and follow the methodology in `(\.github\/agents\/_[a-z0-9-]+\.md)`\./g)].map((match) => match[1]);
  return names.length === 1
    && names[0] === `sddp_${id.replaceAll("-", "_")}`
    && targets.length === 1
    && targets[0] === `.github/agents/_${id}.md`
    && /^sandbox_mode\s*=\s*"(?:read-only|workspace-write)"\s*$/m.test(content)
    && (content.match(/^developer_instructions\s*=\s*"""\s*$/gm)?.length ?? 0) === 1;
}

async function filesUnder(directory, prefix = "") {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await filesUnder(path.join(directory, entry.name), relative));
    else if (entry.isFile() && /\.(?:md|toml)$/.test(entry.name)) files.push(relative);
  }
  return files.sort();
}

export async function validateWrapperInventory(repoRoot, commands) {
  const findings = [];
  const rows = [];
  for (const surface of commandSurfaces) {
    const expected = new Map(commands.map((command) => [surface.path(command), command.command]));
    const actual = await filesUnder(path.join(repoRoot, surface.root));
    for (const [relativePath, command] of expected) {
      const filePath = path.join(repoRoot, surface.root, relativePath);
      if (!actual.includes(relativePath)) {
        findings.push({ surface: surface.label, command, filePath, status: "missing", detail: "Expected wrapper file is missing" });
        continue;
      }
      const content = await readFile(filePath, "utf8");
      if (surface.frontmatter && !validFrontmatter(content)) {
        findings.push({ surface: surface.label, command, filePath, status: "normalized-drift", detail: "Malformed or duplicate wrapper frontmatter" });
      }
      rows.push({ surface: surface.key, command, filePath });
    }
    for (const relativePath of actual) {
      if (!expected.has(relativePath)) {
        findings.push({ surface: surface.label, command: path.basename(relativePath), filePath: path.join(repoRoot, surface.root, relativePath), status: "unsupported-extra", detail: "Unexpected wrapper file present" });
      }
    }
  }
  for (const root of [".opencode/agents", ".claude/agents"]) {
    for (const file of await filesUnder(path.join(repoRoot, root))) {
      const filePath = path.join(repoRoot, root, file);
      if (!validFrontmatter(await readFile(filePath, "utf8"))) findings.push({ surface: root.includes("opencode") ? "OpenCode Agent" : "Claude Agent", command: file, filePath, status: "normalized-drift", detail: "Malformed or duplicate agent frontmatter" });
    }
  }
  const methodologyIds = (await filesUnder(path.join(repoRoot, ".github/agents")))
    .filter((file) => path.basename(file).startsWith("_"))
    .map((file) => path.basename(file, ".md").slice(1));
  for (const surface of [{ label: "Claude Agent", root: ".claude/agents", extension: ".md" }, { label: "Codex Agent", root: ".codex/agents", extension: ".toml" }]) {
    const expected = new Set(methodologyIds.map((id) => `sddp-${id}${surface.extension}`));
    const actual = await filesUnder(path.join(repoRoot, surface.root));
    for (const file of actual) {
      if (!expected.has(file)) findings.push({ surface: surface.label, command: file, filePath: path.join(repoRoot, surface.root, file), status: "unsupported-extra", detail: "Unexpected agent wrapper file present" });
    }
    for (const file of expected) {
      if (!actual.includes(file)) findings.push({ surface: surface.label, command: file, filePath: path.join(repoRoot, surface.root, file), status: "missing", detail: "Expected agent wrapper is missing" });
    }
  }
  for (const file of await filesUnder(path.join(repoRoot, ".codex/agents"))) {
    const filePath = path.join(repoRoot, ".codex/agents", file);
    if (!validCodexToml(await readFile(filePath, "utf8"), file.slice(5, -5))) findings.push({ surface: "Codex Agent", command: file, filePath, status: "normalized-drift", detail: "Malformed or stale Codex agent TOML" });
  }
  return { findings, rows };
}
