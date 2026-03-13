import type { CopilotClient } from "@github/copilot-sdk";
import type { Epic, EpicResult, OrchestratorConfig, ProjectResult, Wave } from "./types.js";
import { runEpic, isEpicComplete } from "./epic-runner.js";
import { checkOffEpic } from "./project-plan.js";
import { logger } from "./logger.js";

/**
 * Run all epics across waves in dependency order.
 *
 * Within a wave:
 *  - [P] epics run in parallel (unless --sequential)
 *  - Non-[P] epics run sequentially
 *  - Parallel batch runs first, then sequential epics
 *
 * Between waves: strictly sequential.
 */
export async function runWaves(
  client: CopilotClient,
  waves: Wave[],
  config: OrchestratorConfig,
): Promise<ProjectResult> {
  const allResults: EpicResult[] = [];
  const failedEpicIds = new Set<string>();
  const start = Date.now();

  for (const wave of waves) {
    if (wave.number < config.startWave) {
      logger.info(`Skipping wave ${wave.number} (before --start-wave ${config.startWave})`);
      for (const epic of wave.epics) {
        allResults.push({
          epicId: epic.id,
          outcome: "SKIPPED",
          reason: "Before start-wave",
          durationMs: 0,
        });
      }
      continue;
    }

    logger.banner(`Wave ${wave.number} — ${wave.epics.length} epic(s)`);

    // Partition epics into those we'll process and those we'll skip
    const { runnable, skipped } = partitionEpics(wave.epics, config, failedEpicIds);

    // Record skipped epics
    for (const { epic, reason } of skipped) {
      logger.info(`Skipping ${epic.id} "${epic.title}" — ${reason}`, epic.id, wave.number);
      allResults.push({
        epicId: epic.id,
        outcome: "SKIPPED",
        reason,
        durationMs: 0,
      });
    }

    if (runnable.length === 0) {
      logger.info(`No runnable epics in wave ${wave.number} — advancing`);
      continue;
    }

    // Pre-flight check: prevent race conditions where a parallel epic depends on another epic in the same wave
    // that is also scheduled to run in parallel.
    if (!config.sequential) {
      const runnableIds = new Set(runnable.map((e) => e.id));
      for (const epic of runnable) {
        if (epic.parallel) {
          const conflictingDeps = epic.dependsOn.filter(dep => runnableIds.has(dep));
          if (conflictingDeps.length > 0) {
             logger.warn(`Epic ${epic.id} is marked [P] but depends on ${conflictingDeps.join(", ")} which is in the same wave. Disabling parallel execution for ${epic.id} to prevent race conditions.`, epic.id, wave.number);
             epic.parallel = false;
          }
        }
      }
    }

    // Split into parallel and sequential groups
    const parallelEpics = config.sequential ? [] : runnable.filter((e) => e.parallel);
    const sequentialEpics = config.sequential
      ? runnable
      : runnable.filter((e) => !e.parallel);

    // Run parallel batch first
    if (parallelEpics.length > 0) {
      logger.info(
        `Running ${parallelEpics.length} parallel epic(s): ${parallelEpics.map((e) => e.id).join(", ")}`,
        undefined,
        wave.number,
      );

      const settled = await Promise.allSettled(
        parallelEpics.map((epic) => runEpic(client, epic, config)),
      );

      for (let i = 0; i < settled.length; i++) {
        const settlement = settled[i];
        const epic = parallelEpics[i];

        if (settlement.status === "fulfilled") {
          const result = settlement.value;
          allResults.push(result);
          handleResult(result, epic, config, failedEpicIds);
        } else {
          const reason = settlement.reason instanceof Error
            ? settlement.reason.message
            : String(settlement.reason);
          logger.error(`Unhandled error: ${reason}`, epic.id, wave.number);
          failedEpicIds.add(epic.id);
          allResults.push({
            epicId: epic.id,
            outcome: "HALTED",
            reason,
            durationMs: 0,
          });
        }
      }
    }

    // Run sequential epics one by one
    for (const epic of sequentialEpics) {
      // Re-check dependencies after parallel batch (a dependency may have failed)
      const blockedBy = epic.dependsOn.find((dep) => failedEpicIds.has(dep));
      if (blockedBy) {
        logger.warn(
          `Skipping ${epic.id} — dependency ${blockedBy} failed`,
          epic.id,
          wave.number,
        );
        allResults.push({
          epicId: epic.id,
          outcome: "SKIPPED",
          reason: `Dependency ${blockedBy} failed`,
          durationMs: 0,
        });
        continue;
      }

      const result = await runEpic(client, epic, config);
      allResults.push(result);
      handleResult(result, epic, config, failedEpicIds);
    }

    // Wave summary
    const waveResults = allResults.filter((r) =>
      wave.epics.some((e) => e.id === r.epicId),
    );
    const passed = waveResults.filter((r) => r.outcome === "PASSED").length;
    const failed = waveResults.filter((r) => r.outcome === "HALTED" || r.outcome === "TIMEOUT").length;
    logger.info(
      `Wave ${wave.number} complete: ${passed} passed, ${failed} failed, ${waveResults.length - passed - failed} skipped/manual`,
      undefined,
      wave.number,
    );
  }

  const projectResult = summarize(allResults, start);
  printSummary(projectResult, allResults);
  return projectResult;
}

// ── Helpers ──────────────────────────────────────────────────────────────

interface PartitionResult {
  runnable: Epic[];
  skipped: { epic: Epic; reason: string }[];
}

function partitionEpics(
  epics: Epic[],
  config: OrchestratorConfig,
  failedEpicIds: Set<string>,
): PartitionResult {
  const runnable: Epic[] = [];
  const skipped: { epic: Epic; reason: string }[] = [];

  for (const epic of epics) {
    // Epic filter
    if (config.epicFilter && epic.id !== config.epicFilter) {
      skipped.push({ epic, reason: "Filtered out by --epic" });
      continue;
    }

    // Already complete (resume mode)
    if (config.resume && (epic.completed || isEpicComplete(config.workspaceRoot, epic))) {
      skipped.push({ epic, reason: "Already complete (.qc-passed exists)" });
      continue;
    }

    // Dependency failed
    const blockedBy = epic.dependsOn.find((dep) => failedEpicIds.has(dep));
    if (blockedBy) {
      skipped.push({ epic, reason: `Dependency ${blockedBy} failed` });
      failedEpicIds.add(epic.id); // Cascade failure
      continue;
    }

    runnable.push(epic);
  }

  return { runnable, skipped };
}

function handleResult(
  result: EpicResult,
  epic: Epic,
  config: OrchestratorConfig,
  failedEpicIds: Set<string>,
): void {
  if (result.outcome === "PASSED") {
    // Check off epic in project-plan.md
    try {
      checkOffEpic(config.workspaceRoot, config.projectPlanPath, epic.id);
      logger.success(`Checked off ${epic.id} in project plan`, epic.id);
    } catch (err) {
      logger.warn(
        `Failed to check off ${epic.id}: ${err instanceof Error ? err.message : String(err)}`,
        epic.id,
      );
    }
  } else if (result.outcome === "HALTED" || result.outcome === "TIMEOUT") {
    failedEpicIds.add(epic.id);
  }
}

function summarize(results: EpicResult[], startTime: number): ProjectResult {
  return {
    results,
    passed: results.filter((r) => r.outcome === "PASSED").length,
    failed: results.filter((r) => r.outcome === "HALTED" || r.outcome === "TIMEOUT").length,
    skipped: results.filter((r) => r.outcome === "SKIPPED").length,
    totalDurationMs: Date.now() - startTime,
  };
}

function printSummary(project: ProjectResult, results: EpicResult[]): void {
  logger.banner("Orchestrator Summary");

  const minutes = Math.round(project.totalDurationMs / 60000);
  logger.info(`Total: ${results.length} epics in ${minutes}min`);
  logger.success(`Passed: ${project.passed}`);
  if (project.failed > 0) logger.error(`Failed: ${project.failed}`);
  if (project.skipped > 0) logger.info(`Skipped: ${project.skipped}`);

  const manual = results.filter((r) => r.outcome === "NEEDS_MANUAL");
  if (manual.length > 0) {
    logger.warn(`Needs manual verification: ${manual.map((r) => r.epicId).join(", ")}`);
  }

  const halted = results.filter((r) => r.outcome === "HALTED" || r.outcome === "TIMEOUT");
  if (halted.length > 0) {
    logger.banner("Failed Epics");
    for (const r of halted) {
      logger.error(`${r.epicId}: ${r.reason ?? "unknown"}`, r.epicId);
    }
  }
}
