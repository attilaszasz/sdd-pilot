import { test } from 'node:test';
import { match, ok } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const autopilot = read('../.github/skills/autopilot-pipeline/SKILL.md');
const selfHealing = read('../.github/skills/implement-tasks/references/self-healing-amendments.md');
const conventions = read('../.github/skills/artifact-conventions/SKILL.md');

test('ALC-001: pre-context events are buffered and flushed in order after context resolution', () => {
  match(autopilot, /initialize an in-memory ordered `LOG_BUFFER`/);
  match(autopilot, /Before any halt while no usable `FEATURE_DIR` exists, buffer one `halt` row/);
  match(autopilot, /Buffer an `epic_update` row/);
  match(autopilot, /initialize the audit log per Step 1d, then flush `LOG_BUFFER` in original order/);
  match(autopilot, /context resolution halts without a usable `FEATURE_DIR`.*include the buffered rows verbatim in the Final Report/s);
  match(autopilot, /Flush each buffered row exactly once, then clear `LOG_BUFFER`/);
  match(autopilot, /gate check results.*that were not already buffered/s);
});

test('ALC-002: first runs initialize once and reruns preserve prior bytes', () => {
  match(autopilot, /If `FEATURE_DIR\/autopilot-log\.md` is absent, create it once/);
  match(autopilot, /If the file already exists, preserve every byte/);
  match(autopilot, /## Run \{YYYY-MM-DD HH:MM:SS\}/);
  match(autopilot, /Never recreate, truncate, rewrite, or repair historical content/);
  match(conventions, /Initialize only when absent; reruns append a dated run boundary/);
});

test('ALC-003: rows fail closed on invalid schema, vocabulary, or links', () => {
  match(autopilot, /exactly seven cells; a declared Phase and Event/);
  match(autopilot, /every link target relative, normalized from `FEATURE_DIR`, and contained within the repository root/);
  match(autopilot, /A link may target a missing artifact when the row records that absence/);
  match(autopilot, /Invalid rows halt logging and execution rather than corrupting history/);
});

test('ALC-004: self-healing uses declared vocabulary and valid relative links', () => {
  match(selfHealing, /Phase=`Implement\+QC`, Event=`decision`/);
  ok(!selfHealing.includes('Phase=`Implement`'), 'Self-healing must not emit the undeclared Implement phase');
  match(selfHealing, /Artifacts=`\[plan\.md\]\(plan\.md\), \[divergence-log\.md\]\(divergence-log\.md\)`/);
  match(selfHealing, /Validate and atomically append the complete row/);
});

test('ALC-005: interrupted runs retain complete readable history', () => {
  match(autopilot, /Append each validated row as one complete line in one write/);
  match(autopilot, /never append a partial row/i);
  match(autopilot, /interruption may omit the current row or Run Summary, but all prior runs and completed rows remain valid readable Markdown/);
  match(autopilot, /append a `## Run Summary` section.*in one complete write/s);
});
