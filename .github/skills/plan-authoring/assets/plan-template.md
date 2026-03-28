# Implementation Plan: [FEATURE]

**Branch**: `[00001-feature-name]` | **Date**: [DATE] | **Spec**: [link]

## Summary

**Goal**: [one-sentence: what this feature delivers]  
**Approach**: [one-sentence: technical strategy]  
**Key Constraint**: [one-sentence: primary limiting factor or N/A]

## Technical Context

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]  
**Project Type**: [single/web/mobile — determines source structure]  
**Project Mode**: [greenfield/brownfield/mixed]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Instructions Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on project instructions file]

## Architecture

```mermaid
C4Context
  [Mermaid C4 diagram — Container or Component view, ≤20 nodes]
```

## Architecture Decisions

| ID | Decision | Options Considered | Chosen | Rationale |
|----|----------|--------------------|--------|-----------|
| AD-001 | [question] | [option A / option B / ...] | [chosen] | [why] |

<!-- Populated during Phase 0 research and Phase 1 design. Tasks may reference {AD-###}. -->

## Data Model Summary

<!-- Populate when GENERATE_DATA_MODEL = true; otherwise replace the section body with "N/A — no persistent data". -->

| Entity | Key Fields | Relationships | Notes |
|--------|------------|---------------|-------|
| [entity] | [fields] | [relations] | [constraints, state transitions] |

**Detail**: `FEATURE_DIR/data-model.md`

<!-- If no data model: replace table with "N/A — no persistent data" -->

## API Surface Summary

<!-- Populate when GENERATE_CONTRACTS = true; otherwise replace the section body with "N/A — no API surface". -->

| Method | Path | Purpose | Auth | Req/Res Types |
|--------|------|---------|------|---------------|
| [verb] | [route] | [what it does] | [auth model] | [type refs] |

**Detail**: `FEATURE_DIR/contracts/`

<!-- If no API: replace table with "N/A — no API surface" -->

## Testing Strategy

| Tier | Tool | Scope | Mock Boundary | Install |
|------|------|-------|---------------|---------|
| Unit | [tool] | [what's tested] | [what's mocked] | [cmd or "configured"] |
| Integration | [tool] | [what's tested] | [what's mocked] | [cmd or "configured"] |
| Security | [tool] | [scan target] | — | [cmd or "configured"] |
| Coverage | [tool] | [measurement] | — | [cmd or "configured"] |

## Error Handling Strategy

<!-- If not applicable (e.g., pure library, CLI tool with simple exit codes), replace the section body with "N/A — [reason]". -->

| Error Category | Pattern | Response | Retry |
|----------------|---------|----------|-------|
| [e.g., Validation] | [e.g., fail-fast] | [e.g., 400 + structured error] | [no] |
| [e.g., Downstream timeout] | [e.g., circuit breaker] | [e.g., 503 + retry-after] | [yes, exponential] |

## Integration Points

<!-- Remove this section only when spec has no Integration Points section. -->

| Spec Reference | System/Service | Technical Approach | Contract |
|----------------|----------------|--------------------|----------|
| [from spec] | [external name] | [how integrated] | [link or inline] |

## Risk Mitigation

| Risk (from spec) | Likelihood | Impact | Mitigation | Owner |
|-------------------|------------|--------|------------|-------|
| [risk description] | [L/M/H] | [L/M/H] | [technical mitigation] | [component/team] |

## Requirement Coverage Map

| Req ID | Component(s) | File Path(s) | Notes |
|--------|--------------|--------------|-------|
| [FR/TR/OR/RR-###] | [service, model, handler] | [src/path] | [approach notes] |

<!-- Every requirement from spec.md must appear. This table is the primary input for /sddp-tasks. -->

## Project Structure

### Source Code

```text
[Generate project structure based on Project Type + Project Mode.
 Brownfield: show only new/modified paths, prefixed with + (new) or ~ (modified).
 Greenfield: show full layout.]
```

<!-- Brownfield Notes (include only when Project Mode = brownfield or mixed):
**Patterns to reuse**: [existing patterns relevant to this feature]
**Tests to extend**: [existing test files/suites to add cases to]
**Naming conventions**: [observed conventions to follow]
-->

## Implementation Hints

<!-- Max 5 items. Gotchas, order-sensitive operations, non-obvious constraints. -->

- **[HINT-001]** [Category]: [detail]
