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
- Structured sections (`## Technology Stack`, `## Testing & Quality Policy`, `## Source Code Layout`, `## Development Workflow`) are mandatory in the output — they must always be present even if some fields are set to "none" or "TODO".
- Template version 2 is the current format. Detect older templates (missing `<!-- template-version:`) and offer migration during AMEND.
- `LIGHTWEIGHT_MODE` skips Technical Researcher delegation but still runs all other steps including Configuration Auditor.
</rules>

<workflow>

## 0. Acquire Shared Guidance

Read `.github/skills/instructions-management/SKILL.md` for update process, versioning rules, consistency propagation, and principles writing.

## 1. Detect Mode, Repository State, and Execution Mode

Read `project-instructions.md`.

- Contains placeholder tokens like `[ALL_CAPS_IDENTIFIER]` → `MODE = INIT`, `REPO_STATE = NEW`; adapt principles/sections to real project
- Otherwise → `MODE = AMEND`, `REPO_STATE = EXISTING`; identify sections to change; note current version from footer; do not reclassify as `NEW`

### Template Version Detection

- `<!-- template-version: 2 -->` present → `TEMPLATE_VERSION = 2`
- Missing template-version comment → `TEMPLATE_VERSION = 1` (legacy)
- `MODE = AMEND` and `TEMPLATE_VERSION = 1` → offer migration: "Your project instructions use the legacy format. Migrate to v2 (adds Technology Stack, Testing & Quality Policy, Source Code Layout, Development Workflow sections) while preserving all existing content?" If accepted, restructure content into v2 sections. If declined, proceed with existing structure but warn that QC enforcement may be incomplete.

### Execution Mode

- User passes `--quick` or request mentions "quick" / "lightweight" / "minimal" → `LIGHTWEIGHT_MODE = true`
- Repo has ≤ 20 source files (excluding node_modules, .git, vendor, build, dist) → `LIGHTWEIGHT_MODE = true` (auto)
- Otherwise → `LIGHTWEIGHT_MODE = false`
- Report when lightweight mode is auto-activated; suggest `--full` for comprehensive research later.

## 1.5. Auto-Detect Technology Stack

Scan the repository root (and common subdirectories) for manifest files. Build a `DETECTED_STACK` record:

| Manifest | Detects |
|---|---|
| `package.json` | Node.js; parse `engines.node` for version; TypeScript if `typescript` in deps/devDeps; test runner from `jest`/`vitest`/`mocha`/`playwright`/`cypress` in devDeps; linter from `eslint`/`biome`/`oxlint` in devDeps; formatter from `prettier`/`biome` in devDeps; frameworks from `next`/`react`/`vue`/`angular`/`express`/`fastify`/`hono` in deps |
| `tsconfig.json` | TypeScript; parse `compilerOptions.strict` for strictness; `target` for ES version |
| `pyproject.toml` / `setup.py` / `setup.cfg` | Python; parse `requires-python` for version; test runner from `pytest`/`unittest`; linter from `ruff`/`pylint`/`flake8`; formatter from `black`/`ruff`; frameworks from `django`/`flask`/`fastapi` |
| `Cargo.toml` | Rust; parse `rust-version`; `clippy` assumed as linter |
| `go.mod` | Go; parse `go` directive for version; `golangci-lint` as common linter |
| `*.csproj` / `*.sln` | .NET/C#; parse `TargetFramework` for version |
| `pom.xml` / `build.gradle` / `build.gradle.kts` | Java/Kotlin; parse `java.version` or `sourceCompatibility` |
| `Gemfile` | Ruby; parse for `rails`/`sinatra` frameworks; `rubocop` linter |
| `composer.json` | PHP; parse `require.php` for version; `laravel`/`symfony` frameworks |
| `Dockerfile` / `docker-compose.yml` | Docker infrastructure |
| `.github/workflows/*.yml` | CI platform = GitHub Actions |
| `.gitlab-ci.yml` | CI platform = GitLab CI |

For each detected item, set confidence:
- `HIGH` = parsed from explicit version field
- `MEDIUM` = inferred from dependency presence
- `LOW` = inferred from file existence only

Store `DETECTED_STACK` with fields: `language`, `runtime_version`, `frameworks`, `test_runner`, `linter`, `formatter`, `storage` (from deps: `pg`/`mysql2`/`redis`/`mongodb`/`prisma`/`typeorm`/`sequelize`/`drizzle`/`sqlalchemy`/`diesel`), `infrastructure`, `ci_platform`.

If no manifest files found → `DETECTED_STACK = empty`; proceed to Step 2 without pre-population.

## 2. Collect Values

- For each placeholder (INIT) or changed section (AMEND): use user-provided values first → infer from repo context (`README`, docs, prior versions) → fall back to `DETECTED_STACK`
- Set `LAST_AMENDED_DATE` = today when changes are made
- `INSTRUCTIONS_VERSION`: `INIT` → `1.0.0`; `AMEND` → semantic bump:
  - `MAJOR`: backward-incompatible principle removal/redefinition
  - `MINOR`: new principle/section or material expansion
  - `PATCH`: clarification, wording, typo
- Ambiguous bump → ask user to choose (MAJOR/MINOR/PATCH) with reasoning

### Source-Code Location Policy

- `REPO_STATE = NEW` → `SOURCE_CODE_LOCATION_POLICY = ENFORCE_SRC_ROOT`; add rule: project source code MUST live under `/src`; scope to source code only
- `REPO_STATE = EXISTING` → `SOURCE_CODE_LOCATION_POLICY = PRESERVE_EXISTING_LAYOUT`; no new `/src`-only rule unless user explicitly asks; preserve existing rule

### Interactive Principle Builder (MODE = INIT)

When `MODE = INIT`, present a structured questionnaire to collect values for the template's structured sections. Pre-fill answers from `DETECTED_STACK` where available.

Ask the user (batch into a single prompt with multiple questions):

1. **Project name**: "What is the project name?" — pre-fill from `package.json#name`, `Cargo.toml#[package].name`, repo directory name
2. **Core principles**: "What are your 3–7 non-negotiable project principles? Examples: Test-First (TDD mandatory), Library-First (modular design), Simplicity (YAGNI), Security-First, Type Safety." — let user describe freely; agent structures into MUST/SHOULD rules with rationale
3. **Technology stack confirmation**: "Detected: [DETECTED_STACK summary]. Correct? Adjustments?" — show detected language, frameworks, storage, infrastructure; user confirms or corrects
4. **Testing philosophy**: Options: `TDD strict (red-green-refactor)` / `Test-after (write tests after implementation)` / `Coverage target only` / `Minimal (critical paths only)` — pre-fill if test runner detected
5. **Coverage target**: "What minimum code coverage do you require?" — Options: `100%` / `80%` / `60%` / `No target` / custom number
6. **Static analysis**: "Require linting in QC?" — pre-fill detected linter; Options: `Yes, [detected linter]` / `Yes, other: ___` / `No`
7. **Security scanning**: "Require security scanning in QC?" — Options: `Yes, in CI` / `Yes, manual` / `No`
8. **Branching strategy**: Options: `Feature branches + squash merge` / `GitHub Flow` / `GitFlow` / `Trunk-based` / custom
9. **Commit convention**: Options: `Conventional Commits` / `Free-form` / custom

Map answers directly to template sections:
- Q1 → `# [PROJECT_NAME]`
- Q2 → `## Core Principles` (structure each into `### N. Name` + rule + rationale)
- Q3 → `## Technology Stack` fields
- Q4 + Q5 → `## Testing & Quality Policy` fields (Test Strategy, Coverage Target)
- Q6 → `## Testing & Quality Policy` → Linting/Formatting + `## Testing & Quality Policy` → Required QC Categories (include "linting")
- Q7 → `## Testing & Quality Policy` → Required QC Categories (include "security scanning" if yes)
- Q8 → `## Development Workflow` → Branching
- Q9 → `## Development Workflow` → Commit Convention

When `MODE = AMEND`, skip the questionnaire; use user request to identify changed sections.

## 2.5 Preserve or Adopt Bootstrap Documents

Ensure `.github/sddp-config.md` exists before final write-back.

For each of the four document types, apply this unified pattern:

| Document Type | Config Heading | Default Path |
|---|---|---|
| Product Document | `## Product Document` | `specs/prd.md` |
| Technical Context Document | `## Technical Context Document` | `specs/sad.md` |
| Deployment & Operations Document | `## Deployment & Operations Document` | `specs/dod.md` |
| Project Plan | `## Project Plan` | `specs/project-plan.md` |

For each document type:
1. Parse `.github/sddp-config.md` → registered `**Path**:` value
2. If registered path exists and file is readable → **keep** (no action needed)
3. If registered path is empty and default file exists → **adopt** the default path silently
4. If registered path points to a missing/unreadable file and default exists → **warn** and recommend adopting default
5. If user provides an explicit candidate path → validate readability; if valid, ask keep-or-replace (only when a different path is already registered)
6. Never clear a populated path

After processing all four, present a single summary table for confirmation:

```
Bootstrap Documents:
| Document              | Path                   | Status         |
|-----------------------|------------------------|----------------|
| Product Document      | specs/prd.md           | ✅ adopted      |
| Technical Context     | (none)                 | ⚠ not found    |
| Deployment & Ops      | (none)                 | — optional      |
| Project Plan          | specs/project-plan.md  | ✅ preserved    |
```

These are references only; downstream agents read files on demand.

## 3. Research Best Practices

### Skip conditions

- `LIGHTWEIGHT_MODE = true` → skip this step entirely. Use common-sense defaults for principle rationale. Report: `Research skipped (lightweight mode). Run /sddp-init --full to add industry-standard rationale.`

### Known-Stack Shortcut

Before delegating to Technical Researcher, check if `DETECTED_STACK.language` matches a known profile with cached rationale:

| Stack Profile | Cached Principle Guidance |
|---|---|
| TypeScript + Node.js | Strict compiler options, ESLint/Biome for lint, Vitest/Jest for testing, prefer type-safe patterns |
| Python + Django/FastAPI | Ruff/Pylint for lint, pytest for testing, type hints encouraged, Django security middleware |
| Rust | Clippy for lint, cargo test, ownership model enforces memory safety, minimal unsafe usage |
| Go | golangci-lint, go test, simplicity-first idiomatic Go, error handling patterns |
| .NET / C# | dotnet test, Roslyn analyzers, nullable reference types, structured logging |
| Java + Spring | JUnit/TestNG, SpotBugs/Checkstyle, dependency injection patterns |
| Ruby + Rails | RuboCop, RSpec/Minitest, Rails security defaults, convention over configuration |

If `DETECTED_STACK` matches a known profile → use cached guidance as baseline. Still delegate to Technical Researcher for user-specified principle areas that go beyond the cached profile (e.g., specific compliance standards, unusual architecture patterns).

If no match → delegate full research as before.

### Full Research

- `INIT` → research all proposed principle areas (minus any covered by known-stack cache)
- `AMEND` → research only changed/new principle or governance areas; reuse existing rationale for unchanged

Report: `Researching industry standards for project principles.`

**Delegate: Technical Researcher** (`.github/agents/_technical-researcher.md`):
- **Topics**: scoped principle/governance areas with relevant standards
- **Context**: user request + `DETECTED_STACK` summary + concise summaries of preserved/adopted Product Document, Technical Context Document, Project Plan when they affect governance
- **Purpose**: "Strengthen principle rationale and align rules with recognized industry practices."

Incorporate findings into drafted principles. Cite sources where appropriate.

## 4. Draft Updated Content

- Replace every placeholder with concrete text; leave no unexplained bracket tokens
- Preserve heading hierarchy and `<!-- template-version: 2 -->` comment
- Each principle: succinct name, non-negotiable rule, rationale
- `## Technology Stack`: populate from `DETECTED_STACK` (confirmed by user) or user-provided values
- `## Testing & Quality Policy`: populate from questionnaire answers; ensure QC-relevant keywords are present (see keyword list in template comments)
- `## Source Code Layout`: apply source-code location policy from Step 2
- `## Development Workflow`: populate from questionnaire answers
- `## Governance`: keep pre-filled defaults; append user-provided additional rules
- Remove template comments once replaced unless they document QC keyword requirements

## 5. Consistency Check

**Delegate: Configuration Auditor** (`.github/agents/_configuration-auditor.md`):
- **Input**: full drafted `project-instructions.md`
- **Task**: validate instructions against project templates; update references to changed principles

Use returned Sync Impact Report in validation and final reporting.

## 6. Validation

Verify:
- `<!-- template-version: 2 -->` comment present on first line
- No unexplained bracket tokens remain (except `<!-- -->` HTML comments)
- Version line matches Sync Impact Report
- All dates ISO format
- Principles use MUST/SHOULD-style rules with rationale
- `## Technology Stack` section present with at least Language/Runtime populated
- `## Testing & Quality Policy` section present
- `## Source Code Layout` section present with Policy field
- `## Development Workflow` section present
- `NEW` repos persist `/src` source-code rule under `## Source Code Layout`
- `EXISTING` repos do not gain `/src`-only rule unless explicitly requested

## 6.5. Downstream Readiness Dry-Run

Simulate what QC will extract from the drafted `project-instructions.md` to give the user immediate feedback:

1. **Parse `REQUIRED_QC_CATEGORIES`**: scan for QC keyword signals in the `## Testing & Quality Policy` section and `## Core Principles`:
   - `lint`, `static analysis`, `code quality`, `strict` → Static Analysis / Linting
   - `security`, `vulnerability`, `audit`, `OWASP`, `scanning` → Security
   - `coverage`, `code coverage`, `minimum coverage` → Coverage
   - `WCAG`, `accessibility`, `a11y` → Accessibility
   - `benchmark`, `latency`, `throughput`, `performance` → Performance
2. **Parse `COVERAGE_THRESHOLD`**: extract numeric value from Coverage Target field
3. **Report**:
   ```
   QC Enforcement Preview:
   | Category              | Status                        |
   |-----------------------|-------------------------------|
   | Static Analysis       | ✅ enforced (keyword: "lint") |
   | Security              | ✅ enforced (keyword: "security scanning") |
   | Coverage              | ✅ enforced (target: 80%)     |
   | Accessibility         | ❌ not mentioned              |
   | Performance           | ❌ not mentioned              |
   ```
4. If a category the user likely cares about is missing (e.g., security for a web app), add a suggestion: "Consider adding 'security scanning' to Required QC Categories to enable automated security checks."
5. This is advisory only — do not block on missing categories.

## 7. Write and Report

Write updated `project-instructions.md`.

### Derived QC Policy

Write a `## Derived QC Policy` section to `.github/sddp-config.md` (create section if missing, update if exists). This section is owned exclusively by Init — QC reads it but never writes:

```markdown
## Derived QC Policy
**Coverage Target**: [numeric value or empty]
**Required Categories**: [comma-separated list: linting, security, coverage, accessibility, performance — or empty]
```

Parse values from the finalized `## Testing & Quality Policy` section using the same keyword extraction as Step 6.5. This eliminates repeated keyword-scanning by QC on every run.

### Autopilot Readiness

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

### AMEND Changelog

When `MODE = AMEND`, generate a structured changelog in the report:

```
## Changes (v1.0.0 → v1.1.0)
- [MODIFIED] Principle III: Coverage target changed from 80% → 90%
- [ADDED] Security scanning to Required QC Categories
- [REMOVED] Manual code review gate from Development Workflow
- [MIGRATED] Template upgraded from v1 → v2
```

Include this changelog verbatim in the suggested commit message body.

### Output

Report:
- Mode used, what changed
- Repository state and why
- Template version (and migration status if applicable)
- Detected technology stack summary (with confidence levels)
- New version and bump rationale
- Source-code location decision
- Product Document path or `none`
- Technical Context Document path or `none`
- Deployment & Operations Document path or `none`
- Project Plan path or `none`
- QC Enforcement Preview table (from Step 6.5)
- AMEND Changelog (if applicable)
- Lightweight mode status (and suggestion to run `--full` if skipped research)
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
- If tech stack was auto-detected, offer: `/sddp-devsetup` to verify local environment matches detected stack
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
- `AMEND` → include changelog in commit message body

</workflow>
