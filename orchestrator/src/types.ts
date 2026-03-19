/**
 * Core type definitions for the SDD orchestrator.
 */

/** Epic priority level */
export type Priority = "P1" | "P2" | "P3";

/** Epic category */
export type EpicCategory = "PRODUCT" | "TECHNICAL" | "OPERATIONAL";

/** Result status for an epic run */
export type EpicOutcome = "PASSED" | "HALTED" | "NEEDS_MANUAL" | "SKIPPED" | "TIMEOUT";

/** A parsed epic from project-plan.md */
export interface Epic {
  /** e.g. "E001" */
  id: string;
  priority: Priority;
  category: EpicCategory;
  /** True if marked [P] — safe to run in parallel within its wave */
  parallel: boolean;
  /** Traceability tags, e.g. "{PRD:CAP-001,CAP-002}{SAD:ADR-003}" */
  sourceTags: string;
  /** Epic title + scope, e.g. "User authentication — implement login/logout" */
  title: string;
  /** True if already checked off [X] in the plan */
  completed: boolean;
  /** Wave number this epic belongs to */
  wave: number;
  /** IDs of epics this one depends on, e.g. ["E001", "E002"] */
  dependsOn: string[];
  /** The "Specify input → Description" text from the detail block */
  specifyInputDescription: string;
  /** Pipeline hints extracted from the detail block */
  hints: PipelineHints;
}

/** Pipeline hints that can optimize the autopilot run */
export interface PipelineHints {
  skipClarify: boolean;
  skipChecklist: boolean;
  lightweight: boolean;
}

/** A wave of epics to execute together */
export interface Wave {
  number: number;
  epics: Epic[];
}

/** Result of running one epic */
export interface EpicResult {
  epicId: string;
  outcome: EpicOutcome;
  /** Feature directory path, e.g. "specs/00001-user-auth/" */
  featureDir?: string;
  /** List of generated documents in the feature directory (relative to featureDir) */
  documents?: string[];
  /** Reason if halted or timed out */
  reason?: string;
  /** Duration in milliseconds */
  durationMs: number;
}

/** Result of running the entire project */
export interface ProjectResult {
  results: EpicResult[];
  /** Number of epics that passed QC */
  passed: number;
  /** Number of epics that failed/halted */
  failed: number;
  /** Number of epics skipped (already done or dependency failure) */
  skipped: number;
  totalDurationMs: number;
}

/** CLI + config options */
export interface OrchestratorConfig {
  /** LLM model to use, e.g. "gpt-5" */
  model: string;
  /** If true, print execution plan and exit */
  dryRun: boolean;
  /** If true, skip epics that already have .qc-passed */
  resume: boolean;
  /** Run only this specific epic, e.g. "E001" */
  epicFilter?: string;
  /** Start from this wave number */
  startWave: number;
  /** If true, disable parallel execution of [P] epics */
  sequential: boolean;
  /** Per-epic timeout in milliseconds */
  timeout: number;
  /** If true, skip running epics and print available models */
  listModels: boolean;
  /** Reasoning effort level for models that support it */
  reasoningEffort?: "low" | "medium" | "high" | "xhigh";
  /** Workspace root (where specs/, .github/ etc. live) */
  workspaceRoot: string;

  // Resolved paths from sddp-config.md
  /** Path to product document (specs/prd.md) */
  productDocPath: string;
  /** Path to technical context document (specs/sad.md) */
  techContextDocPath: string;
  /** Path to project plan (specs/project-plan.md) */
  projectPlanPath: string;
  /** Path to deployment & operations document (optional) */
  dodPath?: string;
}

/** Log entry for structured logging */
export interface LogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "SUCCESS";
  epicId?: string;
  wave?: number;
  message: string;
}
