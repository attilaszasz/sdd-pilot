# Implementation Plan: [FEATURE]

**Branch**: `[00001-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[00001-feature-name]/spec.md`

**Note**: This template is filled in by the `/sddp-plan` agent. See the plan-authoring skill for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Instructions Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on project instructions file]

## Project Structure

### Documentation (this feature)

```text
specs/[00001-feature]/
├── plan.md              # This file (/sddp-plan command output)
├── research.md          # Phase 0 output (/sddp-plan command)
├── data-model.md        # Phase 1 output, if applicable (/sddp-plan command)
├── quickstart.md        # Phase 1 output (/sddp-plan command)
├── contracts/           # Phase 1 output, if applicable (/sddp-plan command)
└── tasks.md             # Phase 2 output (/sddp-tasks command - NOT created by /sddp-plan)
```

### Source Code (repository root)

```text
[Generate project structure here based on Project Type from Technical Context.
 Refer to Project Structure Options in plan-authoring SKILL.md for reference layouts.]
```

**Structure Decision**: [Document the selected project type and rationale]
