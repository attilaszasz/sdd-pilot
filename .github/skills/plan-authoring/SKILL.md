---
name: plan-authoring
description: "Creates implementation plans with technical context, architecture decisions, data models, API contracts, and project instructions alignment checks. Use when designing a technical approach for a feature, choosing technologies, defining data structures, writing a quickstart guide, or when resolving NEEDS CLARIFICATION markers in plans."
---

# Plan Authoring Guide

## Plan Writing Process

### Phase 0: Research
1. Extract unknowns from Technical Context (anything marked NEEDS CLARIFICATION)
   - When a Technical Context Document is registered (`HAS_TECH_CONTEXT_DOC = true`), read it first and use its content as the baseline for field resolution. This reduces `NEEDS CLARIFICATION` markers — values present in the document can be pre-filled, requiring only user confirmation.
2. For each unknown → research task; for each dependency → best practices task
3. Consolidate findings in `research.md` using the format below.

#### research.md Format

Keep research at the **decision/guidance level** — capture *what* was chosen and *why*, not implementation how-to.

**Prohibited content:**
- Code blocks or implementation snippets (code belongs in the implement phase)
- Reference tool comparison tables (mention tool insights inline in Rationale/Alternatives instead)
- Duplicate summary sections

**Per-topic target:** ~50–100 words.

**Structure:**

```markdown
# Research: [Feature Name]
> Feature | Date | Purpose

## [Topic N]
- **Decision**: What was chosen
- **Rationale**: Why chosen (mention reference tools/patterns inline here if relevant)
- **Alternatives**: What else was evaluated and why rejected
- **Pitfalls**: Key anti-patterns or risks to avoid

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

3. **Quickstart** → `quickstart.md`:
   - Integration scenarios and setup instructions

### Instructions Check
- Read `.github/copilot-instructions.md`
- Validate every plan decision against project instructions principles
- Document any deviations in the Complexity Tracking section
- GATE: Must pass before research. Re-check after design.
- Auditor outputs are transient gate checks; report status/decisions in `plan.md` without pasting full Auditor reports.

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

## Project Structure Options

Select based on Project Type:

- **Single project** (default): `src/`, `tests/` at root
- **Web application** (frontend + backend detected): `backend/`, `frontend/`
- **Mobile + API** (iOS/Android detected): `api/`, `ios/` or `android/`

Delete unused options from the template. The delivered plan must not include "Option" labels.

## Template

Use the template at [assets/plan-template.md](assets/plan-template.md).
