import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export const bootstrapDocuments = Object.freeze({
  prd: { heading: "Product Document", path: "specs/prd.md" },
  sad: { heading: "Technical Context Document", path: "specs/sad.md" },
  dod: { heading: "Deployment & Operations Document", path: "specs/dod.md" },
  plan: { heading: "Project Plan", path: "specs/project-plan.md" },
});
export const configPath = ".github/sddp-config.md";
export const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

// Check every component before reading, including an existing final component.
export function safePath(root, relative) {
  if (typeof relative !== "string" || !relative || relative.includes("\\") || /[\x00-\x1f\x7f]/.test(relative)
    || relative.includes(":") || path.posix.isAbsolute(relative)
    || relative.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error(`Unsafe repository path: ${relative}`);
  }
  let current = path.resolve(root);
  for (const part of relative.split("/")) {
    current = path.join(current, part);
    try { if (lstatSync(current).isSymbolicLink()) throw new Error(`Symlink path: ${relative}`); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  return current;
}

export function readOptional(root, relative) {
  const file = safePath(root, relative);
  if (!existsSync(file)) return null;
  if (!lstatSync(file).isFile()) throw new Error(`Not a regular file: ${relative}`);
  return readFileSync(file, "utf8");
}

export function fileDigest(root, relative) {
  const file = safePath(root, relative);
  if (!existsSync(file)) return null;
  if (!lstatSync(file).isFile()) throw new Error(`Not a regular file: ${relative}`);
  return digest(readFileSync(file));
}

export function registration(config, heading) {
  const sections = [...(config ?? "").matchAll(/^## ([^\r\n]+)\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)]
    .filter((match) => match[1] === heading);
  if (sections.length > 1) throw new Error(`Duplicate config heading: ${heading}`);
  const values = [...(sections[0]?.[2] ?? "").matchAll(/^\*\*Path\*\*:[ \t]*([^\r\n]*)/gm)];
  if (values.length > 1) throw new Error(`Duplicate registration: ${heading}`);
  return values[0]?.[1].trim() ?? "";
}

export function resolveBootstrap(root, { allowBroken = false } = {}) {
  const config = readOptional(root, configPath);
  return Object.fromEntries(Object.entries(bootstrapDocuments).map(([kind, definition]) => {
    const registered = registration(config, definition.heading);
    const target = registered || definition.path;
    safePath(root, target);
    if (!allowBroken && registered && readOptional(root, target) === null) throw new Error(`Broken ${kind} registration: ${target}`);
    return [kind, target];
  }));
}

export function registerDocuments(config, entries) {
  let result = config ?? "# SDD Project Configuration\n\n## Checklist Settings\n\n**MaxChecklistCount**: 1\n\n## Autopilot\n\n**Enabled**: false\n";
  for (const [kind, target] of entries) {
    const heading = bootstrapDocuments[kind]?.heading;
    if (!heading) continue;
    registration(result, heading); // reject ambiguous existing config
    const start = result.match(new RegExp(`^## ${heading}\\r?\\n`, "m"))?.index ?? -1;
    if (start < 0) result += `\n## ${heading}\n\n**Path**: ${target}\n`;
    else {
      const end = result.indexOf("\n## ", start + 3);
      const section = result.slice(start, end < 0 ? result.length : end);
      const replacement = /^\*\*Path\*\*:/m.test(section)
        ? section.replace(/^\*\*Path\*\*:[^\r\n]*/m, `**Path**: ${target}`)
        : `${section.trimEnd()}\n\n**Path**: ${target}\n`;
      result = result.slice(0, start) + replacement + (end < 0 ? "" : result.slice(end));
    }
  }
  return result;
}

export function metadata(source) {
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] ?? "";
  const result = {};
  for (const line of frontmatter.split(/\r?\n/)) {
    const match = line.match(/^([\w-]+):\s*(.*?)\s*$/);
    if (!match) continue;
    if (Object.hasOwn(result, match[1])) throw new Error(`Duplicate metadata: ${match[1]}`);
    result[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return result;
}

export function jsonBlock(source, marker) {
  const token = `<!-- ${marker} -->`;
  const count = source.split(token).length - 1;
  if (!count) return null;
  if (count !== 1) throw new Error(`Duplicate ${marker} block`);
  const match = source.slice(source.indexOf(token) + token.length).match(/^\s*```json\r?\n([\s\S]*?)\r?\n```/);
  if (!match) throw new Error(`Malformed ${marker} JSON block`);
  return JSON.parse(match[1]);
}

const skipped = new Set([".git", "node_modules", "vendor", "dist", "build", ".build", "target", ".next", ".venv", "__pycache__", ".terraform"]);
export function sensitivePath(relative) {
  const privateNames = new Set([".aws", ".ssh", ".kube", ".docker", ".netrc", "_netrc", ".npmrc", ".pypirc"]);
  return relative.split("/").some((part) => privateNames.has(part.toLowerCase())
    || /^\.env(?:\.|$)/i.test(part) && !/^\.env\.(?:example|sample|template)$/i.test(part)
    || /\.(?:pem|key|p12|pfx|tfstate)(?:\.|$)/i.test(part)
    || /\.tfvars(?:\.json)?$/i.test(part)
    || /^(?:credentials|secrets)(?:\.|$)/i.test(part)
    || /^(?:id_rsa|id_ed25519|customer-data|production-data)$/i.test(part));
}

export function inventory(root, prefixes = []) {
  const files = [];
  const walk = (relative = "") => {
    for (const entry of readdirSync(relative ? safePath(root, relative) : root, { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink() || skipped.has(entry.name) || sensitivePath(name)
        || name === "specs/reverse-engineering.md" || name.startsWith("specs/reverse-engineering/")) continue;
      if (entry.isDirectory()) walk(name);
      else if (entry.isFile() && (!prefixes.length || prefixes.some((prefix) => name === prefix || name.startsWith(`${prefix}/`)))) files.push(name);
    }
  };
  for (const prefix of prefixes) safePath(root, prefix);
  walk();
  return files.sort();
}

export function detectRepositoryState(root) {
  // Template governance and installed framework assets do not establish application code.
  const excluded = /^(?:\.github|\.agents|\.claude|\.codex|\.opencode|\.windsurf|\.vscode|templates)\//;
  const frameworkScript = /^scripts\/(?:(?:lib\/(?:bootstrap-documents|onboarding|canonical-workflow-graph|claude-agent-graph|codex-delegate-graph|copilot-delegate-graph|delegated-agent-host-policy|delegated-agents|feature-directory|markdown-compression|opencode-delegate-graph|public-commands|qc-bug-tasks|qc-evidence|workflow-state|wrapper-inventory|wrapper-parsers))|(?:assert-release-archive-layout|checklist-state|compress-markdown|derive-completion-state|drift-report|ensure-implement-state-ignored|evaluate-feature-lifecycle|onboarding-state|record-epic-completion|parse-requirement-ownership|parse-stress-test-findings|parse-tasks|phase-gates|release-runtime-manifest|release-tag|resolve-feature-dir|runtime-preflight|validate-prd|validate-sad|validate-dod|validate-project-plan))\.mjs$/;
  const code = inventory(root).filter((file) => !excluded.test(file) && !frameworkScript.test(file) && (/\.(?:[cm]?[jt]sx?|py|rs|go|java|kt|cs|rb|php|swift|c|cpp|h|vue|svelte|html|css|scss|sass|less|tf|hcl|ya?ml|sql|sh|bash|zsh|ps1|r|exs?|cljs?|erl|hs|lua|pl|scala|dart|mm?|ipynb)$/i.test(file) || /(?:^|\/)(?:Dockerfile|Makefile|Jenkinsfile|Procfile|CMakeLists\.txt)$/.test(file)));
  return { state: code.length ? "EXISTING" : "NEW", sourceFiles: code };
}
