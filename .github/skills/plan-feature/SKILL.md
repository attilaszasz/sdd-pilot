---
name: plan-feature
description: "Orchestrates the implementation planning process — generating plan artifacts, architecture decisions, and design documents from a feature specification. Use when running /sddp-plan or when implementation planning is needed."
---

# Software Architect — Plan Feature Workflow

<rules>
- Report progress at each major milestone
- Follow all writing rules defined in `.github/skills/plan-authoring/SKILL.md` (read in Step 0) — including Instructions Check gate, NEEDS CLARIFICATION resolution, research consolidation, and artifact conventions
- **Question batching**: Batch all user-facing questions into a single interaction point whenever possible. Never issue separate sequential prompts when one combined prompt would work. For example, combine tech-context and alignment questions into one round-trip.
- **Delegation**: Use specialized roles for Data Modeling, API Contracts, and Compliance Auditing to save context window.
- Research best practices and tech stack documentation before designing — **Delegate: Technical Researcher**
- Reuse `FEATURE_DIR/research.md` when coverage is sufficient; refresh only gaps, stale areas, or user-requested updates
- If the user attaches or references a technical context document (architecture doc, tech stack doc, constraints doc), capture its path and persist it in `.github/sddp-config.md` for use as a baseline in planning and downstream agents
</rules>

<workflow>

## 1. Resolve Context

Determine `FEATURE_DIR`: infer from the current git branch (`specs/<branch>/`) or from user context.

**Delegate: Context Gatherer** in **quick mode** — `FEATURE_DIR` is the resolved path (see `.github/agents/_context-gatherer.md` for methodology).

- Require `HAS_SPEC = true`. If false: ERROR — "Missing `spec.md` at `FEATURE_DIR/spec.md`. This file is created by `/sddp-specify`. Run `/sddp-specify [brief feature description]` to create it."
- If `plan.md` does not exist: read the plan template from `.github/skills/plan-authoring/assets/plan-template.md` and create `FEATURE_DIR/plan.md`.
- If `plan.md` already exists:
  - **Autopilot guard (P1)**: If `AUTOPILOT = true`, default to **Overwrite**. Log to `FEATURE_DIR/autopilot-log.md`: "Autopilot: Existing plan.md — defaulting to Overwrite". Skip the user prompt below.
  - If `AUTOPILOT = false`: ask user whether to overwrite or refine.

Load:
- `FEATURE_DIR/spec.md` — the feature specification
- Detect `SPEC_TYPE` from the `spec.md` frontmatter. If it is absent, treat it as `product`.

## 1.5. Technical Context Document

Check if the user attached a file or referenced a technical context document path in `$ARGUMENTS` or the conversation.

1. **Detect**: Look for file attachments, explicit file paths (e.g., `docs/tech-context.md`, `specs/sad.md`), or mentions of "tech context", "architecture doc", "tech stack", "SAD", "Software Architecture Document", or similar.
2. **Auto-adopt default project Technical Context Document**: If `HAS_TECH_CONTEXT_DOC = false` from the Context Report, no new document was detected in step 1, and `specs/sad.md` exists:
  - Read `specs/sad.md`.
  - Persist `specs/sad.md` to `.github/sddp-config.md` under `## Technical Context Document` → `**Path**:`.
  - Set `TECH_CONTEXT_DOC = specs/sad.md` and store the file content as `TECH_CONTEXT_CONTENT`.
  - Skip to Step 2.
3. **Check Context Report**: If `HAS_TECH_CONTEXT_DOC = true` from the Context Report and no new document was detected in step 1:
   - Read the file at `TECH_CONTEXT_DOC`.
   - Store its content as `TECH_CONTEXT_CONTENT` for use in Steps 2 and 3.
   - Skip to Step 2.
4. **If new file detected**: If a new file is detected (from attachment or `$ARGUMENTS`):
   - Validate the file exists by attempting to read it.
   - If the file does not exist or is not readable, warn the user and proceed without it.
  - If `HAS_TECH_CONTEXT_DOC` is already `true` and the new path differs from `TECH_CONTEXT_DOC`:
     - If `TECH_CONTEXT_DOC` is `specs/sad.md`:
       - **Autopilot guard (P2)**: If `AUTOPILOT = true`, default to **Keep existing**. Log to `FEATURE_DIR/autopilot-log.md`: "Autopilot: Default project Technical Context Document already registered — keeping `<existing path>` over `<new path>`". Skip the user prompt below.
     - If `AUTOPILOT = false`: ask the user to confirm replacing the canonical reference:
      - **Header**: "Tech Context"
         - **Question**: "The default project Technical Context Document is already registered at `<existing path>`. Replace it with `<new path>`?"
         - **Options**: "Keep existing" (recommended), "Replace"
    - If `TECH_CONTEXT_DOC` is not `specs/sad.md`:
     - **Autopilot guard (P2)**: If `AUTOPILOT = true`, default to **Replace**. Log to `FEATURE_DIR/autopilot-log.md`: "Autopilot: Tech context doc — replacing `<existing path>` with `<new path>`". Skip the user prompt below.
     - If `AUTOPILOT = false`: ask the user to confirm replacing the existing reference:
      - **Header**: "Tech Context"
      - **Question**: "A tech context document is already registered at `<existing path>`. Replace it with `<new path>`?"
      - **Options**: "Replace" (recommended), "Keep existing"
   - If confirmed (or no prior document exists), write the new path to `.github/sddp-config.md` under the `## Technical Context Document` section's `**Path**:` field.
   - Store the file content as `TECH_CONTEXT_CONTENT`.
5. **If nothing detected and no existing doc**: Do NOT ask the user now. Instead:
   - Set `TECH_CONTEXT_PENDING = true`.
   - This question will be batched with the Step 2 Alignment questions to reduce serial round-trips.
6. **If no document**: Set `TECH_CONTEXT_CONTENT` to empty. Planning proceeds normally with interactive Q&A.

The technical context document path is persisted as a reference — the original file is read on demand. If the file moves or is deleted later, agents will handle the error gracefully.

## 2. Alignment & Pre-Research Gate

1. **Autopilot guard (P3, P4)**: If `AUTOPILOT = true`:
   - If `TECH_CONTEXT_CONTENT` is available: Extract all relevant values (language, frameworks, storage, platform, constraints) from the document and use them directly as the chosen answers. Do NOT prompt the user. Log to `FEATURE_DIR/autopilot-log.md`: "Autopilot: Alignment answers derived from Technical Context Document".
   - If `TECH_CONTEXT_PENDING` is true: Default to **"No tech context document"**. Log: "Autopilot: No tech context doc — using research-informed defaults". Set `TECH_CONTEXT_CONTENT` to empty.
   - Skip all alignment questions and proceed to Policy Auditor.

   If `AUTOPILOT = false`: Ask clarifying questions about tech stack, architecture trade-offs, and critical constraints.
   - **If `TECH_CONTEXT_PENDING` is true**: Include the tech-context question in the same prompt batch:
     - **Question** (as part of the batch): "Do you have a technical context document (architecture, tech stack, constraints)? This will pre-populate planning context and be reused across features."
     - **Options**: "No tech context document" (recommended) + free-form input enabled for entering a path.
     - If a path is provided after answers are received, validate the file exists, persist the path to `.github/sddp-config.md` under `## Technical Context Document` → `**Path**:`, and read the content into `TECH_CONTEXT_CONTENT`.
   - **If `TECH_CONTEXT_CONTENT` is available**: Extract relevant values (language, frameworks, storage, platform, constraints) from the document and pre-fill them as recommended options or defaults in the questions. Mention the source document so the user can confirm or override.
2. **Delegate: Policy Auditor** (see `.github/agents/_policy-auditor.md` for methodology):
   - Task: "Validate 'FEATURE_DIR/spec.md' against project instructions."
  - Action: Report pass/fail status inline to the user (do not persist the Auditor report in `plan.md`).
   - Gate: If `FAIL`:
     - **In autopilot**: If any violation is CRITICAL severity, **HALT** the pipeline. For non-CRITICAL violations, log as WARNING to `FEATURE_DIR/autopilot-log.md` and proceed.
     - **Not in autopilot**: ask user to resolve or justify before proceeding.

## 3. Phase 0 — Research

Conduct research using all available tools to inform the technical plan:

### 3.0 Research Reuse Gate

If `FEATURE_DIR/research.md` exists:
- Read it before launching new research.
- Treat it as current when it covers active tech choices and there are no material new unknowns from `spec.md`/`plan.md`.
- Treat it as stale when critical technical decisions changed, unresolved clarifications remain unsupported, or user requests a refresh.
- Reuse current sections and only refresh missing/stale sections.

### 3a. Resolve Clarifications

For each `NEEDS CLARIFICATION` in the spec or plan template:
1. Reuse existing findings when available; otherwise research the unknown
2. Consolidate findings in `FEATURE_DIR/research.md`.

### 3b. Research Best Practices

Before delegating, report to the user: "🔍 Researching tech stack best practices and architecture patterns — this may take 15–30 seconds."

**Delegate: Technical Researcher** (see `.github/agents/_technical-researcher.md` for methodology):
- **Topics**: Only uncovered or stale topics from official docs for chosen tech, feature-relevant architecture patterns, and critical reference implementations, adapted by `SPEC_TYPE`:
  - Product: current behavior — domain architecture patterns, UX-supporting architecture, and implementation trade-offs.
  - Technical: framework, migration, schema, integration, compatibility, and validation-strategy patterns.
  - Operational: IaC, deployment, CI/CD, observability, environment promotion, and reliability patterns.
- **Context**: The feature spec, tech stack from `plan.md`, and `TECH_CONTEXT_CONTENT` (if available — pass it as additional grounding context).
- **Purpose**: "Inform architectural decisions and tech stack configuration."
- **File Paths**: `FEATURE_DIR/spec.md`, `FEATURE_DIR/plan.md`, `FEATURE_DIR/research.md` (if available), `TECH_CONTEXT_DOC` (if registered)

If reuse gate determines coverage is sufficient, skip delegation.

Merge research findings into `FEATURE_DIR/research.md` alongside clarification research and rewrite the full file (do not append blindly). Follow the `research.md` format defined in the plan-authoring skill — no code blocks, no reference tool comparison tables, decision-level findings only (~50–100 words per topic), max 2 sources per topic, and keep the file at or below 4KB (consolidate first if existing content is above 3KB).

Update `plan.md` Technical Context section with resolved values and research insights.
- **If `TECH_CONTEXT_CONTENT` is available**: Use it as the baseline for field values, overlaying with user-confirmed choices from Step 2 and research findings. Reference the source document path in the Technical Context section.

### 3c. Determine Design Artifacts

Scan the resolved `spec.md` content and the Technical Context in `plan.md` to decide which Phase 1 design artifacts to generate.

Before applying the heuristics below, branch on `SPEC_TYPE`:
- `product`: keep the existing data/API signal heuristics.
- `technical` and `operational`: treat `data-model.md` and `contracts/` as **opt-in artifacts**. Generate them only when the spec explicitly includes a `Key Entities` section, an interface deliverable, or requirement language that clearly calls for persistent data or contract artifacts. Do not generate them solely because the feature happens to mention technical nouns.

**Data signals** (if any match → generate `data-model.md`):
- Spec contains a non-empty "Key Entities" section
- Terms found: `database`, `storage`, `persist`, `store`, `CRUD`, `model`, `schema`, `table`, `collection`, `record`, `entity`
- Technical Context `Storage` field is anything other than `N/A`

**API signals** (if any match → generate `contracts/`):
- Terms found: `API`, `endpoint`, `route`, `REST`, `GraphQL`, `HTTP`, `webhook`, `request/response`, `server`, `client-server`, `RPC`
- Technical Context `Project Type` is `web` or `mobile`

**Safety net**: If *neither* signal category is detected:
- If `SPEC_TYPE` is `technical` or `operational`: Silently default to `Neither`. Log: "No explicit data-model or contract deliverable detected for non-product spec — skipping optional design artifacts." Do NOT prompt the user.
- **If `Project Type` is `single`** (or not `web`/`mobile`): Silently default to `Neither`. Log: "No API surface or persistent data detected — skipping design artifacts (auto-default for single project type)." Do NOT prompt the user.
- **Autopilot guard (P5)**: If `AUTOPILOT = true` (regardless of Project Type): Silently default to `Neither`. Log to `FEATURE_DIR/autopilot-log.md`: "Autopilot: Design artifacts — defaulting to Neither (no signals detected)". Do NOT prompt the user.
- **If `Project Type` is `web` or `mobile`** and `AUTOPILOT = false`: Ask the user to confirm:
  - Header: "Design Artifacts"
  - Question: "No API surface or persistent data detected in the spec. Which design artifacts should be generated?"
  - Options: `Data Model only`, `API Contracts only`, `Both`, `Neither` (recommended: `Neither`)
  - Allow the user to override the auto-detection result.

Store the decisions as `GENERATE_DATA_MODEL` (true/false) and `GENERATE_CONTRACTS` (true/false).

## 4. Phase 1 — Design Execution

**4.1 Data Modeling** *(conditional — skip if `GENERATE_DATA_MODEL` is false)*
- If `GENERATE_DATA_MODEL` is false:
  - Note in `plan.md`: "Data Model: N/A — no persistent data deliverable detected for this spec."
  - Skip.
- Otherwise:
  - **Delegate: Database Administrator** (see `.github/agents/_database-administrator.md` for methodology):
    - `SpecPath`: `FEATURE_DIR/spec.md`
    - `ResearchPath`: `FEATURE_DIR/research.md`
    - `OutputPath`: `FEATURE_DIR/data-model.md`
  - Action: Update `plan.md` with a summary of key entities.

**4.2 API Contracts** *(conditional — skip if `GENERATE_CONTRACTS` is false)*
- If `GENERATE_CONTRACTS` is false:
  - Note in `plan.md`: "API Contracts: N/A — no explicit contract deliverable detected for this spec."
  - Skip.
- Otherwise:
  - **Delegate: API Designer** (see `.github/agents/_api-designer.md` for methodology):
    - `SpecPath`: `FEATURE_DIR/spec.md`
    - `DataModelPath`: `FEATURE_DIR/data-model.md` (if generated, otherwise omit)
    - `OutputDir`: `FEATURE_DIR/contracts/`
  - Action: Update `plan.md` with a link to the contracts and a summary of endpoints.

**4.3 Source Code Structure (Main Agent)**
- Fill "Source Code" section in `plan.md` based on Project Type (refer to Project Structure Options in plan-authoring SKILL.md for reference layouts). The final `plan.md` must not contain HTML comments (`<!-- -->`), `[REPLACE: ...]` or `[REMOVE IF UNUSED]` markers, or template placeholder lines — strip all instructional artifacts before writing.

**4.4 High-Level Architecture**
- Reuse the registered Technical Context Document's terminology and boundaries when available.
- Add a Mermaid C4 architecture diagram in `plan.md`. Use a Container view when system boundaries are the main concern, and a Component view when internal boundaries matter for the feature. Keep diagrams under **20 nodes** and avoid class-level detail.
- In Mermaid diagrams, use `<br>` for line breaks inside node labels — never use `\n`.
- Ensure it aligns with the outputs from the DataModel and Contracts roles.

**4.5 QC Tooling Configuration**
- Read the `Language/Version` and `Primary Dependencies` fields from the Technical Context section of `plan.md`.
- Scan the repository root for existing tool configuration files that indicate a tool is already set up (e.g., `.golangci-lint.yml`, `eslint.config.*`, `.eslintrc.*`, `pyproject.toml` with `[tool.ruff]` or `[tool.bandit]`, `clippy.toml`, `.cargo/audit.toml`, `biome.json`, `.editorconfig`).
- **Delegate: Technical Researcher** (see `.github/agents/_technical-researcher.md` for methodology):
  - **Topics**: "Best current QC tools for [Language/Version] [Primary Dependencies] projects" — covering the four categories: test runner, linter/static analysis, security scanner, and coverage tool.
  - **Context**: The language, framework, dependency manager, and any existing tool config files found in the repository. Include `project-instructions.md` quality mandates if relevant.
  - **Purpose**: "Recommend specific QC tools and install commands for the plan's QC Tooling section."
  - The researcher should return: tool name, install command, and brief rationale per category.
- Populate the `## QC Tooling` section in `plan.md` using the researcher's recommendations:
  - For each category (test runner, linter, security scanner, coverage), fill in the recommended tool name and install command.
  - If a tool config file was detected, note it as "already configured" and omit the install command for that category.
  - If a category is intentionally not applicable (e.g., no external dependencies → security scanner is optional), mark it with rationale: "N/A — [reason]".

## 5. Post-Design Gate

**Delegate: Policy Auditor** (see `.github/agents/_policy-auditor.md` for methodology):
- Task: "Validate the completed 'FEATURE_DIR/plan.md' against project instructions."
- Action: Report pass/fail status inline to the user (do not persist the Auditor report in `plan.md`).
- Gate: If `FAIL`, warn the user.

## 5.5 Generate Checklist Queue

Generate a `.checklists` queue file recommending checklist domains based on the completed plan. This enables `/sddp-checklist` to consume recommended domains automatically without manual input.

1. Read `MAX_CHECKLIST_COUNT` from the Context Report. If the value is `0`, skip this step entirely.
2. Analyze the completed `plan.md`, `spec.md`, and any generated design artifacts (`data-model.md`, `contracts/`) for **risk and domain signals**:
   - Authentication, authorization, secrets, or input validation mentions → **Security**
   - Data model, storage, migrations, or schema mentions → **Data Integrity**
   - API contracts, endpoints, or HTTP mentions → **API Quality**
   - UI, frontend, accessibility, or user interaction mentions → **UX**
   - Latency, throughput, caching, or scaling mentions → **Performance**
   - Logging, monitoring, metrics, or alerting mentions → **Observability**
   - Test strategy, coverage mandates, or edge case mentions → **Testing**
3. Rank detected domains by signal strength (number and specificity of matches). Select the top N domains where N = min(detected domains count, `MAX_CHECKLIST_COUNT`).
4. Ensure the `FEATURE_DIR/checklists/` directory exists.
5. Write `FEATURE_DIR/checklists/.checklists` with entries in the format:
   ```
   # Recommended Checklists
   > Auto-generated by /sddp-plan based on risk signals detected in the technical plan.

   - [ ] CHL001 Security
   - [ ] CHL002 API Quality
   - [ ] CHL003 Performance
   ```
   Each entry uses `CHL###` IDs (3-digit, zero-padded, sequential). The description is the domain name — this is what `/sddp-checklist` will use as the domain argument.
6. If `FEATURE_DIR/checklists/.checklists` already exists:
   - **Autopilot guard (P6)**: If `AUTOPILOT = true`, default to **Overwrite**. Log to `FEATURE_DIR/autopilot-log.md`: "Autopilot: Existing .checklists — defaulting to Overwrite".
   - If `AUTOPILOT = false`: ask the user whether to overwrite or keep the existing queue.

## 5.6 Amend Technical Context Document

If a Technical Context document is registered, update it before final reporting.

### 5.6.1 Preconditions

1. Use the Context Report values `HAS_TECH_CONTEXT_DOC` and `TECH_CONTEXT_DOC`.
2. If `HAS_TECH_CONTEXT_DOC = false`, skip this step.
3. If true, read the file at `TECH_CONTEXT_DOC`.
4. If unreadable/missing, warn and continue (non-blocking).

### 5.6.2 Content Scope (Strict)

Promote only reusable, project-level technical context from the completed planning artifacts (`plan.md`, `research.md`, optional `data-model.md`, optional `contracts/`):
- Stable technology baseline decisions (language/runtime/framework class)
- Cross-cutting architectural constraints and standards
- Reusable integration patterns and system boundaries
- Shared operational expectations (deployment environment class, observability baseline, security posture at policy level)

Do **not** include:
- Feature-specific endpoint definitions, payloads, or schema details
- Feature-only component logic or flow-specific sequencing
- One-off implementation notes that are not broadly reusable

### 5.6.3 Merge Strategy (Managed Section Full Rewrite)

1. Maintain a dedicated section named `## Project Context Baseline Updates`.
2. Parse existing entries in that section and normalize them.
3. Merge with newly extracted reusable technical context from this planning run.
4. De-duplicate semantically similar items.
5. Rewrite the managed section in full, preserving all other document content unchanged.
6. If missing, create the managed section at the end of the document.
7. If the registered Technical Context Document contains `## Project Context Baseline Updates`, preserve every narrative architecture section and every Mermaid C4 diagram outside the managed section verbatim.

### 5.6.4 Failure Handling

- This step is best-effort and non-blocking.
- Any update failure must be surfaced in the final report as a warning.

## 6. Report

Output:
- Branch name and plan file path
- Generated artifacts list
- Instructions check status
- Checklist queue summary (if generated): number of recommended domains and the `.checklists` file path
- Shared document amendment summary (updated/skipped/warnings)
- Suggest next steps with explicit labels — for each option, compose a useful suggested prompt for the user based on the current context:
  1. `/sddp-checklist` *(optional — recommended for safety-critical or compliance-sensitive features; if checklist queue was generated, can be run repeatedly to process all queued domains)* — compose a suggested prompt
  2. `/sddp-tasks` *(required)* — compose a suggested prompt

</workflow>
