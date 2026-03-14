#!/usr/bin/env node

import { program } from "commander";
import { loadConfig } from "./config.js";
import { parseProjectPlan } from "./project-plan.js";
import { initLogFile, logger } from "./logger.js";
import { runWaves } from "./wave-manager.js";
import { verifyGitState } from "./git.js";


program
  .name("sdd-orchestrate")
  .description("SDD Project Orchestrator — runs autopilot pipeline per epic, wave-by-wave")
  .version("0.1.0")
  .option("-m, --model <model>", "LLM model to use", "gpt-5.4")
  .option("-d, --dry-run", "Print execution plan and exit", false)
  .option("-r, --resume", "Skip epics that already have .qc-passed", true)
  .option("--no-resume", "Re-run all epics even if already complete")
  .option("-e, --epic <id>", "Run only a specific epic (e.g. E001)")
  .option("-w, --wave <number>", "Start from wave number", "1")
  .option("-s, --sequential", "Disable parallel execution of [P] epics", false)
  .option("-t, --timeout <minutes>", "Per-epic timeout in minutes", "60")
  .option("--list-models", "Print available models and exit", false)
  .option("--reasoning-effort <level>", "Reasoning effort ('low', 'medium', 'high', 'xhigh') for supported models", "high")
  .action(run);

program.parse();

async function run(opts: {
  model: string;
  dryRun: boolean;
  resume: boolean;
  epic?: string;
  wave: string;
  sequential: boolean;
  timeout: string;
  listModels: boolean;
  reasoningEffort?: string;
}): Promise<void> {
  const config = loadConfig({
    model: opts.model,
    dryRun: opts.dryRun,
    resume: opts.resume,
    epic: opts.epic,
    wave: parseInt(opts.wave, 10),
    sequential: opts.sequential,
    timeout: parseInt(opts.timeout, 10) * 60 * 1000,
    listModels: opts.listModels,
    reasoningEffort: opts.reasoningEffort,
  });

  if (!config.listModels) {
    initLogFile(config.workspaceRoot);
  }

  logger.banner("SDD Orchestrator");
  logger.info(`Model: ${config.model}`);
  logger.info(`Resume: ${config.resume}`);
  logger.info(`Sequential: ${config.sequential}`);
  logger.info(`Timeout: ${Math.round(config.timeout / 60000)}min per epic`);
  if (config.reasoningEffort) logger.info(`Reasoning Effort: ${config.reasoningEffort}`);
  if (config.epicFilter) logger.info(`Epic filter: ${config.epicFilter}`);
  if (config.startWave > 1) logger.info(`Starting from wave: ${config.startWave}`);

  const waves = config.listModels ? [] : parseProjectPlan(config.workspaceRoot, config.projectPlanPath);

  if (!config.listModels) {
    const totalEpics = waves.reduce((sum, w) => sum + w.epics.length, 0);
    logger.info(`Parsed ${totalEpics} epics across ${waves.length} waves`);

    for (const wave of waves) {
      const epicList = wave.epics
        .map((e) => {
          const flags: string[] = [e.priority as string, e.category as string];
          if (e.parallel) flags.push("P");
          if (e.completed) flags.push("DONE");
          return `  ${e.id} [${flags.join(", ")}] ${e.title}`;
        })
        .join("\n");
      logger.info(`\nWave ${wave.number}:\n${epicList}`);
    }
  }

  // Dry-run: print plan and exit
  if (config.dryRun && !config.listModels) {
    logger.info("\n--dry-run specified. Exiting without running.");
    return;
  }

  // Verify git state before continuing
  if (!config.listModels) {
    verifyGitState(config.workspaceRoot);
  }

  // Start Copilot SDK client
  logger.banner("Starting Copilot Client");
  const { CopilotClient } = await import("@github/copilot-sdk");
  const client = new CopilotClient();

  try {
    await client.start();
    logger.success("Copilot client started");

    if (config.listModels) {
      try {
        const models = await client.listModels();
        logger.banner("Available Models");
        for (const m of models) {
          console.log(`- ${m.id}`);
        }
      } catch (err) {
        logger.error(`Failed to fetch models: ${err instanceof Error ? err.message : String(err)}`);
        logger.info("Are you authenticated with GitHub Copilot?");
        process.exitCode = 1;
      }
      return;
    }

    const result = await runWaves(client, waves, config);

    // Exit code based on results
    if (result.failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    await client.stop();
    logger.info("Copilot client stopped");
  }
}
