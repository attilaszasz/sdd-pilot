---
name: init-project
description: "Bootstraps or amends SDD project governance — the non-negotiable project principles and rules that gate all downstream agents. Use when initializing a new project, updating existing principles, or when the user mentions project instructions, governance, or /sddp-init."
---

# Project Initializer Workflow

<rules>
- Always operate on `project-instructions.md` — never create a new file
- Preserve heading hierarchy from the template
- All dates in ISO format (YYYY-MM-DD)
- Principles must be declarative, testable, and free of vague language
- Version changes follow semantic versioning (see instructions-management skill)
- If critical info is missing, insert `TODO(<FIELD>): explanation` and flag in report
- Treat repository state as `NEW` only when `project-instructions.md` still contains untouched placeholder tokens; otherwise treat it as `EXISTING`
- Persist the source-code location decision in `project-instructions.md` only — never add it to `.github/sddp-config.md`
- Research industry best practices before drafting — **Delegate: Technical Researcher**
- In AMEND mode, research only changed or newly introduced principles unless the user explicitly requests a full refresh
- If a Product Document is already registered, preserve it during init. If none is registered but the default project PRD exists at `specs/prd.md`, adopt it. Never clear the Product Document path during init. If the user explicitly provides another product document path, confirm before replacing the existing path.
- If a Technical Context Document is already registered, preserve it during init. If none is registered but the default project SAD exists at `specs/sad.md`, adopt it. Never clear the Technical Context Document path during init.
- If a Deployment & Operations Document is already registered, preserve it during init. If none is registered but the default project DOD exists at `specs/dod.md`, adopt it. Never clear the Deployment & Operations Document path during init.
- If a Project Plan is already registered, preserve it during init. If none is registered but the default project plan exists at `specs/project-plan.md`, adopt it. Never clear the Project Plan path during init.
</rules>

<workflow>

## 0. Acquire Skills

Read `.github/skills/instructions-management/SKILL.md` to understand the update process, versioning rules, consistency propagation, and principles of good instructions writing.

## 1. Detect Mode and Repository State

Read `project-instructions.md`.

### Case A: First-Time Init (template has placeholder tokens)

- Identify every placeholder token of the form `[ALL_CAPS_IDENTIFIER]`
- The user might need fewer or more principles than the template — adapt accordingly
- Set `MODE = INIT`
- Set `REPO_STATE = NEW`

### Case B: Amendment (instructions already filled in)

- Identify which sections the user wants to change
- Note the current version from the footer
- Set `MODE = AMEND`
- Set `REPO_STATE = EXISTING`
- Do not reclassify the repository as `NEW` by scanning the filesystem layout; the template state is the deciding signal for this workflow

## 2. Collect Values

For each placeholder (INIT) or changed section (AMEND):
- If user input supplies a value: use it
- Otherwise infer from repo context (README, docs, prior versions) — use search tools to discover relevant files
- `LAST_AMENDED_DATE`: today if changes are made
- `INSTRUCTIONS_VERSION`:
  - **INIT mode**: start at `1.0.0`
  - **AMEND mode**: increment per semantic versioning rules:
    - **MAJOR**: Backward-incompatible principle removals or redefinitions
    - **MINOR**: New principle/section added or materially expanded
    - **PATCH**: Clarifications, wording, typos

If version bump type is ambiguous, ask the user to choose from options (MAJOR/MINOR/PATCH) with reasoning before finalizing.

Determine the source-code location policy and persist that decision in `project-instructions.md`:
- If `REPO_STATE = NEW`:
  - Set `SOURCE_CODE_LOCATION_POLICY = ENFORCE_SRC_ROOT`
  - Add a concrete project instruction that source code MUST live under `/src` and its subdirectories
  - Phrase the rule so it is testable and clearly scoped to source code, not every non-code repository artifact
- If `REPO_STATE = EXISTING`:
  - Set `SOURCE_CODE_LOCATION_POLICY = PRESERVE_EXISTING_LAYOUT`
  - Do not add or newly enforce a `/src`-only constraint unless the user explicitly requests it
  - Preserve any existing source-code location rule already present in `project-instructions.md` unless the user asks to change it

## 2.5. Product Document

Preserve or adopt the project-level Product Document before research.

1. Ensure `.github/sddp-config.md` exists before final write-back.
2. **Detect**: Look for file attachments, explicit file paths (e.g., `docs/product-brief.md`, `specs/prd.md`, `prd.md`), or mentions of a "product document", "product brief", "PRD", "Product Requirement Document", or similar.
3. If `.github/sddp-config.md` exists, parse `## Product Document` → `**Path**:`.
4. If the parsed path is non-empty:
  - Preserve it unchanged by default.
  - If the default project PRD exists at `specs/prd.md` and differs from the registered path:
    - Ask the user whether to keep the existing path or adopt the default project PRD.
    - Recommend adopting the default project PRD only when it is substantive and the user wants the bootstrap PRD to become canonical.
  - If a detected path was provided and differs from the registered path:
    - Validate the file exists by attempting to read it.
    - If the file does not exist or is not readable, warn the user and keep the existing path.
    - If valid, ask the user whether to keep the existing path or replace it with the provided path.
    - Recommend keeping the existing path unless the new file is explicitly intended to become canonical.
5. If the parsed path is empty or the config does not exist:
  - If the default project PRD exists at `specs/prd.md`:
    - Adopt it by setting `## Product Document` → `**Path**:` to `specs/prd.md`.
  - Else if a detected path was provided:
    - Validate the file exists by attempting to read it.
    - If the file does not exist or is not readable, warn the user and proceed without it.
    - If valid, store the path in `.github/sddp-config.md` under the `## Product Document` section by setting the `**Path**:` field.
  - Else ask the user:
    - **Header**: "Product Doc"
    - **Question**: "Do you have a product document (markdown) that describes your product? If not, you can create one later with `/sddp-prd`. This will be used as context in future `/sddp-specify` runs."
    - **Options**: "No product document yet" (recommended) + free-form input enabled for entering a path.
    - If a path is provided after answers are received, validate the file exists and, if valid, store it in `.github/sddp-config.md` under the `## Product Document` section by setting the `**Path**:` field.
6. If the existing registered path is unreadable or missing but the default project PRD exists at `specs/prd.md`:
  - Warn the user.
  - Recommend adopting the default project PRD.
7. Never remove a populated Product Document path during init.

The product document path is persisted as a reference — the original file is read on demand by downstream agents. If the file moves or is deleted later, those agents will handle the error gracefully.

## 2.6. Technical Context Document

Preserve or adopt the project-level Technical Context Document before research.

1. Ensure `.github/sddp-config.md` exists before final write-back.
2. If `.github/sddp-config.md` exists, parse `## Technical Context Document` → `**Path**:`.
3. If the parsed path is non-empty:
  - Preserve it unchanged by default.
  - If the default project SAD exists at `specs/sad.md` and differs from the registered path:
    - Ask the user whether to keep the existing path or adopt the default project SAD.
    - Recommend adopting the default project SAD only when it is substantive and the user wants the system-design output to become canonical.
4. If the parsed path is empty or the config does not exist, and the default project SAD exists at `specs/sad.md`:
  - Adopt it by setting `## Technical Context Document` → `**Path**:` to `specs/sad.md`.
5. If the existing registered path is unreadable or missing but the default project SAD exists at `specs/sad.md`:
  - Warn the user.
  - Recommend adopting the default project SAD.
6. Never remove a populated Technical Context Document path during init.

The Technical Context Document remains a reference path. Its content is read on demand by downstream agents.

## 2.7. Deployment & Operations Document

Preserve or adopt the project-level Deployment & Operations Document before research.

1. Ensure `.github/sddp-config.md` exists before final write-back.
2. If `.github/sddp-config.md` exists, parse `## Deployment & Operations Document` → `**Path**:`.
3. If the parsed path is non-empty:
  - Preserve it unchanged by default.
  - If the default project DOD exists at `specs/dod.md` and differs from the registered path:
    - Ask the user whether to keep the existing path or adopt the default project DOD.
    - Recommend adopting the default project DOD only when it is substantive and the user wants the deployment-operations output to become canonical.
4. If the parsed path is empty or the config does not exist, and the default project DOD exists at `specs/dod.md`:
  - Adopt it by setting `## Deployment & Operations Document` → `**Path**:` to `specs/dod.md`.
5. If the existing registered path is unreadable or missing but the default project DOD exists at `specs/dod.md`:
  - Warn the user.
  - Recommend adopting the default project DOD.
6. Never remove a populated Deployment & Operations Document path during init.

The Deployment & Operations Document remains a reference path. Its content is read on demand by downstream agents.

## 2.8. Project Plan

Preserve or adopt the project-level Project Plan before research.

1. Ensure `.github/sddp-config.md` exists before final write-back.
2. If `.github/sddp-config.md` exists, parse `## Project Plan` → `**Path**:`.
3. If the parsed path is non-empty:
  - Preserve it unchanged by default.
  - If the default project plan exists at `specs/project-plan.md` and differs from the registered path:
    - Ask the user whether to keep the existing path or adopt the default project plan.
    - Recommend adopting the default project plan only when it is substantive and the user wants the project-planning output to become canonical.
4. If the parsed path is empty or the config does not exist, and the default project plan exists at `specs/project-plan.md`:
  - Adopt it by setting `## Project Plan` → `**Path**:` to `specs/project-plan.md`.
5. If the existing registered path is unreadable or missing but the default project plan exists at `specs/project-plan.md`:
  - Warn the user.
  - Recommend adopting the default project plan.
6. Never remove a populated Project Plan path during init.

The Project Plan remains a reference path. Its content is read on demand by downstream agents and can be used to suggest the next epic-specific `/sddp-specify` handoff.

## 3. Research Best Practices

Set research scope by mode:
- **INIT mode**: research all proposed principle areas.
- **AMEND mode**: research only modified/new principles and governance sections.
- If an unchanged principle already has sufficient rationale in the current instructions, reuse it without re-research.

Before delegating, report to the user: "🔍 Researching industry standards for project principles — this may take 15–30 seconds."

**Delegate: Technical Researcher** (see `.github/agents/_technical-researcher.md` for methodology):
- **Topics**: Only the scoped areas above (changed/new in AMEND; all in INIT), with relevant industry standards (e.g., testing strategies, CI/CD patterns, code review processes, documentation standards, 12-Factor App, OWASP, Google SRE practices).
- **Context**: The feature/project description from the user input. If a product document was preserved, adopted, or registered in Step 2.5, read it and include a summary of its key points (product vision, domain, target audience, constraints) as additional context. If a Technical Context Document was preserved or adopted in Step 2.6, read it and include a short summary of the established architecture/stack constraints as additional context. If a Project Plan was preserved or adopted in Step 2.8, read it and include a short summary of the planned delivery increments only when that affects governance choices or handoff guidance.
- **Purpose**: "Strengthen principle rationale and align rules with industry-recognized patterns."

Incorporate the research findings into the drafted principles. Cite sources where appropriate.

## 4. Draft Updated Content

- Replace every placeholder with concrete text (no bracketed tokens left)
- Preserve heading hierarchy
- Each Principle: succinct name, non-negotiable rules, explicit rationale
- Governance section: amendment procedure, versioning policy, compliance expectations
- If `SOURCE_CODE_LOCATION_POLICY = ENFORCE_SRC_ROOT`, include an explicit rule in `project-instructions.md` that source code MUST live under `/src` and its subdirectories
- If `SOURCE_CODE_LOCATION_POLICY = PRESERVE_EXISTING_LAYOUT`, do not introduce a new `/src`-only rule unless the user explicitly requested that amendment
- Comments can be removed once replaced, unless they still add guidance

## 5. Consistency Check

**Delegate: Configuration Auditor** (see `.github/agents/_configuration-auditor.md` for methodology):
- **Input**: The full text of the drafted Project Instructions.
- **Task**: Validate the new Project Instructions against project templates and update any that reference outdated principles.

The audit will produce a Sync Impact Report summarizing version changes, modified principles, and template updates.

## 6. Validation

- Review the Sync Impact Report.
- Include the report in your response to the user.
- Verify:
  - No unexplained bracket tokens remaining
  - Version line matches report
  - Dates in ISO format
  - Principles use MUST/SHOULD with rationale (no "should" without justification)
  - `REPO_STATE = NEW` drafts persist a `/src` source-code location rule in `project-instructions.md`
  - `REPO_STATE = EXISTING` drafts do not add a new `/src`-only rule unless explicitly requested

## 7. Write and Report

Write updated project instructions to `project-instructions.md`.

After writing, assess autopilot readiness from `.github/sddp-config.md`:
- Parse `## Product Document` → `**Path**:`.
- Parse `## Technical Context Document` → `**Path**:`.
- Parse `## Project Plan` → `**Path**:`.
- Parse `## Autopilot` → `**Enabled**:`.
- Set `AUTOPILOT_READY = true` only when both document paths are registered (non-empty) and Autopilot is enabled.
- This readiness check is a handoff recommendation gate only. Do not run project-bootstrap phases here, and do not duplicate the deeper readability or sufficiency checks enforced by `/sddp-autopilot`.

Generate a concrete next-feature example from the strongest available project context in this order:
1. Explicit feature or product direction from the user's `/sddp-init` request
2. The preserved, adopted, or registered Project Plan — prefer the earliest unchecked P1 epic, otherwise the earliest unchecked epic, using its `Specify input` when available
3. The preserved, adopted, or registered Product Document
4. The preserved or adopted Technical Context Document
5. Repository context such as `README.md`

Use that same context to produce all of the following so the handoff remains coherent:
- A concrete feature-description example phrased in terms of user value
- A concrete proposed branch name that replaces `#####-feature-name`
- The exact example command or prompt text for the recommended next step

Output:
- Mode used (INIT or AMEND) and what was changed
- Repository state used (NEW or EXISTING) and why
- New version and bump rationale
- Source-code location decision: `/src` rule applied, preserved, amended, or skipped
- Product document: path if preserved, adopted, or registered, or "none" if skipped
- Technical Context Document: path if preserved/adopted, or "none"
- Deployment & Operations Document: path if preserved/adopted, or "none"
- Project Plan: path if preserved/adopted, or "none"
- Autopilot readiness:
  - Report `READY` only when Product Document is registered, Technical Context Document is registered, and Autopilot is enabled in shared config.
  - List each prerequisite separately with satisfied or missing status.
  - If readiness fails, explicitly name every missing prerequisite.
- Files flagged for manual follow-up
- Next step: instruct the user to commit current changes first using the suggested commit message, then choose the recommendation branch below:
  - If `AUTOPILOT_READY = true`:
    - Recommend `/sddp-autopilot <feature description>` as the primary next step.
    - Include the exact autopilot command example using the concrete feature-description example generated above.
    - Keep the manual `/sddp-specify` path as an alternative. If a Project Plan exists and a next epic was identified, prefer `/sddp-specify E### <Specify input>`; otherwise use a useful suggested prompt based on the same feature-description example.
  - If `AUTOPILOT_READY = false`:
    - For each missing prerequisite, recommend the exact corrective action:
      - Missing Product Document → `/sddp-prd`
      - Missing Technical Context Document → `/sddp-systemdesign`
      - Autopilot disabled → set `**Enabled**: true` in `.github/sddp-config.md` under `## Autopilot`
    - If multiple prerequisites are missing, list all of them rather than collapsing the guidance into a single generic note.
    - After the prerequisite guidance, fall back to `/sddp-specify` as the manual next step. If a Project Plan exists and a next epic was identified, prefer `/sddp-specify E### <Specify input>`; otherwise use a useful suggested prompt based on the same feature-description example.
    - If the tool supports handoff actions, mention the `Start Feature Specification` handoff as the safe UI action until autopilot readiness is satisfied.
  - In both branches:
    - Include `git checkout -b #####-feature-name` with `#####-feature-name` replaced by the concrete proposed branch name inferred from available context (user input, product document, technical context, project description, or conversation). Use the conventional format: a short numeric prefix (e.g., `00001`) followed by a kebab-case feature slug (e.g., `00001-user-authentication`). If the next feature is not yet known, infer a reasonable first feature from the strongest available project context.
- Include a brief feature-description guide to help the user write a good `/sddp-specify` prompt:
  ```
  A good `/sddp-specify` prompt describes **what** and **who**, not **how**:
  - ✅ "Users can register and log in with email and password"
  - ✅ "Admins can export monthly sales reports as CSV"
  - ❌ "Build a REST API with JWT auth" (too implementation-focused)
  - ❌ "Build the app" (too vague)
  ```
- Suggested commit message for the commit above (e.g., `docs: init project instructions v1.0.0` or `docs: amend project instructions to vX.Y.Z`)

</workflow>
