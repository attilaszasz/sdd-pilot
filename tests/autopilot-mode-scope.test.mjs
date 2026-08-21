import { test } from 'node:test';
import { doesNotMatch, match, strictEqual } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const contextGatherer = read('../.github/agents/_context-gatherer.md');
const autopilot = read('../.github/sddp/workflows/autopilot-pipeline/WORKFLOW.md');
const config = read('../.github/sddp-config.md');
const readme = read('../README.md');
const reference = read('../docs/reference.md');

const standaloneSkills = [
  '../.github/sddp/workflows/specify-feature/WORKFLOW.md',
  '../.github/sddp/workflows/clarify-spec/WORKFLOW.md',
  '../.github/sddp/workflows/plan-feature/WORKFLOW.md',
  '../.github/sddp/workflows/generate-checklist/WORKFLOW.md',
  '../.github/sddp/workflows/generate-tasks/WORKFLOW.md',
  '../.github/sddp/workflows/analyze-compliance/WORKFLOW.md',
  '../.github/sddp/workflows/implement-qc-loop/WORKFLOW.md',
  '../.github/sddp/workflows/implement-tasks/WORKFLOW.md',
  '../.github/sddp/workflows/quality-control/WORKFLOW.md',
].map((path) => [path, read(path)]);

test('AMS-001: runtime mode comes only from explicit boolean input', () => {
  match(contextGatherer, /exactly `true` → `AUTOPILOT=true`; omitted, `false`, or any other value → `AUTOPILOT=false`/);
  match(contextGatherer, /Never derive runtime mode from `.github\/sddp-config.md`/);
  match(contextGatherer, /retain the explicit runtime mode from Step 0 unchanged/);
  doesNotMatch(contextGatherer, /case-insensitive.*`AUTOPILOT=true`/);
});

test('AMS-002: config enabled and disabled values are permission only', () => {
  match(config, /Permission for \/sddp-autopilot only\. Standalone commands remain interactive/);
  for (const enabled of ['true', 'false']) {
    const fixture = config.replace(/\*\*Enabled\*\*: (?:true|false)/, `**Enabled**: ${enabled}`);
    match(fixture, /Permission for \/sddp-autopilot only\. Standalone commands remain interactive/);
    match(contextGatherer, /config switch authorizes Autopilot but never changes this input/);
  }
});

test('AMS-003: every standalone phase explicitly delegates interactive mode', () => {
  strictEqual(standaloneSkills.length, 9);
  for (const [path, skill] of standaloneSkills) {
    const fallback = skill.split('\n').find((line) => line.startsWith('If `PIPELINE_CONTEXT` is absent or invalid')) ?? '';
    match(fallback, /Delegate: Context Gatherer/, path);
    match(fallback, /autopilot=false/, path);
  }
});

test('AMS-004: explicit Autopilot mode is authorized and preserved for nested phases', () => {
  match(autopilot, /If `false` or missing → \*\*HALT\*\*/);
  match(autopilot, /with `autopilot=true`/);
  match(autopilot, /pass it unchanged to every inline phase and nested Implement\/QC skill/);
  match(contextGatherer, /exactly `true` → `AUTOPILOT=true`/);
});

test('AMS-005: user documentation distinguishes permission from runtime mode', () => {
  match(readme, /setting authorizes `\/sddp-autopilot`; it does not make standalone commands unattended/);
  match(reference, /Authorizes `\/sddp-autopilot`; standalone commands stay interactive/);
});
