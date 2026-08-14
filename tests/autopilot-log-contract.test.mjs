import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { equal, throws } from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { appendAutopilotRow, flushAutopilotRows, initializeAutopilotLog } from "../scripts/lib/workflow-state.mjs";

const row = (event = "decision", artifact = "[spec.md](spec.md)") => `| 12:00:00 | Plan | ${event} | detail | PASS | reason | ${artifact} |`;
const read = (relative) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

test("ALC-000: event vocabulary remains a Markdown contract", () => {
  const skill = read("../.github/skills/autopilot-pipeline/SKILL.md");
  const selfHealing = read("../.github/skills/implement-tasks/references/self-healing-amendments.md");
  for (const event of ["phase_start", "phase_complete", "phase_skip", "gate_check", "decision", "halt", "epic_update"]) equal(skill.includes(`\`${event}\``), true);
  equal(selfHealing.includes("Phase=`Implement+QC`, Event=`decision`"), true);
});
test("ALC-001: logging appends ordered rows exactly once across reruns", () => {
  const root = mkdtempSync(join(tmpdir(), "sddp-log-"));
  try {
    const feature = join(root, "specs", "fixture"); mkdirSync(feature, { recursive: true });
    const log = join(feature, "autopilot-log.md");
    initializeAutopilotLog(log, "2026-08-14 12:00:00");
    const rows = [row(), row("gate_check")];
    flushAutopilotRows(log, rows, feature, root);
    equal(rows.length, 0);
    flushAutopilotRows(log, rows, feature, root);
    initializeAutopilotLog(log, "2026-08-14 12:01:00");
    const result = readFileSync(log, "utf8");
    equal((result.match(/\| 12:00:00 \|/g) ?? []).length, 2);
    equal((result.match(/## Run /g) ?? []).length, 2);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("ALC-002: invalid schema and escaping links fail before history changes", () => {
  const root = mkdtempSync(join(tmpdir(), "sddp-log-invalid-"));
  try {
    const feature = join(root, "specs", "fixture"); mkdirSync(feature, { recursive: true });
    const log = join(feature, "autopilot-log.md"); initializeAutopilotLog(log, "2026-08-14 12:00:00");
    const before = readFileSync(log, "utf8");
    throws(() => appendAutopilotRow(log, "| broken |", feature, root));
    throws(() => appendAutopilotRow(log, row("decision", "[outside](../../../escape.md)"), feature, root));
    symlinkSync(tmpdir(), join(feature, "linked"));
    throws(() => appendAutopilotRow(log, row("decision", "[escape](linked/outside.md)"), feature, root));
    equal(readFileSync(log, "utf8"), before);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("ALC-003: interruption after each completed write leaves readable prior rows", () => {
  const root = mkdtempSync(join(tmpdir(), "sddp-log-interrupt-"));
  try {
    const feature = join(root, "specs", "fixture"); mkdirSync(feature, { recursive: true });
    const log = join(feature, "autopilot-log.md"); initializeAutopilotLog(log, "2026-08-14 12:00:00");
    for (const stopAfter of [1, 2]) {
      const rows = [row(), row("halt")];
      let writes = 0;
      throws(() => flushAutopilotRows(log, rows, feature, root, () => { writes += 1; if (writes === stopAfter) throw new Error("interrupted"); }), /interrupted/);
      const lines = readFileSync(log, "utf8").trim().split("\n");
      equal(lines.at(-1), stopAfter === 1 ? row() : row("halt"));
      equal(rows.length, 2 - stopAfter);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
