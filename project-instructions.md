<!-- template-version: 2 -->
# [PROJECT_NAME] Project Instructions

## Core Principles

<!-- 3–7 non-negotiable principles. Each: succinct name, MUST/SHOULD rule, rationale. Add or remove ### blocks as needed. -->

### I. [PRINCIPLE_NAME]

[PRINCIPLE_RULE] — [PRINCIPLE_RATIONALE]

### II. [PRINCIPLE_NAME]

[PRINCIPLE_RULE] — [PRINCIPLE_RATIONALE]

### III. [PRINCIPLE_NAME]

[PRINCIPLE_RULE] — [PRINCIPLE_RATIONALE]

### IV. Agent Output Style

All agent output MUST be concise and outcome-oriented. This principle supersedes any verbose defaults.

- **Progress reports**: Facts and outcomes only — no narration, no restating the task.
- **Artifacts**: Emit required sections only — no preamble paragraphs, no summary epilogues.
- **Reasoning**: Omit unless the user asks "why" or the decision is non-obvious.
- **Errors / blockers**: State the problem, the attempted fix, and the result — nothing else.
- **Phase-boundary reports**: ≤ 5 bullet points.
- **Preserve without compressing**: Artifact template structure and required sections; explicit decision / registration / validation guidance in shared skills; delegation constraints and sub-agent role definitions; existing size limits (spec ≤ 10 KB, research ≤ 4 KB, stories ≤ 200 words).

## Technology Stack

<!-- Downstream phases (Plan, QC, Autopilot) read this section as the authoritative tech-stack reference. -->

- **Language/Runtime**: [e.g., TypeScript 5.x / Node 22, Python 3.12, Rust 1.78, Go 1.22]
- **Frameworks**: [e.g., Next.js 15, Django 5, Actix-web]
- **Storage**: [e.g., PostgreSQL 16, Redis 7, SQLite — or "none"]
- **Infrastructure**: [e.g., Docker, AWS ECS, Vercel, bare metal — or "local only"]

## Testing & Quality Policy

<!-- QC extracts enforcement rules from this section. Use the keywords below so automated checks activate correctly. -->
<!-- Keywords recognised by QC: lint, static analysis, code quality, coverage, security, vulnerability, OWASP, WCAG, accessibility, benchmark, performance -->

- **Coverage Target**: [e.g., 80% | 100% | none — omit to skip coverage enforcement]
- **Required QC Categories**: [e.g., linting, security scanning, accessibility — omit categories you do not require]
- **Test Strategy**: [e.g., Unit + integration; E2E for critical paths; TDD mandatory]
- **Linting / Formatting**: [e.g., ESLint + Prettier strict, Clippy, Ruff — or "none"]

## Source Code Layout

- **Policy**: [ENFORCE_SRC_ROOT | PRESERVE_EXISTING_LAYOUT]
- **Convention**: [e.g., Source code under /src; tests co-located in __tests__/; config at repo root]

## Development Workflow

- **Branching**: [e.g., Feature branches from main, squash merge]
- **Commit Convention**: [e.g., Conventional Commits, free-form]
- **CI Requirements**: [e.g., All tests pass, lint clean, no type errors before merge]

<!-- Optional: add additional sections below (Security Requirements, Performance Standards, Compliance, etc.) -->

## Governance

- Project instructions supersede all other documentation and practices.
- Amendments require a version bump with ISO-dated changelog entry.
- All implementations MUST pass the Instructions Check gate during planning.
- Complexity beyond these principles MUST be justified and documented.

[GOVERNANCE_ADDITIONAL_RULES]

**Version**: [INSTRUCTIONS_VERSION] | **Last Amended**: [LAST_AMENDED_DATE]
