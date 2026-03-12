#!/usr/bin/env node

import { program } from "commander";
import { CopilotClient } from "@github/copilot-sdk";
import { loadConfig } from "./config.js";
import { parseProjectPlan } from "./project-plan.js";
import { initLogFile, logger } from "./logger.js";
import { runWaves } from "./wave-manager.js";

program
  .name("sdd-orchestrate")
  .description("SDD Project Orchestrator — runs autopilot pipeline per epic, wave-by-wave")
  .version("0.1.0")
  .option("-m, --model <model>", "LLM model to use", "gpt-4o")
  .option("-d, --dry-run", "Print execution plan and exit", false)
  .option("-r, --resume", "Skip epics that already have .qc-passed", true)
  .option("--no-resume", "Re-run all epics even if already complete")
  .option("-e, --epic <id>", "Run only a specific epic (e.g. E001)")
  .option("-w, --wave <number>", "Start from wave number", "1")
  .option("-s, --sequential", "Disable parallel execution of [P] epics", false)
  .option("-t, --timeout <ms>", "Per-epic timeout in milliseconds", String(60 * 60 * 1000))
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
}): Promise<void> {
  const config = loadConfig({
    model: opts.model,
    dryRun: opts.dryRun,
    resume: opts.resume,
    epic: opts.epic,
    wave: parseInt(opts.wave, 10),
    sequential: opts.sequential,
    timeout: parseInt(opts.timeout, 10),
  });

  initLogFile(config.workspaceRoot);

  logger.banner("SDD Orchestrator");
  logger.info(`Model: ${config.model}`);
  logger.info(`Resume: ${config.resume}`);
  logger.info(`Sequential: ${config.sequential}`);
  logger.info(`Timeout: ${Math.round(config.timeout / 60000)}min per epic`);
  if (config.epicFilter) logger.info(`Epic filter: ${config.epicFilter}`);
  if (config.startWave > 1) logger.info(`Starting from wave: ${config.startWave}`);

  // Parse the project plan
  const waves = parseProjectPlan(config.workspaceRoot, config.projectPlanPath);

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

  // Dry-run: print plan and exit
  if (config.dryRun) {
    logger.info("\n--dry-run specified. Exiting without running.");
    return;
  }

  // Start Copilot SDK client
  logger.banner("Starting Copilot Client");
  const client = new CopilotClient();

  try {
    await client.start();
    logger.success("Copilot client started");

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
