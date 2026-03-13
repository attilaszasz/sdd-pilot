import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { CopilotClient } from "@github/copilot-sdk";
import { approveAll } from "@github/copilot-sdk";
import type { Epic, EpicResult, OrchestratorConfig } from "./types.js";
import { createAutoAnswerHandler } from "./auto-answer.js";
import { epicTitleToSlug } from "./project-plan.js";
import { logger } from "./logger.js";

/**
 * Build the autopilot prompt for an epic.
 * This mirrors .github/prompts/sddp-autopilot.prompt.md with the epic's
 * specify-input description as $ARGUMENTS.
 */
function buildAutopilotPrompt(epic: Epic): string {
  return `${epic.specifyInputDescription}`;
}

/**
 * Build the system message for the autopilot session.
 * This contains the full autopilot instruction set from sddp-autopilot.prompt.md.
 */
function buildSystemMessage(): string {
  return `You are running the **Autopilot Pipeline** — a fully automated SDD workflow that executes all phases (Specify → Clarify → Plan → Checklist → Tasks → Analyze → Implement+QC) in a single uninterrupted turn without user interaction. Every decision point uses the recommended/default option and is logged to \`autopilot-log.md\`.

Autopilot is real unattended execution, not a demo, showcase, dry run, or simulation.
Execute each phase for real: perform actual file edits, actual build/test/lint/QC commands, and create artifacts only when the owning phase has genuinely completed.
Never simulate implementation, QC, test results, or marker creation. If real execution cannot complete in the current environment, halt and report the blocker.

Load and follow the workflow in \`.github/skills/autopilot-pipeline/SKILL.md\`.

The pipeline skill will instruct you to load and execute these sub-skills inline, in order:
1. **Specify** → \`.github/skills/specify-feature/SKILL.md\`
2. **Clarify** → \`.github/skills/clarify-spec/SKILL.md\`
3. **Plan** → \`.github/skills/plan-feature/SKILL.md\`
4. **Checklist** → \`.github/skills/generate-checklist/SKILL.md\` (looped until queue exhausted)
5. **Tasks** → \`.github/skills/generate-tasks/SKILL.md\`
6. **Analyze** → \`.github/skills/analyze-compliance/SKILL.md\`
7. **Implement+QC** → \`.github/skills/implement-qc-loop/SKILL.md\`

When any sub-skill says **Delegate**, read the referenced sub-agent file **at that point, not before** — then perform the task yourself:
- **Delegate: Context Gatherer** → \`.github/agents/_context-gatherer.md\`
- **Delegate: Task Tracker** → \`.github/agents/_task-tracker.md\`
- **Delegate: Developer** → \`.github/agents/_developer.md\`
- **Delegate: Checklist Reader** → \`.github/agents/_checklist-reader.md\`
- **Delegate: Test Evaluator** → \`.github/agents/_test-evaluator.md\`
- **Delegate: Technical Researcher** → \`.github/agents/_technical-researcher.md\`
- **Delegate: QC Auditor** → \`.github/agents/_qc-auditor.md\`
- **Delegate: Story Verifier** → \`.github/agents/_story-verifier.md\`
- **Delegate: Policy Auditor** → \`.github/agents/_policy-auditor.md\`
- **Delegate: Test Planner** → \`.github/agents/_test-planner.md\`

**AUTOPILOT = true** for all phases. At every user interaction point, choose the recommended default and log the decision — never prompt the user.

Report progress at each phase boundary. Only halt for the conditions defined in the pipeline skill.`;
}

/**
 * Resolve the expected feature directory for this epic.
 * The context gatherer auto-creates specs/NNNNN-slug/ directories;
 * we predict what it will be so we can check for .qc-passed afterward.
 */
function resolveFeatureDir(workspaceRoot: string, epic: Epic): string | undefined {
  const specsDir = join(workspaceRoot, "specs");
  if (!existsSync(specsDir)) return undefined;

  const slug = epicTitleToSlug(epic.title);
  const entries = readdirSync(specsDir, { withFileTypes: true })
    .filter((e: { isDirectory(): boolean }) => e.isDirectory())
    .map((e: { name: string }) => e.name)
    .sort();

  // Look for existing directory matching this epic's slug
  for (const dir of entries) {
    if (dir.replace(/^\d+-/, "").startsWith(slug)) {
      return join("specs", dir);
    }
  }

  // Predict the next directory number
  let maxNum = 0;
  for (const dir of entries) {
    const numMatch = dir.match(/^(\d{5})-/);
    if (numMatch) {
      maxNum = Math.max(maxNum, parseInt(numMatch[1], 10));
    }
  }
  const nextNum = String(maxNum + 1).padStart(5, "0");
  return join("specs", `${nextNum}-${slug}`);
}

/**
 * Scan specs/ for a directory containing .qc-passed that matches this epic.
 * More reliable than predicting — checks all dirs after the session completes.
 */
function findFeatureDirWithQcPassed(workspaceRoot: string, epic: Epic): string | undefined {
  const specsDir = join(workspaceRoot, "specs");
  if (!existsSync(specsDir)) return undefined;

  const slug = epicTitleToSlug(epic.title);
  const entries = readdirSync(specsDir, { withFileTypes: true })
    .filter((e: { isDirectory(): boolean }) => e.isDirectory())
    .map((e: { name: string }) => e.name);

  // First: exact slug match with .qc-passed
  for (const dir of entries) {
    const bareName = dir.replace(/^\d+-/, "");
    if (bareName.startsWith(slug) && existsSync(join(specsDir, dir, ".qc-passed"))) {
      return join("specs", dir);
    }
  }

  // Fallback: any new directory with .qc-passed (for when slug doesn't match exactly)
  // This is a heuristic — works when processing one epic at a time
  return undefined;
}

/**
 * Check if this epic is already complete (has .qc-passed marker).
 */
export function isEpicComplete(workspaceRoot: string, epic: Epic): boolean {
  return findFeatureDirWithQcPassed(workspaceRoot, epic) != null;
}

/**
 * Run a single epic through the autopilot pipeline in its own Copilot session.
 */
export async function runEpic(
  client: CopilotClient,
  epic: Epic,
  config: OrchestratorConfig,
): Promise<EpicResult> {
  const start = Date.now();
  const featureDirPrediction = resolveFeatureDir(config.workspaceRoot, epic);

  logger.info(
    `Starting autopilot: "${epic.title}" (${epic.priority}, ${epic.category})`,
    epic.id,
    epic.wave,
  );
  if (featureDirPrediction) {
    logger.info(`Expected feature dir: ${featureDirPrediction}`, epic.id);
  }

  try {
    const session = await client.createSession({
      model: config.model,
      systemMessage: { content: buildSystemMessage() },
      infiniteSessions: { enabled: true },
      onPermissionRequest: approveAll,
      onUserInputRequest: createAutoAnswerHandler(epic.id),
    });

    const prompt = buildAutopilotPrompt(epic);
    logger.info(`Sending autopilot prompt (${prompt.length} chars)`, epic.id);

    // Stream progress to console
    session.on("assistant.message_delta", (event: unknown) => {
      // Look for phase boundary markers in streaming output
      const text: string = (event as { data?: { deltaContent?: string } }).data?.deltaContent ?? "";
      if (text.includes("═══") || text.includes("Phase ")) {
        const clean = text.replace(/[═\n]/g, "").trim();
        if (clean) logger.info(clean, epic.id);
      }
    });

    const result = await session.sendAndWait(
      { prompt },
      config.timeout,
    );

    await session.disconnect();

    // Check outcome by looking at .qc-passed on disk
    const featureDir = findFeatureDirWithQcPassed(config.workspaceRoot, epic);

    if (featureDir) {
      logger.success(`QC PASSED — feature dir: ${featureDir}`, epic.id, epic.wave);
      
      // Collect generated documents
      let documents: string[] = [];
      try {
        const fullDir = join(config.workspaceRoot, featureDir);
        documents = readdirSync(fullDir)
          .filter(file => file.endsWith(".md") && file !== ".qc-passed" && file !== "autopilot-log.md" && file !== "manual-test.md");
        
        if (documents.length > 0) {
          logger.epicDocuments(epic.id, featureDir, documents);
        }
      } catch (err) {
        logger.warn(`Failed to scan feature dir for documents: ${err}`, epic.id, epic.wave);
      }

      return {
        epicId: epic.id,
        outcome: "PASSED",
        featureDir,
        documents,
        durationMs: Date.now() - start,
      };
    }

    // Check for manual-test.md
    if (featureDirPrediction) {
      const manualTestPath = join(config.workspaceRoot, featureDirPrediction, "manual-test.md");
      if (existsSync(manualTestPath)) {
        logger.warn("Autopilot generated manual-test.md — needs human verification", epic.id);
        
        // Also log any other documents that were generated
        let documents: string[] = ["manual-test.md"];
        try {
          const fullDir = join(config.workspaceRoot, featureDirPrediction);
          const otherDocs = readdirSync(fullDir)
            .filter(file => file.endsWith(".md") && file !== ".qc-passed" && file !== "autopilot-log.md" && file !== "manual-test.md");
          documents = [...documents, ...otherDocs];
          
          if (documents.length > 0) {
            logger.epicDocuments(epic.id, featureDirPrediction, documents);
          }
        } catch (err) {
          // ignore
        }

        return {
          epicId: epic.id,
          outcome: "NEEDS_MANUAL",
          featureDir: featureDirPrediction,
          documents,
          reason: "manual-test.md generated — human verification required",
          durationMs: Date.now() - start,
        };
      }
    }

    // No .qc-passed found — halted
    const finalMsg = typeof result === "object" && result
      ? ((result as { data?: { content?: string } }).data?.content ?? "").slice(-500)
      : "";
    logger.error(`Autopilot did not produce .qc-passed`, epic.id, epic.wave);
    return {
      epicId: epic.id,
      outcome: "HALTED",
      featureDir: featureDirPrediction,
      reason: finalMsg || "Autopilot completed without producing .qc-passed",
      durationMs: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.toLowerCase().includes("timeout")) {
      logger.error(`Timeout after ${config.timeout}ms`, epic.id, epic.wave);
      return {
        epicId: epic.id,
        outcome: "TIMEOUT",
        featureDir: featureDirPrediction,
        reason: `Session timed out after ${Math.round(config.timeout / 60000)}min`,
        durationMs: Date.now() - start,
      };
    }

    logger.error(`Session error: ${message}`, epic.id, epic.wave);
    return {
      epicId: epic.id,
      outcome: "HALTED",
      featureDir: featureDirPrediction,
      reason: message,
      durationMs: Date.now() - start,
    };
  }
}
