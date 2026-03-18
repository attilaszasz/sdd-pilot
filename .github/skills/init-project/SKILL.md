---
name: init-project
description: "Bootstrap or amend `project-instructions.md` and preserve the registered bootstrap document paths that downstream agents depend on."
---

# Project Initializer Workflow

<rules>
- Always operate on `project-instructions.md` — never create a new file
- Preserve heading hierarchy.
- Use ISO dates (`YYYY-MM-DD`).
- Principles must be declarative, testable, and specific.
- Versioning follows semantic versioning; defer to `instructions-management` rules for bump semantics.
- If critical info is missing, insert `TODO(<FIELD>): explanation` and flag it in the report.
- `REPO_STATE = NEW` only when `project-instructions.md` still contains untouched placeholder tokens; otherwise `EXISTING`.
- Persist source-code location policy only in `project-instructions.md`, never in `.github/sddp-config.md`.
- Delegate best-practice research only to **Technical Researcher**.
- In `AMEND`, research only changed or new principle areas unless the user requests a full refresh.
- Preserve registered Product, Technical Context, Deployment & Operations, and Project Plan paths during init unless the user explicitly chooses a replacement.
- If those paths are empty, adopt defaults when present: `specs/prd.md`, `specs/sad.md`, `specs/dod.md`, `specs/project-plan.md`.
- Never clear a populated bootstrap document path during init.
</rules>

<workflow>

## 0. Acquire Shared Guidance

Read `.github/skills/instructions-management/SKILL.md` to understand the update process, versioning rules, consistency propagation, and principles of good instructions writing.

## 1. Detect Mode and Repository State

Read `project-instructions.md`.

If `project-instructions.md` still contains placeholder tokens like `[ALL_CAPS_IDENTIFIER]`:
- `MODE = INIT`
- `REPO_STATE = NEW`
- adapt the number of principles and sections to the real project

Otherwise:
- `MODE = AMEND`
- `REPO_STATE = EXISTING`
- identify the sections the user wants changed
- note the current version from the footer
- do not reclassify the repo as `NEW` from the filesystem layout

## 2. Collect Values

For each placeholder (INIT) or changed section (AMEND):
- use user-provided values first
- otherwise infer from repo context (`README`, docs, prior versions, related artifacts)

Set:
- `LAST_AMENDED_DATE` = today when changes are made
- `INSTRUCTIONS_VERSION`:
  - `INIT` -> `1.0.0`
  - `AMEND` -> semantic version bump
    - `MAJOR`: backward-incompatible principle removal or redefinition
    - `MINOR`: new principle or section, or material expansion
    - `PATCH`: clarification, wording, typo

If version bump type is ambiguous, ask the user to choose from options (MAJOR/MINOR/PATCH) with reasoning before finalizing.

### Source-Code Location Policy

If `REPO_STATE = NEW`:
- `SOURCE_CODE_LOCATION_POLICY = ENFORCE_SRC_ROOT`
- add a concrete rule that project source code MUST live under `/src` and its subdirectories
- scope the rule to source code, not every repository artifact

If `REPO_STATE = EXISTING`:
- `SOURCE_CODE_LOCATION_POLICY = PRESERVE_EXISTING_LAYOUT`
- do not add a new `/src`-only rule unless the user explicitly asks
- preserve any existing source-code location rule unless the user asks to change it

## 2.5 Preserve or Adopt Bootstrap Documents

Ensure `.github/sddp-config.md` exists before final write-back.

### Product Document

Detect candidate product-document paths from:
- user attachments
- explicit paths
- mentions of `product document`, `product brief`, `PRD`, or `Product Requirements Document`

Then:
1. Parse `.github/sddp-config.md` -> `## Product Document` -> `**Path**:`.
2. If a registered path exists:
   - preserve it by default
   - if `specs/prd.md` exists and differs, ask whether to keep the registered path or adopt `specs/prd.md`
   - recommend `specs/prd.md` only when it is substantive and the user wants the bootstrap PRD canonical
  - if a user-provided candidate path differs, validate it; if it is unreadable, warn and keep the registered path; if valid, ask whether to keep the registered path or replace it, recommending keep unless the new file is explicitly intended to become canonical
3. If no registered path exists:
   - adopt `specs/prd.md` when present
  - otherwise validate and register a user-provided candidate path when present; if it is unreadable, warn and proceed without it
  - otherwise ask:
    - **Header**: `Product Doc`
    - **Question**: `Do you have a markdown product document? If not, you can create one later with /sddp-prd. This will be used as context in future /sddp-specify runs.`
    - **Options**: `No product document yet` (recommended) with free-form path input enabled
    - if the user provides a path, validate it and register it when valid
4. If the registered path is unreadable or missing and `specs/prd.md` exists, warn and recommend adopting `specs/prd.md`.
5. Never clear a populated Product Document path.

### Technical Context / Deployment & Operations / Project Plan

Apply the same pattern to:
- `## Technical Context Document` -> default `specs/sad.md`
- `## Deployment & Operations Document` -> default `specs/dod.md`
- `## Project Plan` -> default `specs/project-plan.md`

For each document type:
1. Parse the registered `**Path**:`.
2. If a registered path exists, preserve it by default.
3. If the default path exists and differs, ask whether to keep the registered path or adopt the default path; recommend the default only when it is substantive and the user wants the bootstrap artifact canonical.
4. If no registered path exists and the default path exists, adopt the default path.
5. If the registered path is unreadable or missing but the default path exists, warn and recommend the default path.
6. Never clear a populated path.

These registered paths are references only; downstream agents read the files on demand.

## 3. Research Best Practices

Set research scope by mode:
- `INIT` -> research all proposed principle areas
- `AMEND` -> research only changed or new principle or governance areas
- reuse sufficient existing rationale for unchanged principles

Before delegating, report: `Researching industry standards for project principles.`

**Delegate: Technical Researcher** (see `.github/agents/_technical-researcher.md`):
- **Topics**: the scoped principle and governance areas, with relevant standards and recognized practices
- **Context**: the user request, plus concise summaries of any preserved or adopted Product Document, Technical Context Document, and Project Plan when they affect governance
- **Purpose**: "Strengthen principle rationale and align rules with recognized industry practices."

Incorporate the research findings into the drafted principles. Cite sources where appropriate.

## 4. Draft Updated Content

- Replace every placeholder with concrete text; leave no unexplained bracket tokens.
- Preserve heading hierarchy.
- Each principle needs a succinct name, non-negotiable rule, and rationale.
- Governance must cover amendment procedure, versioning policy, and compliance expectations.
- Apply the source-code location policy from Step 2 exactly.
- Remove comments once replaced unless they still add value.

## 5. Consistency Check

**Delegate: Configuration Auditor** (see `.github/agents/_configuration-auditor.md` for methodology):
- **Input**: the full drafted `project-instructions.md`
- **Task**: validate the instructions against project templates and update references to changed principles

Use the returned Sync Impact Report in validation and final reporting.

## 6. Validation

Verify:
- no unexplained bracket tokens remain
- version line matches the Sync Impact Report
- all dates are ISO format
- principles use explicit MUST/SHOULD-style rules with rationale
- `NEW` repos persist the `/src` source-code rule
- `EXISTING` repos do not gain a new `/src`-only rule unless explicitly requested

## 7. Write and Report

Write updated project instructions to `project-instructions.md`.

After writing, assess autopilot readiness from `.github/sddp-config.md`:
- read Product Document `**Path**:`
- read Technical Context Document `**Path**:`
- read Project Plan `**Path**:`
- read Autopilot `**Enabled**:`
- `AUTOPILOT_READY = true` only when Product and Technical Context documents are registered and Autopilot is enabled
- this is a handoff recommendation gate only; do not run bootstrap phases here

Generate a concrete next-feature example from the strongest available project context in this order:
1. explicit feature or product direction in the `/sddp-init` request
2. the preserved, adopted, or registered Project Plan: earliest unchecked P1 epic, otherwise earliest unchecked epic, preferring its `Specify input`
3. the preserved, adopted, or registered Product Document
4. the preserved or adopted Technical Context Document
5. repository context such as `README.md`

Use that same context to produce all of the following so the handoff remains coherent:
- a concrete feature-description example phrased as user value
- a concrete branch name replacing `#####-feature-name`
- the exact next-step command or prompt

Output:
- mode used and what changed
- repository state and why
- new version and bump rationale
- source-code location decision
- Product Document path or `none`
- Technical Context Document path or `none`
- Deployment & Operations Document path or `none`
- Project Plan path or `none`
- autopilot readiness:
  - report `READY` only when Product Document, Technical Context Document, and Autopilot are all satisfied
  - list each prerequisite as satisfied or missing
  - explicitly name every missing prerequisite
- files flagged for manual follow-up
- next step: tell the user to commit current changes first with a suggested commit message, then choose the appropriate branch below

Next-step branch rules:
- If `AUTOPILOT_READY = true`:
  - primary: `/sddp-autopilot <feature description>`
  - alternative manual path: `/sddp-specify ...`
  - if a Project Plan identifies a next epic, prefer `/sddp-specify E### <Specify input>`
- If `AUTOPILOT_READY = false`:
  - recommend every exact corrective action:
    - missing Product Document -> `/sddp-prd`
    - missing Technical Context Document -> `/sddp-systemdesign`
    - autopilot disabled -> set `**Enabled**: true` in `.github/sddp-config.md`
  - after prerequisite guidance, fall back to `/sddp-specify ...`
  - if a Project Plan identifies a next epic, prefer `/sddp-specify E### <Specify input>`
  - if handoff actions are available, mention `Start Feature Specification` as the safe UI action until readiness is satisfied

In both branches:
- include `git checkout -b #####-feature-name` with a concrete numeric prefix and kebab-case feature slug
- include a brief feature-description guide to help the user write a good `/sddp-specify` prompt:
  ```
  A good `/sddp-specify` prompt describes **what** and **who**, not **how**:
  - ✅ "Users can register and log in with email and password"
  - ✅ "Admins can export monthly sales reports as CSV"
  - ❌ "Build a REST API with JWT auth"
  - ❌ "Build the app"
  ```
- include the suggested commit message, e.g. `docs: init project instructions v1.0.0` or `docs: amend project instructions to vX.Y.Z`

</workflow>
