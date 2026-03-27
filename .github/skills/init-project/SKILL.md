---
name: init-project
description: "Bootstrap or amend `project-instructions.md` and preserve the registered bootstrap document paths that downstream agents depend on."
---

# Project Initializer Workflow

<rules>
- Always operate on `project-instructions.md` — never create a new file.
- Preserve heading hierarchy. Use ISO dates (`YYYY-MM-DD`).
- Principles must be declarative, testable, and specific.
- Versioning follows semantic versioning; defer to `instructions-management` rules for bump semantics.
- Missing critical info → insert `TODO(<FIELD>): explanation` and flag in report.
- `REPO_STATE = NEW` only when `project-instructions.md` contains untouched placeholder tokens; otherwise `EXISTING`.
- Persist source-code location policy only in `project-instructions.md`, never in `.github/sddp-config.md`.
- Delegate best-practice research only to **Technical Researcher**.
- `AMEND` → research only changed/new principle areas unless user requests full refresh.
- Preserve registered Product, Technical Context, Deployment & Operations, and Project Plan paths during init unless user explicitly replaces.
- Empty paths → adopt defaults when present: `specs/prd.md`, `specs/sad.md`, `specs/dod.md`, `specs/project-plan.md`.
- Never clear a populated bootstrap document path.
</rules>

<workflow>

## 0. Acquire Shared Guidance

Read `.github/skills/instructions-management/SKILL.md` for update process, versioning rules, consistency propagation, and principles writing.

## 1. Detect Mode and Repository State

Read `project-instructions.md`.

- Contains placeholder tokens like `[ALL_CAPS_IDENTIFIER]` → `MODE = INIT`, `REPO_STATE = NEW`; adapt principles/sections to real project
- Otherwise → `MODE = AMEND`, `REPO_STATE = EXISTING`; identify sections to change; note current version from footer; do not reclassify as `NEW`

## 2. Collect Values

- For each placeholder (INIT) or changed section (AMEND): use user-provided values first → infer from repo context (`README`, docs, prior versions)
- Set `LAST_AMENDED_DATE` = today when changes are made
- `INSTRUCTIONS_VERSION`: `INIT` → `1.0.0`; `AMEND` → semantic bump:
  - `MAJOR`: backward-incompatible principle removal/redefinition
  - `MINOR`: new principle/section or material expansion
  - `PATCH`: clarification, wording, typo
- Ambiguous bump → ask user to choose (MAJOR/MINOR/PATCH) with reasoning

### Source-Code Location Policy

- `REPO_STATE = NEW` → `SOURCE_CODE_LOCATION_POLICY = ENFORCE_SRC_ROOT`; add rule: project source code MUST live under `/src`; scope to source code only
- `REPO_STATE = EXISTING` → `SOURCE_CODE_LOCATION_POLICY = PRESERVE_EXISTING_LAYOUT`; no new `/src`-only rule unless user explicitly asks; preserve existing rule

## 2.5 Preserve or Adopt Bootstrap Documents

Ensure `.github/sddp-config.md` exists before final write-back.

### Product Document

Detect candidate paths from: user attachments, explicit paths, mentions of `product document`/`product brief`/`PRD`/`Product Requirements Document`.

1. Parse `.github/sddp-config.md` → `## Product Document` → `**Path**:`
2. Registered path exists:
   - Preserve by default
   - `specs/prd.md` exists and differs → ask keep-or-adopt; recommend `specs/prd.md` only when substantive and user wants it canonical
   - User-provided candidate differs → validate; unreadable → warn and keep registered; valid → ask keep-or-replace, recommend keep unless new file explicitly intended as canonical
3. No registered path:
   - `specs/prd.md` exists → adopt
   - User-provided candidate exists → validate and register when valid; unreadable → warn and proceed without
   - Otherwise ask: Header `Product Doc`, Question `Do you have a markdown product document? If not, you can create one later with /sddp-prd.`, Options: `No product document yet` (recommended) with free-form path input; valid path → register
4. Registered path unreadable/missing and `specs/prd.md` exists → warn, recommend adopting `specs/prd.md`
5. Never clear a populated Product Document path

### Technical Context / Deployment & Operations / Project Plan

Apply same pattern to:
- `## Technical Context Document` → default `specs/sad.md`
- `## Deployment & Operations Document` → default `specs/dod.md`
- `## Project Plan` → default `specs/project-plan.md`

For each:
1. Parse registered `**Path**:`
2. Registered path exists → preserve by default
3. Default path exists and differs → ask keep-or-adopt; recommend default only when substantive
4. No registered path and default exists → adopt
5. Registered path unreadable but default exists → warn, recommend default
6. Never clear a populated path

These are references only; downstream agents read files on demand.

## 3. Research Best Practices

- `INIT` → research all proposed principle areas
- `AMEND` → research only changed/new principle or governance areas; reuse existing rationale for unchanged

Report: `Researching industry standards for project principles.`

**Delegate: Technical Researcher** (`.github/agents/_technical-researcher.md`):
- **Topics**: scoped principle/governance areas with relevant standards
- **Context**: user request + concise summaries of preserved/adopted Product Document, Technical Context Document, Project Plan when they affect governance
- **Purpose**: "Strengthen principle rationale and align rules with recognized industry practices."

Incorporate findings into drafted principles. Cite sources where appropriate.

## 4. Draft Updated Content

- Replace every placeholder with concrete text; leave no unexplained bracket tokens
- Preserve heading hierarchy
- Each principle: succinct name, non-negotiable rule, rationale
- Governance: amendment procedure, versioning policy, compliance expectations
- Apply source-code location policy from Step 2 exactly
- Remove comments once replaced unless they still add value

## 5. Consistency Check

**Delegate: Configuration Auditor** (`.github/agents/_configuration-auditor.md`):
- **Input**: full drafted `project-instructions.md`
- **Task**: validate instructions against project templates; update references to changed principles

Use returned Sync Impact Report in validation and final reporting.

## 6. Validation

Verify:
- No unexplained bracket tokens remain
- Version line matches Sync Impact Report
- All dates ISO format
- Principles use MUST/SHOULD-style rules with rationale
- `NEW` repos persist `/src` source-code rule
- `EXISTING` repos do not gain `/src`-only rule unless explicitly requested

## 7. Write and Report

Write updated `project-instructions.md`.

Assess autopilot readiness from `.github/sddp-config.md`:
- Read Product Document, Technical Context Document, Project Plan `**Path**:` values
- Read Autopilot `**Enabled**:`
- `AUTOPILOT_READY = true` only when Product + Technical Context registered and Autopilot enabled
- Handoff recommendation gate only; do not run bootstrap phases

Generate concrete next-feature example from strongest context (priority order):
1. Explicit feature/direction in `/sddp-init` request
2. Project Plan: earliest unchecked P1 epic → earliest unchecked epic, prefer `Specify input`
3. Product Document
4. Technical Context Document
5. `README.md`

Use that context for all of: feature-description example (user value), concrete branch name, exact next-step command.

Output:
- Mode used, what changed
- Repository state and why
- New version and bump rationale
- Source-code location decision
- Product Document path or `none`
- Technical Context Document path or `none`
- Deployment & Operations Document path or `none`
- Project Plan path or `none`
- Autopilot readiness:
  - `READY` only when Product Document + Technical Context Document + Autopilot all satisfied
  - List each prerequisite as satisfied/missing
  - Explicitly name every missing prerequisite
- Files flagged for manual follow-up
- Next step: commit current changes first with suggested commit message, then choose branch below

Next-step branch rules:
- `AUTOPILOT_READY = true`:
  - Primary: `/sddp-autopilot <feature description>`
  - Alternative: `/sddp-specify ...`
  - Project Plan identifies next epic → prefer `/sddp-specify E### <Specify input>`
- `AUTOPILOT_READY = false`:
  - Recommend every corrective action:
    - Missing Product Document → `/sddp-prd`
    - Missing Technical Context Document → `/sddp-systemdesign`
    - Autopilot disabled → set `**Enabled**: true` in `.github/sddp-config.md`
  - Fall back to `/sddp-specify ...`
  - Project Plan identifies next epic → prefer `/sddp-specify E### <Specify input>`
  - Mention `Start Feature Specification` as safe UI action until readiness satisfied

Both branches include:
- `git checkout -b #####-feature-name` with concrete numeric prefix and kebab-case slug
- Feature-description guide:
  ```
  A good `/sddp-specify` prompt describes **what** and **who**, not **how**:
  - ✅ "Users can register and log in with email and password"
  - ✅ "Admins can export monthly sales reports as CSV"
  - ❌ "Build a REST API with JWT auth"
  - ❌ "Build the app"
  ```
- Suggested commit message, e.g. `docs: init project instructions v1.0.0` or `docs: amend project instructions to vX.Y.Z`

</workflow>
