---
name: instructions-management
description: "Manages the project instructions — a document of non-negotiable project principles and governance rules. Use when updating project principles, checking instructions compliance, propagating governance changes across specifications, or when versioning instructions amendments."
---

# Instructions Management Guide

## What are the Project Instructions?

`project-instructions.md` contains non-negotiable project principles gating all downstream decisions. Highest authority in the SDD process.

## Template Structure (v2)

The current template (v2) has these mandatory sections:

1. `## Core Principles` — 3–7 numbered non-negotiable principles with MUST/SHOULD rules and rationale
2. `## Technology Stack` — Language/Runtime, Frameworks, Storage, Infrastructure
3. `## Testing & Quality Policy` — Coverage Target, Required QC Categories, Test Strategy, Linting/Formatting. QC extracts enforcement rules from keywords in this section.
4. `## Source Code Layout` — Policy (ENFORCE_SRC_ROOT or PRESERVE_EXISTING_LAYOUT) and Convention
5. `## Development Workflow` — Branching, Commit Convention, CI Requirements
6. `## Governance` — Pre-filled defaults plus project-specific additions

Template version is tracked via `<!-- template-version: 2 -->` on the first line. Legacy templates (v1) lack structured sections and use `[PRINCIPLE_N_NAME]` placeholders.

## Update Process

### 1. Load Current Project Instructions
- Read `project-instructions.md`.
- Identify all placeholder tokens: `[ALL_CAPS_IDENTIFIER]`.
- Adapt section count to user needs — fewer or more principles than template provides.
- Check template version: `<!-- template-version: 2 -->` present → v2; missing → v1 (offer migration).

### 2. Collect Values for Placeholders
- Use values from user input (conversation).
- Infer from repo context (README, docs, prior versions) if not provided.
- Auto-detect from manifest files (package.json, Cargo.toml, etc.) for Technology Stack and Testing & Quality Policy sections.
- `LAST_AMENDED_DATE`: today if changes made.
- Version: see [references/versioning-rules.md](references/versioning-rules.md).

### 3. Draft Updated Content
- Replace every placeholder with concrete text.
- Preserve heading hierarchy and `<!-- template-version: 2 -->` comment.
- Principles: succinct name, non-negotiable rules, explicit rationale.
- Technology Stack: at minimum Language/Runtime must be populated.
- Testing & Quality Policy: use QC-recognised keywords so automated enforcement activates correctly. Keywords: `lint`, `static analysis`, `code quality`, `coverage`, `security`, `vulnerability`, `OWASP`, `WCAG`, `accessibility`, `benchmark`, `performance`.
- Governance: amendment procedure, versioning policy, compliance expectations.

### 4. Consistency Propagation
After updating, check alignment in:
- Plan template: Instructions Check section references updated principles.
- Spec template: scope/requirements align with new constraints.
- Tasks template: task categories reflect principle-driven types.
- Agent instructions: no outdated references.
- `.github/sddp-config.md` → `## Derived QC Policy`: update Coverage Target and Required Categories to match current Testing & Quality Policy.

### 5. Sync Impact Report
Present to user:
- Version change: old → new
- Modified principles
- Added/removed sections
- Template version migration (if applicable)
- QC Enforcement Preview (which categories will be enforced)
- Templates requiring updates (✅ updated / ⚠ pending)
- Follow-up TODOs

### 6. Validation
- `<!-- template-version: 2 -->` present on first line.
- No unexplained bracket tokens remaining.
- Version line matches report.
- Dates in ISO format (YYYY-MM-DD).
- Principles are declarative, testable, free of vague language.
- All mandatory sections present (Technology Stack, Testing & Quality Policy, Source Code Layout, Development Workflow, Governance).

## Principles of Good Project Instructions Writing
- Use MUST/SHOULD with rationale.
- Each principle testable (can you tell if code violates it?).
- Declarative, not procedural.
- Limit to 3–7 core principles (focused > comprehensive).
- Include QC-relevant keywords in Testing & Quality Policy so automated enforcement activates.
