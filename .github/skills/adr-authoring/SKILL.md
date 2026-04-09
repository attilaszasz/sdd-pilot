---
name: adr-authoring
description: "Defines the canonical MADR format, lifecycle rules, numbering policy, and SAD catalog contract for standalone ADRs under specs/adrs/."
---

# MADR Authoring Skill

Canonical rules for project-level Architecture Decision Records. All ADR file mutations flow through the **ADR Author** subagent (`.github/agents/_adr-author.md`). Orchestrating workflows (system-design, plan-feature, amend-project) decide *when* an ADR is needed; this skill defines *what* the ADR must look like and *how* it is managed.

## Scope

- Project-level architectural decisions only.
- Standalone Markdown files under `specs/adrs/`.
- Feature-local tradeoffs stay in `plan.md` as `AD-###` rows and never invoke this skill.

## MADR Profile

### Required Frontmatter

```yaml
---
adr_id: ADR-NNNN
status: proposed | accepted | deprecated | superseded
date: YYYY-MM-DD
tags: []
supersedes: []
superseded_by: ""
related_artifacts: []
---
```

### Optional Frontmatter

```yaml
deciders: []
consulted: []
informed: []
review_date: YYYY-MM-DD
```

### Required Body Sections

```markdown
# ADR-NNNN: Decision Title

## Status
[Mirrors frontmatter status in human-readable form. Include supersession links when applicable.]

## Context
[Problem, forces, constraints, and why a decision is needed now.]

## Decision Drivers
- [Criteria that drove the choice, ordered by weight]

## Considered Options
### Option A: [Label]
- Pros: …
- Cons: …

### Option B: [Label]
- Pros: …
- Cons: …

## Decision Outcome
Chosen option: **[Label]** — [rationale for selecting it].

## Consequences
### Positive
- …

### Negative
- …

### Neutral
- … *(optional)*

## Links
- [Related ADRs, PRD capabilities, feature specs, project-plan epics, external standards]
```

## Numbering and File Naming

- **Canonical identifier**: `ADR-NNNN` — four-digit, zero-padded, repository-global.
- **File naming**: `specs/adrs/NNNN-decision-title.md` where `decision-title` is lowercase ASCII kebab-case derived from the title.
- **Number allocation**: scan `specs/adrs/` for existing numbered files, resolve the highest allocated `NNNN`, assign the next integer. Numbers are monotonic and never reused.
- **Path stability**: once created, a file path must not be renamed solely because the title wording changes. Title corrections stay in the body/frontmatter; the original slug persists.
- **Compatibility**: readers should accept legacy three-digit references (`ADR-001`) but all new output must use four-digit form (`ADR-0001`).

## Status Vocabulary and Transitions

| Status | Meaning |
|---|---|
| `proposed` | Candidate record, not yet governing. Not binding for downstream planning unless a workflow explicitly allows it. |
| `accepted` | Current governing decision for the covered concern. |
| `deprecated` | No longer recommended for new work; no single explicit successor. Explain what engineers should do instead. |
| `superseded` | Explicitly replaced by one or more newer ADRs. `superseded_by` must be populated. |

**Allowed transitions**: `proposed → accepted`, `proposed → deprecated`, `accepted → deprecated`, `accepted → superseded`, `deprecated → superseded`.

**Disallowed**: `superseded → accepted`, `superseded → proposed`, reuse of a superseded ADR number.

**Coexistence rule**: multiple `accepted` ADRs may coexist when they cover different scopes; competing `accepted` ADRs for the same concern are invalid unless scope is explicitly disambiguated.

## Operation Semantics

| Operation | Behavior |
|---|---|
| `create` | New ADR file with a new ADR number. |
| `amend` | Update existing ADR in place — clerical corrections, metadata completion, broken links, or clarifications that do **not** change the chosen decision. Same ADR number. |
| `supersede` | New ADR with a new ADR number. Old ADR marked `superseded` with forward link. |

**Material-change rule**: any change to the chosen option, decision drivers, or consequences must use `supersede`, not `amend`.

## SAD Catalog Contract

`specs/sad.md` must contain a compact ADR catalog table instead of embedded decision bodies:

```markdown
## Architecture Decision Records

| ADR ID | Title | Status | Date | Supersedes | File |
|--------|-------|--------|------|------------|------|
| ADR-0001 | [Title] | accepted | 2025-01-15 | — | [0001-decision-title.md](adrs/0001-decision-title.md) |
```

- Each row links to the standalone ADR file.
- The ADR Author subagent produces the exact row payload for every create/supersede/amend.
- `sad.md` never contains full decision prose — it is a navigational index.

## Traceability

- **Canonical tag**: `{SAD:ADR-0001}` — four-digit form in all new output.
- **Read compatibility**: accept `{SAD:ADR-001}` and normalize internally to `ADR-0001`.
- **Cross-artifact update**: when a file is materially edited for another reason, normalize any ADR references to four-digit form in the same change.

## Validation Checklist

Before the ADR Author subagent writes, all of the following must pass:

1. Operation is `create`, `amend`, or `supersede`.
2. Scope is explicitly `project-level`.
3. Decision title, context, options, chosen outcome, and consequences are present.
4. Status is a valid vocabulary value.
5. For `supersede`: target ADR exists and is resolvable.
6. For `amend`: change is non-semantic (does not alter decision outcome).
7. ADR number is unique and follows monotonic allocation.
8. File name matches `NNNN-slug.md` pattern.
9. All required frontmatter fields are present.
10. All required body sections are present.

## Caller Expectations

- Callers must decide whether a decision is project-level before invoking ADR authoring.
- Callers must provide a fully resolved decision payload — the subagent does not infer scope.
- Callers must propagate resulting ADR IDs into plan references, project-plan traceability, and related docs.
- Feature-local `AD-###` decisions must not be promoted automatically without an explicit project-level scope decision from the caller.

## Output Contract

The ADR Author subagent returns:

| Field | Description |
|---|---|
| `Status` | `success` or `failure` |
| `OperationResult` | `created`, `amended`, `superseded`, or `no-op` |
| `AdrId` | Canonical `ADR-NNNN` identifier |
| `AdrPath` | Final file path under `specs/adrs/` |
| `SupersededAdrId` | Populated when `supersede`; otherwise empty |
| `SadCatalogRow` | Exact Markdown table row for `sad.md` |
| `FilesChanged` | Ordered list of files written or updated |
| `Warnings` | Non-blocking issues |
| `Errors` | Blocking issues (present only on failure) |
