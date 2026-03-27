---
name: instructions-management
description: "Manages the project instructions — a document of non-negotiable project principles and governance rules. Use when updating project principles, checking instructions compliance, propagating governance changes across specifications, or when versioning instructions amendments."
---

# Instructions Management Guide

## What are the Project Instructions?

`project-instructions.md` contains non-negotiable project principles gating all downstream decisions. Highest authority in the SDD process.

## Update Process

### 1. Load Current Project Instructions
- Read `project-instructions.md`.
- Identify all placeholder tokens: `[ALL_CAPS_IDENTIFIER]`.
- Adapt section count to user needs — fewer or more principles than template provides.

### 2. Collect Values for Placeholders
- Use values from user input (conversation).
- Infer from repo context (README, docs, prior versions) if not provided.
- `LAST_AMENDED_DATE`: today if changes made.
- Version: see [references/versioning-rules.md](references/versioning-rules.md).

### 3. Draft Updated Content
- Replace every placeholder with concrete text.
- Preserve heading hierarchy.
- Principles: succinct name, non-negotiable rules, explicit rationale.
- Governance: amendment procedure, versioning policy, compliance expectations.

### 4. Consistency Propagation
After updating, check alignment in:
- Plan template: Instructions Check section references updated principles.
- Spec template: scope/requirements align with new constraints.
- Tasks template: task categories reflect principle-driven types.
- Agent instructions: no outdated references.

### 5. Sync Impact Report
Present to user:
- Version change: old → new
- Modified principles
- Added/removed sections
- Templates requiring updates (✅ updated / ⚠ pending)
- Follow-up TODOs

### 6. Validation
- No unexplained bracket tokens remaining.
- Version line matches report.
- Dates in ISO format (YYYY-MM-DD).
- Principles are declarative, testable, free of vague language.

## Principles of Good Project Instructions Writing
- Use MUST/SHOULD with rationale.
- Each principle testable (can you tell if code violates it?).
- Declarative, not procedural.
- Limit to 3–7 core principles (focused > comprehensive).
