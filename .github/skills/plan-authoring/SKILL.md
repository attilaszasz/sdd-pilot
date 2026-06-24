---
name: plan-authoring
description: "Reference material for writing implementation plans (technical context, architecture decisions, data models, API contracts, project-instructions alignment). Loaded on demand by `plan-feature`; not directly invokable."
---

# Plan Authoring Guide

## Agent-First Format Rule

Every `plan.md` section MUST use tables, key-value pairs, or tagged lists as primary format. Prose is limited to the Summary section (max 3 key-value lines). The primary consumer is an AI agent — optimize for parseability over readability.

## Plan Writing Process

### Phase 0: Research
1. `HAS_TECH_CONTEXT_DOC = true` → read as baseline; pre-fill Technical Context values, require only confirmation.
2. Extract unknowns (anything marked NEEDS CLARIFICATION) → research task per unknown.
3. Consolidate in `research.md` using structured format below. Merge by topic, rewrite full file.
4. Budget: ≤4KB. Existing >3KB → consolidate before adding.

#### research.md Format

**Prohibited:** code blocks, implementation snippets, comparison tables, narrative paragraphs, duplicate summary sections.

**Per-topic:** 4 structured fields, max 2 sources. **Global budget:** ≤4KB.

**Consolidation:** merge overlapping topics, normalize names, remove stale details.

**Structure:**

```markdown
# Research: [Feature Name]
> Feature | Date | Purpose

## [Topic N]
- **Decision**: [what was chosen]
- **Rationale**: [why — max 1 sentence]
- **Rejected**: [alternatives and why — max 1 sentence]
- **Pitfalls**: [anti-patterns to avoid — max 1 sentence]
- **Sources**: [URL1], [URL2]

## Summary
| Topic | Decision | Rationale |
|-------|----------|-----------|

## Sources Index
| URL | Topic | Fetched |
|-----|-------|---------|
```

### Phase 1: Design & Contracts
Prerequisites: `research.md` complete

Items 1–2 are **conditional** — auto-detect signals from spec; fall back to interactive prompt when ambiguous.

1. **Data Model** → `data-model.md` *(conditional)*:
   - Generate when: non-empty "Key Entities", terms `database`/`storage`/`persist`/`CRUD`/`entity`/etc., or `Storage` ≠ `N/A`
   - Skip → replace Data Model Summary table with `N/A — no persistent data`
   - Include: entity names, fields, relationships, validation rules, state transitions
   - Populate `## Data Model Summary` table in `plan.md` with entity overview

2. **API Contracts** → `contracts/` *(conditional)*:
   - Generate when: terms `API`/`endpoint`/`route`/`REST`/`GraphQL`/`HTTP`/`webhook`/etc., or `Project Type` = `web`/`mobile`
   - Skip → replace API Surface Summary table with `N/A — no API surface`
   - Map user actions → endpoints; use REST/GraphQL patterns; output OpenAPI/GraphQL schemas
   - Populate `## API Surface Summary` table in `plan.md` with endpoint overview

### Instructions Check
- Read `project-instructions.md`
- Validate every plan decision against project instructions principles
- If violations exist that must be justified, add a "## Complexity Tracking" section to `plan.md` with a table: `| Violation | Why Needed | Simpler Alternative Rejected Because |`. If no violations exist, omit the section entirely.
- GATE: Must pass before research. Re-check after design.
- Auditor outputs are transient gate checks; report status/decisions in `plan.md` without pasting full Auditor reports.

### Artifact Conventions

Full rules: `.github/skills/artifact-conventions/SKILL.md` (read during edit/remediation phases).

- `plan.md` ≤ **10KB** — Architecture: target 8-12 nodes, hard cap 15
- Conditional sections: populate table OR replace with `N/A — [reason]`. Never leave template placeholders.
- Mermaid: C4 syntax, Container/Component views, `<br>` for breaks (never `\n`)
- Default to Container view; use Component view only if internals matter
- C4 labels: names 1-3 words; short type fields; descriptions optional, max 4 words
- Relationship labels: short verbs only; omit obvious labels
- Exclude helpers and commodity infrastructure from the main view
- Do NOT remove **Instructions Check**, **Technical Context**, or **Requirement Coverage Map** sections
- Do NOT change Architecture Decision IDs (AD-###) — they may be referenced by tasks
- `[NEEDS CLARIFICATION]` → resolve only with user-approved answers
- Preserve all cross-referenced IDs (AD-###, HINT-###)

## Technical Context Fields

The plan template captures these metadata fields:

| Field | Example | Notes |
|-------|---------|-------|
| Language/Version | Python 3.11 | Or "NEEDS CLARIFICATION" |
| Primary Dependencies | FastAPI | Frameworks, libraries |
| Storage | PostgreSQL | Or "N/A" if no persistence |
| Testing | pytest | Test framework |
| Target Platform | Linux server | Or iOS 15+, WASM, etc. |
| Project Type | single/web/mobile | Determines source structure |
| Project Mode | greenfield/brownfield/mixed | Determines structure approach |
| Performance Goals | 1000 req/s | Domain-specific |
| Constraints | <200ms p95 | Domain-specific |
| Scale/Scope | 10k users | Domain-specific |

These same fields should also appear in the project-level Technical Context Document when one is maintained.

## Testing Strategy Configuration

Populate `## Testing Strategy` table in `plan.md`. Each row maps a testing tier to its tool, scope, mock boundary, and install command.

### Tiers to cover

| Tier | Purpose |
|------|----------|
| **Unit** | Isolated logic tests |
| **Integration** | Cross-component / API tests |
| **Security** | Vulnerability scanning (code + dependencies) |
| **Coverage** | Code coverage measurement |

### Rules

1. Delegate to Technical Researcher during planning Step 4.5 for detected tech stack.
2. Consider: language/version, framework, dependency manager, existing tool configs.
3. Prefer: widely adopted, actively maintained, single-command install.
4. Existing config → Install column = `configured`.
5. N/A tier → include row with rationale in Scope column (e.g., `N/A — no external dependencies`).
6. Include ready-to-run install commands for tools not yet present.

## Acceptance Test Stubs

Populate `## Acceptance Test Stubs` in `plan.md` when at least one P1 requirement exists. This gives every P1 requirement a runnable RED→GREEN acceptance target so the Developer gets a per-requirement pass/fail signal during `/sddp-implement` instead of relying on lint/compilation alone. Replace the section body with `N/A — no P1 requirements` when the spec has no P1 work items.

### Rules

1. One row per **P1** requirement (`FR-###`/`TR-###`/`OR-###`/`RR-###`). P2/P3 requirements are not stubbed (the size budget and the issue scope are P1-only).
2. `Req ID` MUST match a requirement from `spec.md` that is tagged P1.
3. `Test File` follows the project's Testing Strategy Unit tier convention — co-located with the implementation file (e.g. `src/foo.test.ts`) or in a sibling `tests/` directory (e.g. `tests/test_foo.py`). Choose one convention per project and keep it consistent across rows.
4. `Stub Blocks (framework-native)` uses the syntax of the Unit tier tool from `## Testing Strategy` (e.g. `describe('FR-001 user registration') / it('rejects duplicate emails')` for Jest/Vitest, `func TestFR001_RejectsDuplicateEmails(t *testing.T)` for Go, `def test_FR001_rejects_duplicate_emails():` for pytest). Each block name embeds the reqID so the Developer and the Story Verifier can trace failures back to a requirement.
5. `RED Status` records how the stub fails before any implementation exists: `pending` (skip/todo marker), `failing-assertion` (an assertion that cannot pass until the requirement is implemented), or `skip` (framework skip marker). Pick the idiomatic one for the Unit tier tool.
6. Do NOT include test bodies that pin specific implementation details — stubs are acceptance targets (behavior-level), not unit-test mandates. The Developer fills in assertions as part of implementation; the stub only fixes the names and the failing state.
7. Source the requirement set from the same P1 work items that will be tagged `🎯 MVP` in `tasks.md`; the Requirement Coverage Map `File Path(s)` column informs the `Test File` path for each row.
8. Do NOT remove the `## Acceptance Test Stubs` section once present — it is consumed by `/sddp-tasks` (emits a stub-creation task per row) and `/sddp-implement` (parses it into `STUB_MAP` to feed the Developer). reqID links are stable and subject to the cross-referenced ID preservation rules.

## Error Handling Strategy

Populate `## Error Handling Strategy` table when the feature has API endpoints, external service calls, or user-facing error states. Skip (replace with `N/A`) for pure libraries, CLI tools with simple exit codes, or infrastructure-only features.

### Columns

| Column | Content |
|--------|---------|
| Error Category | Domain grouping (Validation, Auth, Downstream, Internal) |
| Pattern | Strategy (fail-fast, circuit breaker, retry, fallback) |
| Response | What the caller sees (status code + body shape, log level, alert) |
| Retry | yes/no + policy (exponential, fixed, none) |

## Architecture Decisions

Populate `## Architecture Decisions` table during Phase 0 (Research) and Phase 1 (Design). One row per non-trivial **feature-local** technical choice.

### Rules

1. ID format: `AD-###` (sequential, zero-padded 3 digits).
2. Every row: question asked, options evaluated, choice made, rationale.
3. Tasks may reference decisions via `{AD-###}` tag (optional, not required).
4. Do NOT duplicate decisions already captured in the Technical Context Document or standalone ADRs under `specs/adrs/` — reference them instead (e.g., "See ADR-0001").
5. **AD-### rows are for feature-local tradeoffs only.** Decisions with project-wide architectural impact must become standalone ADRs created through the ADR Author subagent (`.github/agents/_adr-author.md`), not AD rows.
6. When referencing a global ADR from a feature plan, cite the canonical ADR ID (e.g., `ADR-0001`) in the rationale column — do not copy the decision into an AD row.

## Requirement Coverage Map

Populate `## Requirement Coverage Map` table after design. Every `FR-###`, `TR-###`, `OR-###`, and `RR-###` from `spec.md` must have a row.

### Rules

1. Map each requirement to the component(s), file path(s), **and the exported function(s)/symbol(s) with key signature hints** that will implement it. Example: `UserModel(id,email,role)`, `Checkout.run()`, `validateJwt(token)`.
2. Source the `Function(s)/Symbol(s)` column from `data-model.md` entities, `contracts/` schemas, architecture decisions, or named API/service surfaces when no design artifact exists. Avoid generic placeholders like "TBD" — if a symbol cannot be named yet, the design is incomplete; resolve before writing the row.
3. The full row — `Req ID → Component(s) → File Path(s) → Function(s)/Symbol(s)` — is the **traceability matrix**. It is the primary input for `/sddp-tasks` (task generation derives `→ exports:` annotations from the symbol column) and for the Developer's per-task self-verification during `/sddp-implement`.
4. Missing requirement, empty `File Path(s)`, or empty `Function(s)/Symbol(s)` → flag as gap during Plan Readiness Check.
5. The Story Verifier at QC reads this matrix as its starting traceability map but re-verifies authoritatively against the implemented code; the matrix is a hint, not a substitute for QC.

## Risk Mitigation

Populate `## Risk Mitigation` table by mapping each risk from `spec.md` Assumptions & Risks to a concrete technical mitigation.

### Rules

1. One row per risk from spec. Preserve spec wording in Risk column.
2. Mitigation = specific technical action (not "monitor" or "be careful").
3. Owner = component or team responsible for the mitigation.

## Implementation Hints

Populate `## Implementation Hints` with max 5 tagged items. Each captures a non-obvious constraint, gotcha, or order-sensitive operation that the implementing agent needs.

### Format

`- **[HINT-###]** Category: detail`

Categories: `Order`, `Gotcha`, `Constraint`, `Compatibility`, `Performance`.

## Project Structure Options

### By Project Type (greenfield)

- **Single project** (default): `src/`, `tests/` at root
- **Web application** (frontend + backend detected): `backend/`, `frontend/`
- **Mobile + API** (iOS/Android detected): `api/`, `ios/` or `android/`

### Brownfield / Mixed Mode

When `Project Mode` = `brownfield` or `mixed`:
1. Scan existing project layout — do NOT impose a template structure.
2. Show only new/modified paths: prefix `+` (new file) or `~` (modified file).
3. Include Brownfield Notes block in template:
   - **Patterns to reuse**: existing patterns relevant to this feature
   - **Tests to extend**: existing test files/suites to add cases to
   - **Naming conventions**: observed conventions to follow
4. Omit generic project initialization tasks.

Delete unused options from the template. The delivered plan must not include "Option" labels.

## Template

Use the template at [assets/plan-template.md](assets/plan-template.md).
