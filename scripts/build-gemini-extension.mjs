#!/usr/bin/env node

import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publicCommands } from "./lib/public-commands.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const EXTENSION_NAME = "sdd-pilot";
const DEFAULT_OUTPUT = path.join(repoRoot, ".build", EXTENSION_NAME);
const DEFAULT_VERSION = normalizeVersion(process.env.GEMINI_EXTENSION_VERSION ?? process.env.GITHUB_REF_NAME ?? "0.0.0-dev");
const INIT_PROJECT_TEMPLATE_ASSETS = [
  { sourcePath: path.join(repoRoot, "project-instructions.md"), targetFileName: "project-instructions.template.md", label: "project instructions template" },
  { sourcePath: path.join(repoRoot, "AGENTS.md"), targetFileName: "AGENTS.template.md", label: "workspace AGENTS template" },
  { sourcePath: path.join(repoRoot, "GEMINI.md"), targetFileName: "GEMINI.template.md", label: "workspace GEMINI template" },
];
const MARKDOWN_COMPRESSION_ASSETS = [
  {
    sourcePath: path.join(repoRoot, "scripts", "compress-markdown.mjs"),
    targetRelativePath: path.join("assets", "scripts", "compress-markdown.mjs"),
    label: "markdown compression CLI",
  },
  {
    sourcePath: path.join(repoRoot, "scripts", "lib", "markdown-compression.mjs"),
    targetRelativePath: path.join("assets", "scripts", "lib", "markdown-compression.mjs"),
    label: "markdown compression library",
  },
];

async function main() {
  const options = parseArgs(process.argv.slice(2));

  await rm(options.output, { force: true, recursive: true });
  await mkdir(options.output, { recursive: true });

  await writeManifest(options.output, options.version);
  await copyContext(options.output);
  await writeCommands(options.output);

  for (const command of publicCommands) {
    await buildSkillBundle(command, options.output);
  }

  await validateBuild(options.output, options.version);

  console.log(`Built Gemini extension at ${path.relative(repoRoot, options.output)}`);
  console.log(`Version: ${options.version}`);
  console.log(`Commands: ${publicCommands.length}`);
  console.log(`Skills: ${publicCommands.length}`);
}

function parseArgs(argv) {
  const options = {
    output: DEFAULT_OUTPUT,
    version: DEFAULT_VERSION,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output") {
      const value = argv[index + 1];
      if (!value) throw new Error("Missing value for --output");
      options.output = path.resolve(value);
      index += 1;
      continue;
    }
    if (arg === "--version") {
      const value = argv[index + 1];
      if (!value) throw new Error("Missing value for --version");
      options.version = normalizeVersion(value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function normalizeVersion(version) {
  return version.replace(/^v/, "");
}

async function writeManifest(outputDir, version) {
  const manifest = {
    name: EXTENSION_NAME,
    version,
    description:
      "Spec-Driven Development (SDD) workflows for Gemini CLI: specify, plan, implement, and quality-check features with structured AI-assisted pipelines.",
    contextFileName: "GEMINI.md",
  };

  await writeTextFile(path.join(outputDir, "gemini-extension.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

async function copyContext(outputDir) {
  const source = path.join(repoRoot, "gemini-extension", "GEMINI.md");
  const target = path.join(outputDir, "GEMINI.md");
  const content = await readRequiredTextFile(source, "Gemini extension context file");
  await writeTextFile(target, content);
}

async function writeCommands(outputDir) {
  const commandsDir = path.join(outputDir, "commands");
  await mkdir(commandsDir, { recursive: true });

  for (const command of publicCommands) {
    const filePath = path.join(commandsDir, `${command.command}.toml`);
    const prompt = [
      `You are executing the SDD Pilot Gemini CLI command \`/${command.command}\`.`,
      "",
      `Activate and follow the \`${command.skill}\` skill from this extension as the primary workflow.`,
      "Treat the user's command arguments as the input to this workflow.",
      "If no arguments were provided, continue using the current workspace context.",
      "",
      "User arguments:",
      "{{args}}",
    ].join("\n");

    const toml = [
      `description = ${tomlBasicString(command.description)}`,
      "prompt = \"\"\"",
      prompt,
      "\"\"\"",
      "",
    ].join("\n");

    await writeTextFile(filePath, toml);
  }
}

async function buildSkillBundle(command, outputDir) {
  const skillOutputDir = path.join(outputDir, "skills", command.skill);
  const workflowSourcePath = path.join(repoRoot, ".agents", "workflows", command.workflowFile);

  const dependencies = await collectDependencies(command.skill, workflowSourcePath);

  await mkdir(skillOutputDir, { recursive: true });
  await writeRootSkillFile(workflowSourcePath, command, skillOutputDir);

  for (const dependencySkill of [...dependencies.skills].sort()) {
    const dependencySourceDir = path.join(repoRoot, ".github", "skills", dependencySkill);
    const dependencyTargetDir = path.join(skillOutputDir, "references", "shared-skills", dependencySkill);

    await copyDirectory(dependencySourceDir, dependencyTargetDir, {
      mountPrefix: `references/shared-skills/${dependencySkill}`,
      ownedSkillName: dependencySkill,
      rootSkillName: command.skill,
      includeTemplateAsset: dependencySkill === "init-project",
      includeMarkdownCompressionAssets: dependencySkill === "markdown-compression",
    });
  }

  for (const agentFile of [...dependencies.agents].sort()) {
    const source = path.join(repoRoot, ".github", "agents", agentFile);
    const target = path.join(skillOutputDir, "references", "shared-agents", agentFile);
    await copyFile(source, target, {
      mountPrefix: "references/shared-agents",
      ownedSkillName: null,
      rootSkillName: command.skill,
    });
  }

  for (const instructionFile of [...dependencies.instructions].sort()) {
    const source = path.join(repoRoot, ".github", "instructions", instructionFile);
    const target = path.join(skillOutputDir, "references", "shared-instructions", instructionFile);
    await copyFile(source, target, {
      mountPrefix: "references/shared-instructions",
      ownedSkillName: null,
      rootSkillName: command.skill,
    });
  }
}

async function writeRootSkillFile(workflowSourcePath, command, skillOutputDir) {
  const sourceText = await readFile(workflowSourcePath, "utf8");
  const { body, description } = parseFrontmatter(sourceText);
  const synthesized = [
    "---",
    `name: ${command.skill}`,
    `description: ${JSON.stringify(description ?? command.description)}`,
    "---",
    "",
    body.trimStart(),
    "",
  ].join("\n");
  const rewritten = rewriteBundledContent(synthesized, {
    mountPrefix: "",
    ownedSkillName: null,
    rootSkillName: command.skill,
    isRootSkillFile: true,
  });
  await writeTextFile(path.join(skillOutputDir, "SKILL.md"), rewritten);
}

async function collectDependencies(rootSkillName, rootFilePath) {
  const state = {
    agents: new Set(),
    instructions: new Set(),
    scanned: new Set(),
    skills: new Set([rootSkillName]),
  };

  await scanSkillDirectory(rootSkillName, state);
  await scanMarkdownFile(rootFilePath, state);
  return state;
}

async function scanSkillDirectory(skillName, state) {
  const skillDir = path.join(repoRoot, ".github", "skills", skillName);
  for await (const filePath of walkMarkdownFiles(skillDir)) {
    await scanMarkdownFile(filePath, state);
  }
}

async function scanMarkdownFile(filePath, state) {
  if (state.scanned.has(filePath)) {
    return;
  }
  state.scanned.add(filePath);

  const content = await readFile(filePath, "utf8");

  for (const match of content.matchAll(/\.github\/skills\/([a-z0-9-]+)\//g)) {
    const skillName = match[1];
    if (!state.skills.has(skillName)) {
      state.skills.add(skillName);
      await scanSkillDirectory(skillName, state);
    }
  }

  for (const match of content.matchAll(/\.github\/agents\/([A-Za-z0-9._-]+\.md)/g)) {
    const agentFile = match[1];
    if (!state.agents.has(agentFile)) {
      state.agents.add(agentFile);
      await scanMarkdownFile(path.join(repoRoot, ".github", "agents", agentFile), state);
    }
  }

  for (const match of content.matchAll(/\.github\/instructions\/([A-Za-z0-9._\/-]+)/g)) {
    const instructionFile = match[1];
    if (!state.instructions.has(instructionFile)) {
      state.instructions.add(instructionFile);
      await scanMarkdownFile(path.join(repoRoot, ".github", "instructions", instructionFile), state);
    }
  }
}

function parseFrontmatter(content) {
  if (!content.startsWith("---\n")) {
    return { body: content, description: null };
  }

  const end = content.indexOf("\n---\n", 4);
  if (end === -1) {
    return { body: content, description: null };
  }

  const frontmatter = content.slice(4, end).split("\n");
  const body = content.slice(end + 5);
  let description = null;

  for (const line of frontmatter) {
    const match = line.match(/^description:\s*(.+)$/);
    if (match) {
      description = match[1].trim().replace(/^"|"$/g, "");
    }
  }

  return { body, description };
}

async function* walkMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walkMarkdownFiles(fullPath);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      yield fullPath;
    }
  }
}

async function copyDirectory(sourceDir, targetDir, options) {
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath, options);
      continue;
    }
    if (entry.isFile()) {
      await copyFile(sourcePath, targetPath, options);
    }
  }

  if (options.includeTemplateAsset) {
    await copyInitProjectTemplateAssets(targetDir, options);
  }

  if (options.includeMarkdownCompressionAssets) {
    await copyMarkdownCompressionAssets(targetDir, options);
  }
}

async function copyInitProjectTemplateAssets(targetDir, options) {
  for (const asset of INIT_PROJECT_TEMPLATE_ASSETS) {
    const templateTarget = path.join(targetDir, "assets", asset.targetFileName);
    if (await pathExists(templateTarget)) {
      continue;
    }

    await assertRequiredPath(asset.sourcePath, asset.label);
    await copyFile(asset.sourcePath, templateTarget, {
      mountPrefix: options.mountPrefix,
      ownedSkillName: options.ownedSkillName,
      rootSkillName: options.rootSkillName,
    });
  }
}

async function copyMarkdownCompressionAssets(targetDir, options) {
  for (const asset of MARKDOWN_COMPRESSION_ASSETS) {
    const assetTarget = path.join(targetDir, asset.targetRelativePath);
    if (await pathExists(assetTarget)) {
      continue;
    }

    await assertRequiredPath(asset.sourcePath, asset.label);
    await copyFile(asset.sourcePath, assetTarget, {
      mountPrefix: options.mountPrefix,
      ownedSkillName: options.ownedSkillName,
      rootSkillName: options.rootSkillName,
    });
  }
}

async function copyFile(sourcePath, targetPath, options) {
  await mkdir(path.dirname(targetPath), { recursive: true });

  if (!sourcePath.endsWith(".md") && !sourcePath.endsWith(".toml") && !sourcePath.endsWith(".json")) {
    const buffer = await readFile(sourcePath);
    await writeFile(targetPath, buffer);
    return;
  }

  const sourceText = await readFile(sourcePath, "utf8");
  const rewritten = rewriteBundledContent(sourceText, {
    mountPrefix: options.mountPrefix,
    ownedSkillName: options.ownedSkillName,
    rootSkillName: options.rootSkillName,
    isSkillFile: path.basename(targetPath) === "SKILL.md",
    isRootSkillFile: path.basename(targetPath) === "SKILL.md" && options.mountPrefix === "",
  });
  await writeTextFile(targetPath, rewritten);
}

function rewriteBundledContent(content, options) {
  let rewritten = content;

  rewritten = rewritten.replace(/\bscripts\/compress-markdown\.mjs\b/g, () => {
    if (options.ownedSkillName === "markdown-compression") {
      return toMountedPath(options.mountPrefix, "assets/scripts/compress-markdown.mjs");
    }
    return "scripts/compress-markdown.mjs";
  });

  rewritten = rewritten.replace(/\bscripts\/lib\/markdown-compression\.mjs\b/g, () => {
    if (options.ownedSkillName === "markdown-compression") {
      return toMountedPath(options.mountPrefix, "assets/scripts/lib/markdown-compression.mjs");
    }
    return "scripts/lib/markdown-compression.mjs";
  });

  rewritten = rewritten.replace(/\.github\/skills\/([a-z0-9-]+)\/(SKILL\.md|assets\/[A-Za-z0-9._\/-]+|references\/[A-Za-z0-9._\/-]+)/g, (_match, skillName, resourcePath) => {
    if (options.ownedSkillName && skillName === options.ownedSkillName) {
      return toMountedPath(options.mountPrefix, resourcePath);
    }
    return `references/shared-skills/${skillName}/${resourcePath}`;
  });

  rewritten = rewritten.replace(/\.github\/agents\/([A-Za-z0-9._-]+\.md)/g, (_match, agentFile) => {
    return `references/shared-agents/${agentFile}`;
  });

  rewritten = rewritten.replace(/\.github\/instructions\/([A-Za-z0-9._\/-]+)/g, (_match, instructionFile) => {
    return `references/shared-instructions/${instructionFile}`;
  });

  if (options.mountPrefix) {
    rewritten = rewritten.replace(/(^|[^A-Za-z0-9._\/-])(assets\/[A-Za-z0-9._\/-]+)/g, (match, prefix, resourcePath) => {
      if (resourcePath.startsWith("assets/shared-")) {
        return match;
      }
      return `${prefix}${toMountedPath(options.mountPrefix, resourcePath)}`;
    });

    rewritten = rewritten.replace(/(^|[^A-Za-z0-9._\/-])(references\/[A-Za-z0-9._\/-]+)/g, (match, prefix, resourcePath) => {
      if (resourcePath.startsWith("references/shared-")) {
        return match;
      }
      return `${prefix}${toMountedPath(options.mountPrefix, resourcePath)}`;
    });
  }

  if (options.isSkillFile && (options.ownedSkillName === "init-project" || (options.rootSkillName === "init-project" && options.isRootSkillFile))) {
    rewritten = rewritten.replace(
      "- Always operate on `project-instructions.md` — never create a new file",
      "- Always operate on `project-instructions.md`. If it does not exist yet, create it from `assets/project-instructions.template.md` before continuing. If `AGENTS.md` does not exist yet, create it from `assets/AGENTS.template.md`. If `GEMINI.md` does not exist yet, create it from `assets/GEMINI.template.md`. Never overwrite existing workspace files that are already present"
    );
    rewritten = rewritten.replace(
      "Read `project-instructions.md`.",
      "If `project-instructions.md` does not exist yet, create it from `assets/project-instructions.template.md` first.\nIf `AGENTS.md` does not exist yet, create it from `assets/AGENTS.template.md` first.\nIf `GEMINI.md` does not exist yet, create it from `assets/GEMINI.template.md` first.\nRead `project-instructions.md`."
    );
  }

  return rewritten;
}

function toMountedPath(mountPrefix, resourcePath) {
  if (!mountPrefix) {
    return resourcePath;
  }
  return `${mountPrefix}/${resourcePath}`;
}

function tomlBasicString(value) {
  return JSON.stringify(value);
}

async function validateBuild(outputDir, expectedVersion) {
  const manifestPath = path.join(outputDir, "gemini-extension.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const contextPath = path.join(outputDir, "GEMINI.md");

  if (manifest.name !== EXTENSION_NAME) {
    throw new Error(`Expected extension name ${EXTENSION_NAME}, found ${manifest.name}`);
  }
  if (manifest.version !== expectedVersion) {
    throw new Error(`Expected version ${expectedVersion}, found ${manifest.version}`);
  }
  if (!(await pathExists(contextPath))) {
    throw new Error(`Missing context file: ${contextPath}`);
  }

  for (const command of publicCommands) {
    const commandPath = path.join(outputDir, "commands", `${command.command}.toml`);
    const skillPath = path.join(outputDir, "skills", command.skill, "SKILL.md");
    const sharedSkillPath = path.join(outputDir, "skills", command.skill, "references", "shared-skills", command.skill, "SKILL.md");
    if (!(await pathExists(commandPath))) {
      throw new Error(`Missing command file: ${commandPath}`);
    }
    if (!(await pathExists(skillPath))) {
      throw new Error(`Missing skill file: ${skillPath}`);
    }
    if (!(await pathExists(sharedSkillPath))) {
      throw new Error(`Missing shared skill file: ${sharedSkillPath}`);
    }

    const markdownCompressionSkillPath = path.join(outputDir, "skills", command.skill, "references", "shared-skills", "markdown-compression", "SKILL.md");
    const markdownCompressionCliPath = path.join(outputDir, "skills", command.skill, "references", "shared-skills", "markdown-compression", "assets", "scripts", "compress-markdown.mjs");
    const markdownCompressionLibPath = path.join(outputDir, "skills", command.skill, "references", "shared-skills", "markdown-compression", "assets", "scripts", "lib", "markdown-compression.mjs");

    if (await pathExists(markdownCompressionSkillPath)) {
      if (!(await pathExists(markdownCompressionCliPath))) {
        throw new Error(`Missing markdown-compression CLI asset: ${markdownCompressionCliPath}`);
      }
      if (!(await pathExists(markdownCompressionLibPath))) {
        throw new Error(`Missing markdown-compression library asset: ${markdownCompressionLibPath}`);
      }
    }
  }

  const initProjectBundleDir = path.join(outputDir, "skills", "init-project", "references", "shared-skills", "init-project");
  const initProjectSkillPath = path.join(initProjectBundleDir, "SKILL.md");
  const initProjectSkillContent = await readFile(initProjectSkillPath, "utf8");

  for (const assetName of ["project-instructions.template.md", "AGENTS.template.md", "GEMINI.template.md"]) {
    const assetPath = path.join(initProjectBundleDir, "assets", assetName);
    if (!(await pathExists(assetPath))) {
      throw new Error(`Missing init-project template asset: ${assetPath}`);
    }
  }

  for (const assetReference of [
    "assets/project-instructions.template.md",
    "assets/AGENTS.template.md",
    "assets/GEMINI.template.md",
    "Never overwrite existing workspace files that are already present",
  ]) {
    if (!initProjectSkillContent.includes(assetReference)) {
      throw new Error(`Missing init-project bootstrap guidance: ${assetReference}`);
    }
  }
}

async function readRequiredTextFile(sourcePath, label) {
  await assertRequiredPath(sourcePath, label);
  return readFile(sourcePath, "utf8");
}

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function assertRequiredPath(sourcePath, label) {
  if (await pathExists(sourcePath)) {
    return;
  }

  throw new Error(`Missing required ${label}: ${path.relative(repoRoot, sourcePath)}`);
}

async function writeTextFile(targetPath, content) {
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, content, "utf8");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});