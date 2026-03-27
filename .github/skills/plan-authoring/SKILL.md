---
name: plan-authoring
description: "Creates implementation plans with technical context, architecture decisions, data models, API contracts, and project instructions alignment checks. Use when designing a technical approach for a feature, choosing technologies, defining data structures, or when resolving NEEDS CLARIFICATION markers in plans."
---

# Plan Authoring Guide

## Plan Writing Process

### Phase 0: Research
1. Extract unknowns from Technical Context (anything marked NEEDS CLARIFICATION)
   - If `HAS_TECH_CONTEXT_DOC = true` → read it first as baseline for field resolution; pre-fill values, require only user confirmation.
2. For each unknown → research task; for each dependency → best practices task
3. Consolidate findings in `research.md` using the format below. Do not append blindly — merge by topic and rewrite the full file.
4. If existing `research.md` is above 3KB, consolidate before adding new findings and keep the final file at or below 4KB.

#### research.md Format

Keep research at the **decision/guidance level** — capture *what* was chosen and *why*, not implementation how-to.

**Prohibited:** code blocks, implementation snippets, reference tool comparison tables, duplicate summary sections.

**Per-topic target:** ~50–100 words. **Global budget:** ≤4KB. Existing >3KB → consolidate first.

**Consolidation:** merge overlapping topics, normalize names, remove stale details, keep ≤2 sources/topic, preserve decisions/rationale/alternatives/pitfalls.

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

Items 1–2 are **conditional** — auto-detect signals from spec; fall back to interactive prompt when ambiguous.

1. **Data Model** → `data-model.md` *(conditional)*:
   - Generate when: non-empty "Key Entities", terms `database`/`storage`/`persist`/`CRUD`/`entity`/etc., or `Storage` ≠ `N/A`
   - Skip → note "Data Model: N/A" in `plan.md`
   - Include: entity names, fields, relationships, validation rules, state transitions

2. **API Contracts** → `contracts/` *(conditional)*:
   - Generate when: terms `API`/`endpoint`/`route`/`REST`/`GraphQL`/`HTTP`/`webhook`/etc., or `Project Type` = `web`/`mobile`
   - Skip → note "API Contracts: N/A" in `plan.md`
   - Map user actions → endpoints; use REST/GraphQL patterns; output OpenAPI/GraphQL schemas

### Instructions Check
- Read `project-instructions.md`
- Validate every plan decision against project instructions principles
- If violations exist that must be justified, add a "## Complexity Tracking" section to `plan.md` with a table: `| Violation | Why Needed | Simpler Alternative Rejected Because |`. If no violations exist, omit the section entirely.
- GATE: Must pass before research. Re-check after design.
- Auditor outputs are transient gate checks; report status/decisions in `plan.md` without pasting full Auditor reports.

### Artifact Conventions

Full rules: `.github/skills/artifact-conventions/SKILL.md` (read during edit/remediation phases).

- `plan.md` ≤ **8KB** — Mermaid ≤20 nodes (component-level), omit N/A sections
- Mermaid: C4 syntax, Container/Component views, `<br>` for breaks (never `\n`)
- Do NOT remove **Instructions Check** or **Technical Context** sections
- `[NEEDS CLARIFICATION]` → resolve only with user-approved answers
- Preserve all cross-referenced IDs

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

These same fields should also appear in the project-level Technical Context Document when one is maintained.

## QC Tooling Configuration

Populate `## QC Tooling` in `plan.md` with stack-appropriate tools. **Research current best tools** — do not rely on a fixed list.

### Categories to cover

| Category | Purpose |
|---|---|
| **Test Runner** | Unit and integration tests |
| **Linter / Static Analysis** | Code quality, style enforcement |
| **Security Scanner** | Vulnerabilities in code and dependencies |
| **Coverage Tool** | Code coverage measurement |

### Research guidelines

- **Delegate to Technical Researcher** during planning Step 4.5 for detected tech stack.
- Consider: language/version, framework, dependency manager, existing tool configs.
- Prefer: widely adopted, actively maintained, single-command install, compatible with existing toolchain.
- Existing config files (`.golangci-lint.yml`, `eslint.config.*`, `pyproject.toml [tool.ruff]`) → "already configured", omit install commands.
- Omitted category → brief rationale (e.g., "Security Scanner: N/A — no external dependencies").
- Include ready-to-run install commands for tools not yet present.

## Project Structure Options

Select based on Project Type:

- **Single project** (default): `src/`, `tests/` at root
- **Web application** (frontend + backend detected): `backend/`, `frontend/`
- **Mobile + API** (iOS/Android detected): `api/`, `ios/` or `android/`

Delete unused options from the template. The delivered plan must not include "Option" labels.

## Template

Use the template at [assets/plan-template.md](assets/plan-template.md).
