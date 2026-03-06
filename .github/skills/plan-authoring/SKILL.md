---
name: plan-authoring
description: "Creates implementation plans with technical context, architecture decisions, data models, API contracts, and project instructions alignment checks. Use when designing a technical approach for a feature, choosing technologies, defining data structures, or when resolving NEEDS CLARIFICATION markers in plans."
---

# Plan Authoring Guide

## Plan Writing Process

### Phase 0: Research
1. Extract unknowns from Technical Context (anything marked NEEDS CLARIFICATION)
   - When a Technical Context Document is registered (`HAS_TECH_CONTEXT_DOC = true`), read it first and use its content as the baseline for field resolution. This reduces `NEEDS CLARIFICATION` markers — values present in the document can be pre-filled, requiring only user confirmation.
2. For each unknown → research task; for each dependency → best practices task
3. Consolidate findings in `research.md` using the format below. Do not append blindly — merge by topic and rewrite the full file.
4. If existing `research.md` is above 3KB, consolidate before adding new findings and keep the final file at or below 4KB.

#### research.md Format

Keep research at the **decision/guidance level** — capture *what* was chosen and *why*, not implementation how-to.

**Prohibited content:**
- Code blocks or implementation snippets (code belongs in the implement phase)
- Reference tool comparison tables (mention tool insights inline in Rationale/Alternatives instead)
- Duplicate summary sections

**Per-topic target:** ~50–100 words.

**Global size budget:** Keep `research.md` at or below **4KB** total. If existing content is above **3KB**, consolidate first.

**Consolidation rules:**
- Merge overlapping topics and normalize similar topic names
- Remove redundant/stale details that do not change decisions
- Keep only the **2 most relevant sources per topic**
- Preserve decision quality: decisions, rationale, alternatives, and pitfalls remain required

**Structure:**

```markdown
# Research: [Feature Name]
> Feature | Date | Purpose

## [Topic N]
- **Decision**: What was chosen
- **Rationale**: Why chosen (mention reference tools/patterns inline here if relevant)
- **Alternatives**: What else was evaluated and why rejected
- **Pitfalls**: Key anti-patterns or risks to avoid
### Sources
- [URL] — [why relevant]
- [URL] — [why relevant]

## Summary
| Decision | Recommendation | Rationale |
|----------|---------------|-----------|

## Sources Index
| URL | Topic | Fetched |
|-----|-------|---------|
```

### Phase 1: Design & Contracts
Prerequisites: `research.md` complete

Items 1 and 2 below are **conditional** — generated only when the spec contains relevant signals. The plan agent auto-detects these signals and falls back to an interactive prompt when ambiguous.

1. **Data Model** → `data-model.md` *(conditional)*:
   - Generated when the spec contains data signals: a non-empty "Key Entities" section, terms like `database`/`storage`/`persist`/`CRUD`/`entity`/etc., or Technical Context `Storage` ≠ `N/A`.
   - When skipped, note "Data Model: N/A" in `plan.md`.
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **API Contracts** → `contracts/` *(conditional)*:
   - Generated when the spec contains API signals: terms like `API`/`endpoint`/`route`/`REST`/`GraphQL`/`HTTP`/`webhook`/etc., or Technical Context `Project Type` is `web` or `mobile`.
   - When skipped, note "API Contracts: N/A" in `plan.md`.
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema files

### Instructions Check
- Read `project-instructions.md`
- Validate every plan decision against project instructions principles
- If violations exist that must be justified, add a "## Complexity Tracking" section to `plan.md` with a table: `| Violation | Why Needed | Simpler Alternative Rejected Because |`. If no violations exist, omit the section entirely.
- GATE: Must pass before research. Re-check after design.
- Auditor outputs are transient gate checks; report status/decisions in `plan.md` without pasting full Auditor reports.

### Artifact Conventions

Key rules for plan authoring (full preservation rules are in `.github/skills/artifact-conventions/SKILL.md` — read only during edit/remediation phases like `/sddp-implement`, `/sddp-analyze`, `/sddp-clarify`):

- Keep `plan.md` at or below **8KB** — use mermaid diagrams sparingly (≤20 nodes, component-level not class-level), consolidate prose, and omit sections that are N/A
- Do NOT remove the **Instructions Check** section — it is a gating checkpoint
- Do NOT remove the **Technical Context** metadata block
- Respect `[NEEDS CLARIFICATION]` markers — only resolve with user-approved answers; never silently remove them
- Preserve all cross-referenced IDs if they appear in the plan

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
| Performance Goals | 1000 req/s | Domain-specific |
| Constraints | <200ms p95 | Domain-specific |
| Scale/Scope | 10k users | Domain-specific |

## QC Tooling Configuration

During planning, populate the `## QC Tooling` section in `plan.md` with tools appropriate for the project's specific tech stack and context. Rather than relying on a fixed list, **research the current best tools** for the project's language, framework, and dependency profile.

### Categories to cover

Every `## QC Tooling` section must address these four categories:

| Category | Purpose | Examples of what to look for |
|---|---|---|
| **Test Runner** | Execute unit and integration tests | Built-in runners, framework-specific runners |
| **Linter / Static Analysis** | Catch code quality issues, enforce style | Language-specific linters, multi-language analyzers |
| **Security Scanner** | Detect vulnerabilities in code and dependencies | SAST tools, dependency audit tools, vulnerability databases |
| **Coverage Tool** | Measure code coverage percentage | Built-in coverage, third-party coverage reporters |

### Research guidelines

- **Delegate to Technical Researcher** during planning Step 4.5 to find the best current tools for the detected tech stack.
- Research should consider: the project's language/version, primary framework, dependency manager, and any existing tool configuration files in the repository.
- Prefer tools that are: widely adopted in the ecosystem, actively maintained, easy to install (ideally single command), and compatible with the project's existing toolchain.
- If a project already has tool configuration files (e.g., `.golangci-lint.yml`, `eslint.config.*`, `pyproject.toml [tool.ruff]`), note them as "already configured" and omit install commands for those categories.
- Mark any intentionally omitted category with a brief rationale (e.g., "Security Scanner: N/A — no external dependencies").
- Always include ready-to-run install commands for tools that are not yet present.

## Project Structure Options

Select based on Project Type:

- **Single project** (default): `src/`, `tests/` at root
- **Web application** (frontend + backend detected): `backend/`, `frontend/`
- **Mobile + API** (iOS/Android detected): `api/`, `ios/` or `android/`

Delete unused options from the template. The delivered plan must not include "Option" labels.

## Template

Use the template at [assets/plan-template.md](assets/plan-template.md).
