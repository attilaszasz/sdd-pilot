---
name: instructions-management
description: "Manages the project instructions — a document of non-negotiable project principles and governance rules. Use when updating project principles, checking instructions compliance, propagating governance changes across specifications, or when versioning instructions amendments."
---

# Instructions Management Guide

## What are the Project Instructions?

The project instructions at `.github/copilot-instructions.md` contain non-negotiable project principles that gate all downstream decisions. It is the highest authority in the SDD process.

## Update Process

### 1. Load Current Project Instructions
- Read `.github/copilot-instructions.md`
- Identify all placeholder tokens: `[ALL_CAPS_IDENTIFIER]`
- The user may need fewer or more principles than the template provides — adapt accordingly

### 2. Collect Values for Placeholders
- Use values from user input (conversation)
- Infer from repo context (README, docs, prior versions) if not provided
- Governance dates:
  - `LAST_AMENDED_DATE`: Today if changes are made
- Version: See [references/versioning-rules.md](references/versioning-rules.md)

### 3. Draft Updated Content
- Replace every placeholder with concrete text
- Preserve heading hierarchy
- Each Principle section: succinct name, non-negotiable rules, explicit rationale
- Governance section: amendment procedure, versioning policy, compliance expectations

### 4. Consistency Propagation
After updating, check these files for alignment:
- Plan template: Instructions Check section must reference updated principles
- Spec template: scope/requirements alignment with new constraints
- Tasks template: task categories reflecting principle-driven types
- Agent instructions: no outdated references

### 5. Sync Impact Report
Present a report to the user in the response:
- Version change: old → new
- Modified principles
- Added/removed sections
- Templates requiring updates (✅ updated / ⚠ pending)
- Follow-up TODOs

### 6. Validation
- No unexplained bracket tokens remaining
- Version line matches report
- Dates in ISO format (YYYY-MM-DD)
- Principles are declarative, testable, and free of vague language

## Principles of Good Project Instructions Writing
- Use MUST/SHOULD with rationale
- Make each principle testable (can you tell if code violates it?)
- Keep principles declarative, not procedural
- Limit to 3-7 core principles (focused > comprehensive)
