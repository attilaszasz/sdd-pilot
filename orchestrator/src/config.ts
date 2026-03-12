import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { OrchestratorConfig } from "./types.js";
import { logger } from "./logger.js";

/** Parse a **Key**: value line from sddp-config.md */
function extractConfigValue(content: string, key: string): string {
  const regex = new RegExp(`^\\*\\*${key}\\*\\*:\\s*(.*)$`, "m");
  const match = content.match(regex);
  return match?.[1]?.trim() ?? "";
}

/** Resolve a path relative to the workspace root, or return undefined if empty */
function resolvePath(workspaceRoot: string, raw: string): string | undefined {
  if (!raw) return undefined;
  return resolve(workspaceRoot, raw);
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
}): OrchestratorConfig {
  const workspaceRoot = resolve(process.cwd());
  const configPath = join(workspaceRoot, ".github", "sddp-config.md");

  if (!existsSync(configPath)) {
    logger.error(`Config file not found: ${configPath}`);
    logger.error("Run /sddp-init first to bootstrap the project.");
    process.exit(1);
  }

  const content = readFileSync(configPath, "utf-8");

  const productDocRaw = extractConfigValue(content, "Path") ?? "";
  // sddp-config has multiple **Path** entries; parse by section
  const sections = content.split(/^## /m);
  let productDocPath = "";
  let techContextDocPath = "";
  let dodPath: string | undefined;
  let projectPlanPath = "";
  let autopilotEnabled = false;

  for (const section of sections) {
    const pathMatch = section.match(/^\*\*Path\*\*:\s*(.*)$/m);
    const pathVal = pathMatch?.[1]?.trim() ?? "";

    if (section.startsWith("Product Document")) {
      productDocPath = pathVal;
    } else if (section.startsWith("Technical Context Document")) {
      techContextDocPath = pathVal;
    } else if (section.startsWith("Deployment & Operations Document")) {
      dodPath = pathVal || undefined;
    } else if (section.startsWith("Project Plan")) {
      projectPlanPath = pathVal;
    } else if (section.startsWith("Autopilot")) {
      const enabledMatch = section.match(/^\*\*Enabled\*\*:\s*(.*)$/m);
      autopilotEnabled = enabledMatch?.[1]?.trim().toLowerCase() === "true";
    }
  }

  // Auto-detect well-known paths if not registered
  if (!productDocPath && existsSync(join(workspaceRoot, "specs", "prd.md"))) {
    productDocPath = "specs/prd.md";
  }
  if (!techContextDocPath && existsSync(join(workspaceRoot, "specs", "sad.md"))) {
    techContextDocPath = "specs/sad.md";
  }
  if (!dodPath && existsSync(join(workspaceRoot, "specs", "dod.md"))) {
    dodPath = "specs/dod.md";
  }
  if (!projectPlanPath && existsSync(join(workspaceRoot, "specs", "project-plan.md"))) {
    projectPlanPath = "specs/project-plan.md";
  }

  // Validate mandatory files
  const errors: string[] = [];

  if (!productDocPath || !existsSync(join(workspaceRoot, productDocPath))) {
    errors.push("Product Document (specs/prd.md) not found. Run /sddp-prd first.");
  }
  if (!techContextDocPath || !existsSync(join(workspaceRoot, techContextDocPath))) {
    errors.push("Technical Context Document (specs/sad.md) not found. Run /sddp-systemdesign first.");
  }
  if (!projectPlanPath || !existsSync(join(workspaceRoot, projectPlanPath))) {
    errors.push("Project Plan (specs/project-plan.md) not found. Run /sddp-projectplan first.");
  }

  if (errors.length > 0) {
    for (const e of errors) logger.error(e);
    process.exit(1);
  }

  if (!autopilotEnabled) {
    logger.warn("Autopilot is not enabled in sddp-config.md. The orchestrator will enable it automatically for sessions.");
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
    productDocPath,
    techContextDocPath,
    projectPlanPath,
    dodPath,
  };
}
