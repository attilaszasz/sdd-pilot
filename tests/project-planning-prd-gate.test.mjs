import { test } from 'node:test';
import { doesNotMatch, match, ok } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const planning = read('../.github/sddp/workflows/project-planning/WORKFLOW.md');
const context = read('../.github/agents/_context-gatherer.md');
const command = 'node scripts/validate-prd.mjs <prd> --profile planning-ready --config .github/sddp-config.md --discovery specs/prd-discovery.md';

test('PPG-001: Project Planning resolves the canonical PRD before a fail-closed planning-ready gate', () => {
  match(planning, /Config first:[\s\S]*Fallback second:[\s\S]*missing or unreadable[\s\S]*do not silently fall back/);
  match(planning, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const resolution = planning.indexOf('### 1.1 Resolve Product Document');
  const validation = planning.indexOf('### 1.4 Validate Planning-Ready Product Document');
  const parsing = planning.indexOf('## 2. Read and Parse All Inputs');
  ok(resolution >= 0 && validation > resolution && parsing > validation);
  match(planning, /non-zero exit, malformed output, or non-passing planning-ready verdict blocks Project Planning without writing or modifying/);
  match(planning, /`code="active-prd-discovery"`[\s\S]*`\/sddp-prd --resume`/);
  match(planning, /Run `\/sddp-prd` to create or upgrade/);
});

test('PPG-002: validator capabilities and digest are the only PRD planning inputs', () => {
  match(planning, /`PRD_CAPABILITIES` from the validator's ordered `capabilities`/);
  match(planning, /`PRD_CAPABILITY_DIGEST` from its `capabilityDigest`/);
  match(planning, /Use only `PRD_CAPABILITIES` for capability IDs, priorities, and descriptions/);
  match(planning, /do not derive capabilities or assign replacement `CAP-###` IDs/);
  doesNotMatch(planning, /No explicit capability map → derive/);
});

test('PPG-003: Project Plan persists and reconciles PRD capability freshness', () => {
  match(planning, /Frontmatter: `created`, `prd_source`, `prd_capability_digest`, `sad_source`, `dod_source`/);
  match(planning, /Compare `PRIOR_PRD_CAPABILITY_DIGEST` with `PRD_CAPABILITY_DIGEST`/);
  match(planning, /reconcile every unchecked product epic and the PRD Coverage Validation table/);
  match(planning, /Checked `\[X\]` epic checklist lines and their `specs\/plan\/\{EPIC_ID\}\.md` files are immutable/);
  match(planning, /every capability in validator-provided `PRD_CAPABILITIES` → ≥1 epic/);
});

test('PPG-004: Context Gatherer uses the same config-first Product Document semantics', () => {
  match(context, /Resolve config-first, fallback-second/);
  match(context, /Only when registration is empty, use readable `specs\/prd\.md`/);
  match(context, /Registered Product Document is missing or unreadable:[\s\S]*never silently fall back/);
  match(context, /readable registered custom path remains authoritative when `specs\/prd\.md` also exists/);
  match(context, /`CONTEXT_BLOCKED=true`/);
});

test('PPG-005: a registered custom PRD remains usable beside an unregistered legacy default', () => {
  match(planning, /readable registered custom path remains authoritative even when a legacy `specs\/prd\.md` also exists/);
  doesNotMatch(planning, /different from `specs\/prd\.md` while both files exist is a canonical Product Document conflict/);
});
