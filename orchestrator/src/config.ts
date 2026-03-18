import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { OrchestratorConfig } from "./types.js";
import { logger } from "./logger.js";

interface ParsedSddpConfig {
  productDocPath: string;
  techContextDocPath: string;
  dodPath?: string;
  projectPlanPath: string;
  autopilotEnabled: boolean;
}

function directoryHasWorkspaceMarkers(dir: string): boolean {
  return [
    join(dir, ".github", "sddp-config.md"),
    join(dir, "project-instructions.md"),
    join(dir, ".git"),
    join(dir, "specs"),
  ].some((path) => existsSync(path));
}

function resolveWorkspaceRoot(startDir: string): string {
  let currentDir = resolve(startDir);

  while (true) {
    if (directoryHasWorkspaceMarkers(currentDir)) {
      return currentDir;
    }

    const parentDir = resolve(currentDir, "..");
    if (parentDir === currentDir) {
      return resolve(startDir);
    }

    currentDir = parentDir;
  }
}

export function parseSddpConfigContent(content: string): ParsedSddpConfig {
  const parsed: ParsedSddpConfig = {
    productDocPath: "",
    techContextDocPath: "",
    projectPlanPath: "",
    autopilotEnabled: false,
  };

  for (const section of content.split(/^## /m)) {
    const pathMatch = section.match(/^\*\*Path\*\*:\s*(.*)$/m);
    const pathVal = pathMatch?.[1]?.trim() ?? "";

    if (section.startsWith("Product Document")) {
      parsed.productDocPath = pathVal;
      continue;
    }
    if (section.startsWith("Technical Context Document")) {
      parsed.techContextDocPath = pathVal;
      continue;
    }
    if (section.startsWith("Deployment & Operations Document")) {
      parsed.dodPath = pathVal || undefined;
      continue;
    }
    if (section.startsWith("Project Plan")) {
      parsed.projectPlanPath = pathVal;
      continue;
    }
    if (section.startsWith("Autopilot")) {
      const enabledMatch = section.match(/^\*\*Enabled\*\*:\s*(.*)$/m);
      parsed.autopilotEnabled = enabledMatch?.[1]?.trim().toLowerCase() === "true";
    }
  }

  return parsed;
}

export function applyDefaultDocumentPaths(workspaceRoot: string, parsed: ParsedSddpConfig): ParsedSddpConfig {
  const resolvedConfig: ParsedSddpConfig = { ...parsed };

  if (!resolvedConfig.productDocPath && existsSync(join(workspaceRoot, "specs", "prd.md"))) {
    resolvedConfig.productDocPath = "specs/prd.md";
  }
  if (!resolvedConfig.techContextDocPath && existsSync(join(workspaceRoot, "specs", "sad.md"))) {
    resolvedConfig.techContextDocPath = "specs/sad.md";
  }
  if (!resolvedConfig.dodPath && existsSync(join(workspaceRoot, "specs", "dod.md"))) {
    resolvedConfig.dodPath = "specs/dod.md";
  }
  if (!resolvedConfig.projectPlanPath && existsSync(join(workspaceRoot, "specs", "project-plan.md"))) {
    resolvedConfig.projectPlanPath = "specs/project-plan.md";
  }

  return resolvedConfig;
}

export function getMissingConfigPrerequisites(workspaceRoot: string, parsed: ParsedSddpConfig): string[] {
  const errors: string[] = [];

  if (!parsed.productDocPath || !existsSync(join(workspaceRoot, parsed.productDocPath))) {
    const expectedPath = parsed.productDocPath || "specs/prd.md";
    errors.push(`Product Document (${expectedPath}) not found. Run /sddp-prd first or register an existing product document.`);
  }
  if (!parsed.techContextDocPath || !existsSync(join(workspaceRoot, parsed.techContextDocPath))) {
    const expectedPath = parsed.techContextDocPath || "specs/sad.md";
    errors.push(`Technical Context Document (${expectedPath}) not found. Run /sddp-systemdesign first or register an existing technical context document.`);
  }
  if (!parsed.projectPlanPath || !existsSync(join(workspaceRoot, parsed.projectPlanPath))) {
    const expectedPath = parsed.projectPlanPath || "specs/project-plan.md";
    errors.push(`Project Plan (${expectedPath}) not found. Run /sddp-projectplan first or register an existing project plan.`);
  }

  return errors;
}

/**
 * Load orchestrator config from .github/sddp-config.md and merge with CLI options.
 * Validates that mandatory prerequisites exist.
 */
export function loadConfig(cliOpts: {
  model: string;
  dryRun: boolean;
  resume: boolean;
  epic?: string;
  wave: number;
  sequential: boolean;
  timeout: number;
  listModels: boolean;
  reasoningEffort?: string;
}): OrchestratorConfig {
  const currentDir = resolve(process.cwd());
  const workspaceRoot = resolveWorkspaceRoot(currentDir);
  const configPath = join(workspaceRoot, ".github", "sddp-config.md");

  if (workspaceRoot !== currentDir) {
    logger.info(`Detected workspace root: ${workspaceRoot}`);
  }

  // If listing models, we don't need any of the config file stuff
  if (cliOpts.listModels) {
    return {
      model: cliOpts.model,
      dryRun: cliOpts.dryRun,
      resume: cliOpts.resume,
      epicFilter: cliOpts.epic,
      startWave: cliOpts.wave,
      sequential: cliOpts.sequential,
      timeout: cliOpts.timeout,
      listModels: cliOpts.listModels,
      reasoningEffort: cliOpts.reasoningEffort as any,
      workspaceRoot,
      productDocPath: "",
      techContextDocPath: "",
      projectPlanPath: "",
    };
  }

  if (!existsSync(configPath)) {
    logger.error(`Config file not found: ${configPath}`);
    logger.error("Run /sddp-init first to bootstrap the project.");
    process.exit(1);
  }

  const content = readFileSync(configPath, "utf-8");
  const parsedConfig = applyDefaultDocumentPaths(workspaceRoot, parseSddpConfigContent(content));
  const errors = getMissingConfigPrerequisites(workspaceRoot, parsedConfig);

  if (errors.length > 0) {
    for (const e of errors) logger.error(e);
    process.exit(1);
  }

  if (!parsedConfig.autopilotEnabled) {
    logger.warn("Autopilot is not enabled in sddp-config.md. The orchestrator will enable it automatically for sessions.");
  }

  // Validate reasoningEffort
  let reasoningEffort: "low" | "medium" | "high" | "xhigh" | undefined;
  if (cliOpts.reasoningEffort) {
    const validEfforts = ["low", "medium", "high", "xhigh"];
    if (validEfforts.includes(cliOpts.reasoningEffort.toLowerCase())) {
      reasoningEffort = cliOpts.reasoningEffort.toLowerCase() as any;
    } else {
      logger.warn(`Invalid reasoning-effort '${cliOpts.reasoningEffort}', valid options are: ${validEfforts.join(", ")}. Using default.`);
    }
  }

  return {
    model: cliOpts.model,
    dryRun: cliOpts.dryRun,
    resume: cliOpts.resume,
    epicFilter: cliOpts.epic,
    startWave: cliOpts.wave,
    sequential: cliOpts.sequential,
    timeout: cliOpts.timeout,
    workspaceRoot,
    productDocPath: parsedConfig.productDocPath,
    techContextDocPath: parsedConfig.techContextDocPath,
    projectPlanPath: parsedConfig.projectPlanPath,
    dodPath: parsedConfig.dodPath,
    listModels: cliOpts.listModels,
    reasoningEffort,
  };
}
