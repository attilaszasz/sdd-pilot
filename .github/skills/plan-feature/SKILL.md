---
name: plan-feature
description: "Orchestrates the implementation planning process — generating plan artifacts, architecture decisions, and design documents from a feature specification. Use when running /sddp-plan or when implementation planning is needed."
---

# Software Architect — Plan Feature Workflow

<rules>
- Report progress at major milestones
- Follow all writing rules in `.github/skills/plan-authoring/SKILL.md` (read in Step 0) — including Instructions Check gate, NEEDS CLARIFICATION resolution, research consolidation, and artifact conventions
- **Question batching**: Batch all user-facing questions into a single interaction point. Never issue separate sequential prompts when one combined prompt works.
- **Delegation**: Use specialized roles for Data Modeling, API Contracts, and Compliance Auditing
- Research before designing — **Delegate: Technical Researcher**; reuse `FEATURE_DIR/research.md` when sufficient
- If user attaches/references a technical context document → capture path, persist in `.github/sddp-config.md`
</rules>

<workflow>

## 1. Resolve Context

Resolve `FEATURE_DIR` from git branch (`specs/<branch>/`) or user context.

**Delegate: Context Gatherer** in **quick mode** (`.github/agents/_context-gatherer.md`).

- `HAS_SPEC = false` → ERROR "Missing `spec.md` at `FEATURE_DIR/spec.md`. Run `/sddp-specify [description]` to create it."
- `plan.md` missing → read template from `.github/skills/plan-authoring/assets/plan-template.md`, create `FEATURE_DIR/plan.md`
- `plan.md` exists:
  - **Autopilot guard (P1)**: `AUTOPILOT = true` → default Overwrite, log to `FEATURE_DIR/autopilot-log.md`
  - `AUTOPILOT = false` → ask overwrite or refine

Load `FEATURE_DIR/spec.md`. Detect `SPEC_TYPE` from frontmatter (absent → `product`).

**Spec Maturity Check**: Read `spec_maturity` from frontmatter (absent → `draft`).
- `draft` → WARN: "Spec has not been through clarification. Consider running `/sddp-clarify` first to reduce rework risk."
- `clarified` or higher → continue without warning.

## 1.5. Technical Context Document

Check for user-attached file or path in `$ARGUMENTS`/conversation.

1. **Detect**: file attachments, explicit paths, mentions of "tech context"/"architecture doc"/"SAD"/etc.
2. **Auto-adopt default**: `HAS_TECH_CONTEXT_DOC = false` + no new doc + `specs/sad.md` exists → read it, persist to `.github/sddp-config.md`, set `TECH_CONTEXT_DOC`/`TECH_CONTEXT_CONTENT` → Step 2
3. **Existing registered**: `HAS_TECH_CONTEXT_DOC = true` + no new doc → read `TECH_CONTEXT_DOC` → `TECH_CONTEXT_CONTENT` → Step 2
4. **New file detected**:
   - Validate readable (unreadable → warn, proceed without)
   - If `HAS_TECH_CONTEXT_DOC = true` + different path:
     - `TECH_CONTEXT_DOC` is `specs/sad.md`:
       - **Autopilot guard (P2)**: `AUTOPILOT = true` → Keep existing, log
       - `AUTOPILOT = false` → ask "Keep existing" (recommended) / "Replace"
     - `TECH_CONTEXT_DOC` is not `specs/sad.md`:
       - **Autopilot guard (P2)**: `AUTOPILOT = true` → Replace, log
       - `AUTOPILOT = false` → ask "Replace" (recommended) / "Keep existing"
   - Confirmed or no prior doc → write path to `.github/sddp-config.md`, store `TECH_CONTEXT_CONTENT`
5. **Nothing detected + no existing**: set `TECH_CONTEXT_PENDING = true` (batched with Step 2 questions)
6. **No document**: `TECH_CONTEXT_CONTENT` = empty. Planning proceeds with interactive Q&A.

Tech context path is a reference — original file read on demand. Missing file → graceful error handling.

## 2. Alignment & Pre-Research Gate

1. **Autopilot guard (P3, P4)**: `AUTOPILOT = true`:
   - `TECH_CONTEXT_CONTENT` available → extract all values (language, frameworks, storage, platform, constraints) directly. Log: "Autopilot: Alignment answers derived from Technical Context Document"
   - `TECH_CONTEXT_PENDING = true` → default "No tech context document", log, set empty
  - Skip all alignment questions → proceed to Pre-Research Validation

   `AUTOPILOT = false`:
   - `TECH_CONTEXT_PENDING = true` → include in same batch: "Do you have a technical context document?" Options: "No tech context document" (recommended) + free-form path. If path provided → validate, persist to `.github/sddp-config.md`, read content.
   - `TECH_CONTEXT_CONTENT` available → **pre-fill all Technical Context fields** as defaults with source attribution. Present for confirmation, not open-ended Q&A: "Based on [TECH_CONTEXT_DOC]: Language=X, Storage=Y, Platform=Z. Confirm or override for this feature?"
   - `TECH_CONTEXT_CONTENT` empty → ask tech stack, architecture trade-offs, critical constraints
2. **Pre-Research Validation** (lightweight — no delegation):
   - Verify `spec.md` has no unresolved `[NEEDS CLARIFICATION]` markers that block planning
   - Verify `project-instructions.md` exists and is readable
   - Violations → warn user, do not halt (full compliance check runs post-design in Step 5)

## 3. Phase 0 — Research

### 3.0 Research Reuse Gate

`FEATURE_DIR/research.md` exists:
- Read before launching new research
- Current: covers active tech choices, no material new unknowns → reuse
- Stale: critical tech decisions changed, unresolved clarifications unsupported, or user requests refresh → refresh
- Reuse current sections, refresh only missing/stale
- `LIGHTWEIGHT = true` → treat all existing as current, skip delegations; refresh only critical unknowns with zero coverage

`research.md` missing + `LIGHTWEIGHT = true` → minimal research: resolve only critical unknowns not covered by Technical Context Document.

### 3a. Resolve Clarifications

Per `NEEDS CLARIFICATION` in spec/plan: reuse existing findings or research the unknown. Consolidate in `FEATURE_DIR/research.md`.

### 3b. Research Best Practices

Report: "🔍 Researching tech stack best practices and architecture patterns..."

**Delegate: Technical Researcher** (`.github/agents/_technical-researcher.md`):
- **Topics** (by `SPEC_TYPE`, only uncovered/stale):
  - Product: domain architecture, UX-supporting architecture, implementation trade-offs
  - Technical: framework, migration, schema, integration, compatibility, validation patterns
  - Operational: IaC, deployment, CI/CD, observability, environment promotion, reliability patterns
- **Context**: Feature spec, tech stack from `plan.md`, `TECH_CONTEXT_CONTENT` (if available)
- **Purpose**: "Inform architectural decisions and tech stack configuration"
- **File Paths**: `FEATURE_DIR/spec.md`, `FEATURE_DIR/plan.md`, `FEATURE_DIR/research.md` (if exists), `TECH_CONTEXT_DOC` (if registered)

Coverage sufficient → skip delegation.
`TECH_CONTEXT_CONTENT` covers 80%+ of tech decisions → skip Technical Researcher entirely, note "Baseline from Technical Context Document".

Merge into `FEATURE_DIR/research.md` (full rewrite). Follow plan-authoring skill research.md format: structured fields per topic, no prose paragraphs, max 2 sources/topic, ≤4KB.

Update `plan.md` Technical Context with resolved values.
Populate `## Architecture Decisions` table with decisions made during research (AD-001, AD-002...).
- `TECH_CONTEXT_CONTENT` available → use as baseline, overlay with user choices + research findings, reference source path.

### 3c. Determine Project Mode

Scan repository for existing source code (excluding `specs/`, `node_modules/`, build artifacts):
- Source files found → `PROJECT_MODE = brownfield` (or `mixed` if feature adds new top-level directories)
- No source files → `PROJECT_MODE = greenfield`
- Record in `plan.md` Technical Context `Project Mode` field.

### 3d. Determine Design Artifacts

Scan resolved `spec.md` and Technical Context to decide Phase 1 artifacts.

Branch by `SPEC_TYPE`:
- `product` → apply data/API signal heuristics
- `technical`/`operational` → `data-model.md` and `contracts/` are **opt-in only** when spec explicitly includes Key Entities, interface deliverables, or requirement language clearly calling for persistent data/contracts

**Implementation Signals shortcut**: If `spec.md` contains an `## Implementation Signals` section, use tagged signals directly:
- `NEW-ENTITY` or `MIGRATION` → `GENERATE_DATA_MODEL = true`
- `NEW-API` → `GENERATE_CONTRACTS = true`
- Other tags (`NEW-UI`, `EXTERNAL-SERVICE`, `BREAKING-CHANGE`, `NEW-WORKER`, `NEW-CONFIG`) → informational, used to guide architecture decisions in Phase 1
- If Implementation Signals section exists and has explicit tags → skip heuristic detection below, use signals as authoritative

**Data signals** (any match → generate `data-model.md`):
- Non-empty "Key Entities" section
- Terms: `database`, `storage`, `persist`, `store`, `CRUD`, `model`, `schema`, `table`, `collection`, `record`, `entity`
- Technical Context `Storage` ≠ `N/A`

**API signals** (any match → generate `contracts/`):
- Terms: `API`, `endpoint`, `route`, `REST`, `GraphQL`, `HTTP`, `webhook`, `request/response`, `server`, `client-server`, `RPC`
- Technical Context `Project Type` is `web` or `mobile`

**No signals detected:**
- `SPEC_TYPE` = technical/operational → silently default Neither, log
- `Project Type` = `single` (or not web/mobile) → silently default Neither, log
- **Autopilot guard (P5)**: `AUTOPILOT = true` → silently default Neither, log
- `Project Type` = web/mobile + `AUTOPILOT = false` → ask: "Design Artifacts" / "No API surface or persistent data detected. Which?" → `Data Model only` / `API Contracts only` / `Both` / `Neither` (recommended)

Store as `GENERATE_DATA_MODEL` and `GENERATE_CONTRACTS` (true/false).

## 4. Phase 1 — Design Execution

**4.1 Data Modeling** *(skip if `GENERATE_DATA_MODEL` = false)*
- False → replace `## Data Model Summary` table with `N/A — no persistent data`
- True → **Delegate: Database Administrator** (`.github/agents/_database-administrator.md`): `SpecPath`, `ResearchPath`, `OutputPath`: `FEATURE_DIR/data-model.md` → populate `## Data Model Summary` table in `plan.md`

**4.2 API Contracts** *(skip if `GENERATE_CONTRACTS` = false)*
- False → replace `## API Surface Summary` table with `N/A — no API surface`
- True → **Delegate: API Designer** (`.github/agents/_api-designer.md`): `SpecPath`, `DataModelPath` (if generated), `OutputDir`: `FEATURE_DIR/contracts/` → populate `## API Surface Summary` table in `plan.md`

**4.3 High-Level Architecture**
- Reuse Technical Context Document terminology/boundaries when available
- Populate `## Architecture` Mermaid C4 diagram in `plan.md`: Container view (system boundaries) or Component view (internal boundaries). ≤20 nodes, no class-level detail. Use `<br>` for line breaks (never `\n`).
- Align with DataModel and Contracts outputs
- Add any remaining Architecture Decisions (AD-###) to the table

**4.4 Source Code Structure**
- Detect `PROJECT_MODE` from Step 3c.
- Greenfield: fill full layout based on Project Type (ref: plan-authoring SKILL.md Project Structure Options).
- Brownfield/Mixed: scan existing layout, show only new (`+`) and modified (`~`) paths. Include Brownfield Notes block.
- Strip all HTML comments, `[REPLACE: ...]`, `[REMOVE IF UNUSED]` markers.

**4.5 Testing Strategy & QC Tooling**
- Read `Language/Version` and `Primary Dependencies` from `plan.md` Technical Context
- Scan repo root for existing tool configs (`.golangci-lint.yml`, `eslint.config.*`, `pyproject.toml` with `[tool.ruff]`/`[tool.bandit]`, `clippy.toml`, `biome.json`, etc.)
- **Delegate: Technical Researcher** (`.github/agents/_technical-researcher.md`):
  - **Topics**: "Best QC tools for [Language/Version] [Dependencies]" — test runner, linter/static analysis, security scanner, coverage tool
  - **Context**: Language, framework, dependency manager, existing configs, `project-instructions.md` quality mandates
  - **Purpose**: "Recommend specific QC tools and install commands"
  - Return: tool name, install command, rationale per category
- Populate `## Testing Strategy` table in `plan.md`: one row per tier (Unit, Integration, Security, Coverage) with Tool, Scope, Mock Boundary, Install columns. Existing config → Install = `configured`; N/A tier → include row with rationale.

**4.6 Error Handling Strategy**
- If feature has API endpoints, external service calls, or user-facing error states → populate `## Error Handling Strategy` table
- Otherwise → replace table with `N/A — [reason]`

**4.7 Integration Points**
- If spec has Integration Points section → populate `## Integration Points` table mapping each to technical approach
- Otherwise → remove section from plan

**4.8 Risk Mitigation**
- Read Assumptions & Risks from spec.md → populate `## Risk Mitigation` table with concrete technical mitigations
- Every risk from spec must have a row

**4.9 Requirement Coverage Map**
- Read all requirement IDs (FR-###, TR-###, OR-###, RR-###) from spec.md
- Map each to the component(s) and file path(s) that will implement it
- Populate `## Requirement Coverage Map` table
- This table is the primary input for `/sddp-tasks`

**4.10 Implementation Hints**
- Populate `## Implementation Hints` with max 5 tagged items: gotchas, order-sensitive operations, non-obvious constraints
- Format: `- **[HINT-###]** Category: detail`

## 5. Post-Design Gate

### 5.0 Plan Readiness Self-Check

Before compliance check, validate:
1. Every conditional section is either populated with a table OR replaced with `N/A — [reason]`
2. No `[REPLACE: ...]` or template placeholder markers remain
3. Mermaid diagram uses valid C4 syntax
4. Every requirement ID from spec.md appears in Requirement Coverage Map
5. Architecture Decisions table has at least one row (or `N/A` for trivial features)

Failures → fix inline before proceeding.

### 5.1 Compliance Check

**Delegate: Policy Auditor** (`.github/agents/_policy-auditor.md`):
- Task: "Validate completed `FEATURE_DIR/plan.md` against project instructions"
- Report pass/fail inline; `FAIL` → warn user

## 5.5 Generate Checklist Queue

1. Read `MAX_CHECKLIST_COUNT` from Context Report. `0` → skip entirely.
2. Analyze `plan.md`, `spec.md`, design artifacts for risk/domain signals:
   - Auth/secrets/input validation → **Security**
   - Data model/storage/migrations → **Data Integrity**
   - API/endpoints/HTTP → **API Quality**
   - UI/frontend/accessibility → **UX**
   - Latency/throughput/caching → **Performance**
   - Logging/monitoring/metrics → **Observability**
   - Test strategy/coverage/edge cases → **Testing**
3. Rank by signal strength, select top N = min(detected, `MAX_CHECKLIST_COUNT`)
4. Ensure `FEATURE_DIR/checklists/` exists
5. Write `FEATURE_DIR/checklists/.checklists`:
   ```
   # Recommended Checklists
   > Auto-generated by /sddp-plan based on risk signals detected in the technical plan.

   - [ ] CHL001 Security
   - [ ] CHL002 API Quality
   - [ ] CHL003 Performance
   ```
   (`CHL###` IDs, 3-digit zero-padded, sequential. Domain name = `/sddp-checklist` argument.)
6. `.checklists` exists:
   - **Autopilot guard (P6)**: `AUTOPILOT = true` → Overwrite, log
   - `AUTOPILOT = false` → ask overwrite or keep

## 5.6 Amend Technical Context Document

Update registered Technical Context document before final reporting.

### 5.6.1 Preconditions
- `HAS_TECH_CONTEXT_DOC = false` → skip
- `true` → read `TECH_CONTEXT_DOC` (unreadable → warn, continue; non-blocking)

### 5.6.2 Content Scope (Strict)
Promote only reusable project-level context from planning artifacts (`plan.md`, `research.md`, optional `data-model.md`, `contracts/`):
- Stable technology baseline decisions
- Cross-cutting architectural constraints/standards
- Reusable integration patterns and system boundaries
- Shared operational expectations (deployment env, observability, security posture)

Do NOT include: feature-specific endpoints/payloads/schema, feature-only component logic, one-off implementation notes.

### 5.6.3 Merge Strategy (Managed Section Full Rewrite)
1. Maintain `## Project Context Baseline Updates` section
2. Parse + normalize existing entries
3. Merge with new reusable technical context
4. De-duplicate semantically
5. Full rewrite of managed section; preserve all other content
6. Section missing → create at end
7. Preserve every narrative architecture section and Mermaid C4 diagram outside managed section verbatim

### 5.6.4 Failure Handling
- Best-effort, non-blocking. Surface failures as warnings in final report.

## 6. Report

Output:
- Branch name and plan file path
- Generated artifacts list
- Instructions check status
- Checklist queue summary (if generated): domain count + `.checklists` path
- Shared document amendment summary (updated/skipped/warnings)
- Suggested next steps with context-specific prompts:
  1. `/sddp-checklist` *(optional — for safety-critical/compliance features; repeatable for queued domains)*
  2. `/sddp-tasks` *(required)*

</workflow>
