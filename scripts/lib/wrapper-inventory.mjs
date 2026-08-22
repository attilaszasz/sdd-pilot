import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parseJsonc, parseToml, parseYamlFrontmatter, validateSchema } from "./wrapper-parsers.mjs";
import { delegatedAgents } from "./delegated-agents.mjs";

const directCommandGuard = "Direct command-bar dispatch only; do not select for general queries.";

export const commandSurfaces = Object.freeze([
  { key: "copilot", label: "Copilot", root: ".github/prompts", path: (command) => `${command.command}.prompt.md`, frontmatter: "prompt", invocation: "user-command-surface", description: "body", argumentHint: "body" },
  { key: "claude", label: "Claude", root: ".claude/skills", path: (command) => `${command.command}/SKILL.md`, frontmatter: "skill", invocation: "native-disable-model-invocation", description: "frontmatter", argumentHint: "frontmatter" },
  { key: "codex", label: "Codex", root: ".agents/skills", path: (command) => `${command.command}/SKILL.md`, frontmatter: "skill", invocation: "description-guard", description: "frontmatter", argumentHint: "body" },
  { key: "antigravity", label: "Antigravity", root: ".agents/workflows", path: (command) => `${command.command}.md`, frontmatter: "workflow", invocation: "user-workflow-surface", description: "frontmatter", argumentHint: "body" },
  { key: "opencode", label: "OpenCode", root: ".opencode/commands", path: (command) => `${command.command}.md`, frontmatter: "command", invocation: "native-command", description: "frontmatter", argumentHint: "body" },
  { key: "windsurf", label: "Windsurf", root: ".windsurf/workflows", path: (command) => `${command.command}.md`, frontmatter: null, invocation: "user-workflow-surface", description: "body", argumentHint: "body" },
]);

export function expectedCommandFrontmatter(surfaceKey, command) {
  const expected = {
    copilot: { agent: command.hostRoles.copilot },
    claude: {
      name: command.command,
      description: command.description,
      "argument-hint": command.arguments.hint,
      "disable-model-invocation": command.invocation === "user-only",
    },
    codex: {
      name: command.command,
      description: `${command.description} ${directCommandGuard}`,
    },
    antigravity: { description: command.description },
    opencode: {
      description: command.description,
      agent: command.hostRoles.opencode,
      subtask: false,
    },
    windsurf: null,
  }[surfaceKey];
  if (expected === undefined) throw new Error(`Unknown command surface: ${surfaceKey}`);
  return expected && Object.freeze(expected);
}

export function expectedCommandBodyMetadata(surfaceKey, command) {
  const surface = commandSurfaces.find(({ key }) => key === surfaceKey);
  if (!surface) throw new Error(`Unknown command surface: ${surfaceKey}`);
  const lines = [];
  if (surface.description === "body") lines.push(`Command description: ${command.description}`);
  if (surface.argumentHint === "body") lines.push(`Argument hint: \`${command.arguments.hint}\``);
  lines.push(`Command category: \`${command.category}\``);
  lines.push(command.prerequisites.length > 0
    ? `Prerequisites: ${command.prerequisites.map((prerequisite) => `\`${prerequisite}\``).join(", ")}`
    : "Prerequisites: none");
  return Object.freeze(lines);
}

function commandPolicyFindings(surface, command, content, metadata) {
  const findings = [];
  if (command.invocation !== "user-only") {
    findings.push(`Unsupported invocation policy: ${command.invocation}`);
  } else if (surface.invocation === "native-disable-model-invocation" && metadata?.["disable-model-invocation"] !== true) {
    findings.push("User-only invocation requires disable-model-invocation: true");
  } else if (surface.invocation === "description-guard" && !metadata?.description?.includes(directCommandGuard)) {
    findings.push("User-only invocation requires the direct-command description guard");
  } else if (surface.invocation === "native-command" && metadata?.subtask !== false) {
    findings.push("User-only invocation requires subtask: false");
  }

  if (command.mutability === "conditional-write") {
    if (!command.mutationPolicy) findings.push("Conditional-write command is missing its metadata mutation policy");
    else if (!content.includes(command.mutationPolicy)) findings.push("Conditional-write wrapper is missing its metadata mutation policy");
  } else if (command.mutability !== "workspace-write") {
    findings.push(`Unsupported mutability policy: ${command.mutability}`);
  } else if (command.mutationPolicy !== null) {
    findings.push("Workspace-write command must not declare a conditional mutation policy");
  }
  return findings;
}

function commandPresentationFindings(surface, command, content, metadata) {
  const findings = [];
  const expectedFrontmatter = expectedCommandFrontmatter(surface.key, command);
  if (metadata && expectedFrontmatter) {
    for (const [field, expected] of Object.entries(expectedFrontmatter)) {
      if (metadata[field] !== expected) findings.push(`Wrapper metadata ${field} must match public command metadata`);
    }
  }
  const bodyLines = new Set(content.split(/\r?\n/));
  for (const expected of expectedCommandBodyMetadata(surface.key, command)) {
    if (!bodyLines.has(expected)) findings.push(`Wrapper body metadata must match public command metadata: ${expected.split(":", 1)[0]}`);
  }
  return findings;
}

function validateFrontmatter(content, type) {
  const schemas = {
    command: { description: { required: true, type: "string" }, agent: { required: true, type: "string" }, subtask: { required: true, type: "boolean" } },
    opencodeAgent: { description: { required: true, type: "string" }, mode: { required: true, type: "string", values: ["subagent"] }, hidden: { type: "boolean" }, permission: { type: "object" } },
    claudeAgent: { name: { required: true, type: "string" }, description: { required: true, type: "string" }, tools: { required: true, type: "string" } },
    skill: { name: { required: true, type: "string" }, description: { required: true, type: "string" }, "disable-model-invocation": { type: "boolean" }, "argument-hint": { type: "string" }, "allowed-tools": { type: "string" } },
    prompt: { agent: { required: true, type: "string" } },
    workflow: { description: { required: true, type: "string" } },
  };
  return validateSchema(parseYamlFrontmatter(content), schemas[type]);
}

function validateCodexToml(content, contract) {
  const config = validateSchema(parseToml(content), {
    name: { required: true, type: "string" }, description: { required: true, type: "string" },
    sandbox_mode: { required: true, type: "string", values: ["read-only", "workspace-write"] }, developer_instructions: { required: true, type: "string" },
  });
  return config.name === `sddp_${contract.id.replaceAll("-", "_")}`
    && config.developer_instructions === `Read and follow the methodology in \`${contract.canonicalPath}\`.`;
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

async function validateCopilotRecommendations(repoRoot, commands) {
  const filePath = path.join(repoRoot, ".vscode", "settings.json");
  let content;
  try {
    content = await readFile(filePath, "utf8");
  } catch {
    return commands.map((command) => ({ surface: "Copilot Recommendation", command: command.command, filePath, status: "missing", detail: "Expected prompt recommendation is missing" }));
  }
  let recommendations;
  try {
    const settings = parseJsonc(content);
    recommendations = settings["chat.promptFilesRecommendations"];
    if (!recommendations || Array.isArray(recommendations) || typeof recommendations !== "object") throw new Error("prompt recommendations must be an object");
    for (const [command, enabled] of Object.entries(recommendations)) {
      if (typeof enabled !== "boolean") throw new Error(`prompt recommendation ${command} must be a boolean`);
    }
  } catch (error) {
    return [{ surface: "Copilot Recommendation", command: "settings.json", filePath, status: "normalized-drift", detail: `Malformed Copilot JSONC: ${error.message}` }];
  }
  const expected = new Set(commands.map((command) => command.command));
  const findings = [];
  for (const command of expected) {
    if (!Object.hasOwn(recommendations, command)) findings.push({ surface: "Copilot Recommendation", command, filePath, status: "missing", detail: "Expected prompt recommendation is missing" });
    else if (recommendations[command] !== true) findings.push({ surface: "Copilot Recommendation", command, filePath, status: "normalized-drift", detail: "Prompt recommendation must be enabled" });
  }
  for (const command of Object.keys(recommendations)) {
    if (!expected.has(command)) findings.push({ surface: "Copilot Recommendation", command, filePath, status: "unsupported-extra", detail: "Unexpected prompt recommendation present" });
  }
  return findings;
}

export async function validateWrapperInventory(repoRoot, commands) {
  const findings = [];
  const rows = [];
  findings.push(...await validateCopilotRecommendations(repoRoot, commands));
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
      let metadata = null;
      if (surface.frontmatter) try {
        metadata = validateFrontmatter(content, surface.frontmatter);
      } catch (error) {
        findings.push({ surface: surface.label, command, filePath, status: "normalized-drift", detail: `Malformed wrapper frontmatter: ${error.message}` });
      }
      const commandMetadata = commands.find((item) => item.command === command);
      for (const detail of commandPresentationFindings(surface, commandMetadata, content, metadata)) {
        findings.push({ surface: surface.label, command, filePath, status: "normalized-drift", detail });
      }
      for (const detail of commandPolicyFindings(surface, commandMetadata, content, metadata)) {
        findings.push({ surface: surface.label, command, filePath, status: "normalized-drift", detail });
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
      try {
        validateFrontmatter(await readFile(filePath, "utf8"), root.includes("opencode") ? "opencodeAgent" : "claudeAgent");
      } catch (error) {
        findings.push({ surface: root.includes("opencode") ? "OpenCode Agent" : "Claude Agent", command: file, filePath, status: "normalized-drift", detail: `Malformed agent frontmatter: ${error.message}` });
      }
    }
  }
  const methodologyAgents = delegatedAgents.filter((agent) => agent.kind === "methodology");
  for (const surface of [{ key: "claude", label: "Claude Agent", root: ".claude/agents" }, { key: "codex", label: "Codex Agent", root: ".codex/agents" }]) {
    const expected = new Set(methodologyAgents.map((agent) => path.relative(surface.root, agent.hosts[surface.key])));
    const actual = await filesUnder(path.join(repoRoot, surface.root));
    for (const file of actual) {
      if (!expected.has(file)) findings.push({ surface: surface.label, command: file, filePath: path.join(repoRoot, surface.root, file), status: "unsupported-extra", detail: "Unexpected agent wrapper file present" });
    }
    for (const file of expected) {
      if (!actual.includes(file)) findings.push({ surface: surface.label, command: file, filePath: path.join(repoRoot, surface.root, file), status: "missing", detail: "Expected agent wrapper is missing" });
    }
  }
  const codexContracts = new Map(methodologyAgents.map((agent) => [path.relative(".codex/agents", agent.hosts.codex), agent]));
  for (const file of await filesUnder(path.join(repoRoot, ".codex/agents"))) {
    const filePath = path.join(repoRoot, ".codex/agents", file);
    try {
      const fallbackId = file.startsWith("sddp-") && file.endsWith(".toml") ? file.slice(5, -5) : file;
      const contract = codexContracts.get(file) ?? { id: fallbackId, canonicalPath: `.github/agents/_${fallbackId}.md` };
      if (!validateCodexToml(await readFile(filePath, "utf8"), contract)) throw new Error("stale Codex agent metadata");
    } catch (error) {
      findings.push({ surface: "Codex Agent", command: file, filePath, status: "normalized-drift", detail: `Malformed or stale Codex agent TOML: ${error.message}` });
    }
  }
  return { findings, rows };
}
