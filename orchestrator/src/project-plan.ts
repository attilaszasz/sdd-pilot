import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Epic, EpicCategory, PipelineHints, Priority, Wave } from "./types.js";
import { logger } from "./logger.js";

/**
 * Regex for epic checklist lines in project-plan.md.
 * Captures: [1]=checkbox, [2]=epicId, [3]=priority, [4]=category, [5]=parallel, [6]=rest (sourceTags+title)
 */
const EPIC_LINE_RE =
  /^- \[([ X])\] (E\d{3}) \[(P[123])\] \[(PRODUCT|TECHNICAL|OPERATIONAL)\]\s*(\[P\])?\s*(.+)$/;

/** Parse the wave header: ### Wave 1 — Title */
const WAVE_HEADER_RE = /^###\s+Wave\s+(\d+)/;

/** Parse the epic detail section header: ### E001 — Title */
const DETAIL_HEADER_RE = /^###\s+(E\d{3})\s*[—–-]/;

/** Parse pipeline hints line */
function parseHints(hintsLine: string): PipelineHints {
  const lower = hintsLine.toLowerCase();
  return {
    skipClarify: lower.includes("skip_clarify"),
    skipChecklist: lower.includes("skip_checklist"),
    lightweight: lower.includes("lightweight"),
  };
}

/** Parse "Depends on" field — e.g. "E001, E003" or "None (Wave 1)" */
function parseDependsOn(value: string): string[] {
  if (!value || /none/i.test(value)) return [];
  const ids = value.match(/E\d{3}/g);
  return ids ?? [];
}

/**
 * Extract the detail block for a given epic ID from the full markdown content.
 * Returns the text under ### E### — ... until the next ### or end-of-file.
 */
function extractDetailBlock(content: string, epicId: string): string {
  const lines = content.split("\n");
  let capturing = false;
  const block: string[] = [];

  for (const line of lines) {
    if (capturing) {
      // Stop at next ### heading (but not ####)
      if (/^###\s+[^#]/.test(line) && !line.startsWith("####")) break;
      block.push(line);
    } else if (DETAIL_HEADER_RE.test(line)) {
      const match = line.match(DETAIL_HEADER_RE);
      if (match?.[1] === epicId) {
        capturing = true;
      }
    }
  }
  return block.join("\n");
}

/** Extract a field value from a detail block: - **FieldName**: value */
function extractField(block: string, fieldName: string): string {
  const re = new RegExp(`^-\\s+\\*\\*${fieldName}\\*\\*:\\s*(.*)$`, "m");
  const match = block.match(re);
  return match?.[1]?.trim() ?? "";
}

/** Extract the multi-line "Specify input" sub-block */
function extractSpecifyInput(block: string): string {
  const lines = block.split("\n");
  let capturing = false;
  const result: string[] = [];

  for (const line of lines) {
    if (/^\*\*Specify input\*\*:/.test(line.trim()) || /^-\s+\*\*Specify input\*\*:/.test(line)) {
      capturing = true;
      continue;
    }
    if (capturing) {
      // Stop at next top-level field (- **Something**:) that isn't indented sub-field
      if (/^-\s+\*\*[^*]+\*\*:/.test(line) && !/^\s{2,}-/.test(line)) break;
      result.push(line);
    }
  }

  // Extract the Description sub-field
  const text = result.join("\n");
  const descMatch = text.match(/\*\*Description\*\*:\s*(.*)/);
  if (descMatch?.[1]) return descMatch[1].trim();

  // Fallback: return everything cleaned up
  return text.replace(/^\s+-\s+\*\*\w+\*\*:\s*/gm, "").trim();
}

/**
 * Parse specs/project-plan.md and return structured waves with epics.
 */
export function parseProjectPlan(workspaceRoot: string, planPath: string): Wave[] {
  const fullPath = join(workspaceRoot, planPath);
  const content = readFileSync(fullPath, "utf-8");
  const lines = content.split("\n");

  // First pass: extract epic checklist items grouped by wave
  const wavesMap = new Map<number, Epic[]>();
  let currentWave = 1;

  for (const line of lines) {
    const waveMatch = line.match(WAVE_HEADER_RE);
    if (waveMatch) {
      currentWave = parseInt(waveMatch[1], 10);
      continue;
    }

    const epicMatch = line.match(EPIC_LINE_RE);
    if (epicMatch) {
      const [, checkbox, id, priority, category, parallel, rest] = epicMatch;

      // Extract source tags and title from the rest
      const tagsMatch = rest.match(/^(\{[^}]+\}(?:\{[^}]+\})*)\s*(.+)$/);
      const sourceTags = tagsMatch?.[1] ?? "";
      const title = tagsMatch?.[2] ?? rest;

      // Get detail block for richer fields
      const detail = extractDetailBlock(content, id);
      const dependsOnStr = extractField(detail, "Depends on");
      const hintsStr = extractField(detail, "Pipeline hints");
      const specifyInput = extractSpecifyInput(detail);

      const epic: Epic = {
        id,
        priority: priority as Priority,
        category: category as EpicCategory,
        parallel: parallel === "[P]",
        sourceTags,
        title: title.trim(),
        completed: checkbox === "X",
        wave: currentWave,
        dependsOn: parseDependsOn(dependsOnStr),
        specifyInputDescription: specifyInput || title.trim(),
        hints: parseHints(hintsStr),
      };

      if (!wavesMap.has(currentWave)) wavesMap.set(currentWave, []);
      wavesMap.get(currentWave)!.push(epic);
    }
  }

  // Convert to sorted Wave array
  const waves: Wave[] = [];
  const sortedKeys = [...wavesMap.keys()].sort((a, b) => a - b);
  for (const num of sortedKeys) {
    waves.push({ number: num, epics: wavesMap.get(num)! });
  }

  logger.info(`Parsed ${waves.length} wave(s) with ${waves.reduce((n, w) => n + w.epics.length, 0)} epic(s)`);
  return waves;
}

/**
 * Check off an epic as completed in project-plan.md: - [ ] E### → - [X] E###
 */
export function checkOffEpic(workspaceRoot: string, planPath: string, epicId: string): void {
  const fullPath = join(workspaceRoot, planPath);
  let content = readFileSync(fullPath, "utf-8");

  const pattern = new RegExp(`^(- )\\[ \\] (${epicId} )`, "m");
  if (pattern.test(content)) {
    content = content.replace(pattern, "$1[X] $2");
    writeFileSync(fullPath, content, "utf-8");
    logger.success(`Checked off ${epicId} in project plan`, epicId);
  } else {
    logger.warn(`Could not find unchecked ${epicId} in project plan`, epicId);
  }
}

/**
 * Derive the expected feature directory slug from an epic title.
 * E.g. "User authentication — implement login/logout" → "user-authentication"
 */
export function epicTitleToSlug(title: string): string {
  // Take everything before " — " if present
  const namepart = title.split(/\s*[—–-]{1,2}\s*/)[0];
  return namepart
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .split("-")
    .slice(0, 5)
    .join("-");
}
