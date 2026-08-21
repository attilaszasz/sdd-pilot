import { test } from 'node:test';
import { doesNotMatch, match, ok } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const autopilot = readFileSync(fileURLToPath(new URL('../.github/sddp/workflows/autopilot-pipeline/WORKFLOW.md', import.meta.url)), 'utf8');
const command = 'node scripts/validate-prd.mjs <prd> --profile planning-ready --config .github/sddp-config.md --discovery specs/prd-discovery.md';

test('APG-001: Autopilot replaces keyword PRD sufficiency with the planning-ready validator', () => {
  match(autopilot, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  match(autopilot, /never replace it with keyword counting or a second heuristic sufficiency check/);
  const productGate = autopilot.slice(autopilot.indexOf('**Product Document:**'), autopilot.indexOf('**Technical Context Document:**'));
  doesNotMatch(productGate, /≥3 of 5|Need ≥3\/5|Product vision\/purpose/);
});

test('APG-002: discovery and invalid PRDs halt with the owning Product Document command', () => {
  match(autopilot, /`code="active-prd-discovery"` → \*\*HALT\*\*[\s\S]*`\/sddp-prd --resume`/);
  match(autopilot, /Any other invalid, incomplete, or legacy PRD diagnostic[\s\S]*→ \*\*HALT\*\*[\s\S]*Run `\/sddp-prd`/);
  match(autopilot, /fail closed on non-zero exit or malformed output/);
});

test('APG-003: existing Project Plans receive validator-backed freshness checks before selection', () => {
  match(autopilot, /When `HAS_PROJECT_PLAN=true`, append `--project-plan "PROJECT_PLAN_DOC"`/);
  match(autopilot, /compares the plan's `prd_capability_digest` with the current capability digest/);
  match(autopilot, /require `projectPlanFreshness\.valid=true`/);
  match(autopilot, /Any error inside `projectPlanFreshness`[\s\S]*`\/sddp-projectplan`[\s\S]*`\/sddp-amend <change>`/);
  const validation = autopilot.indexOf('8. Run the planning-ready PRD gate');
  const selection = autopilot.indexOf('9. **Auto-select epic');
  const context = autopilot.indexOf('10. **Delegate: Context Gatherer**');
  ok(validation >= 0 && selection > validation && context > selection);
});

test('APG-005: registered custom PRDs remain authoritative beside legacy defaults', () => {
  match(autopilot, /readable custom Product Document is registered while `specs\/prd\.md` also exists[\s\S]*registration is authoritative/);
});

test('APG-004: explicit features without a Project Plan do not acquire a freshness prerequisite', () => {
  match(autopilot, /When no Project Plan exists and explicit `\$ARGUMENTS` were supplied, run the base command without `--project-plan`; Project Plan freshness is not required/);
  match(autopilot, /`valid=true` → retain the validator's ordered `capabilities` and `capabilityDigest`/);
});
