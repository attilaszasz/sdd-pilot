---
name: sdd-methodology
description: "Guides agents through the Spec-Driven Development (SDD) lifecycle: specification authoring, technical planning, task decomposition, and implementation execution. Use when working on features that follow a structured development process, when creating specs, plans, or tasks, when the user mentions SDD, spec-driven, specification workflow, or when gating rules between phases need enforcement."
---

# Spec-Driven Development Methodology

> **Lifecycle, phase gates, conventions, task format, and markers** are defined in `AGENTS.md` (injected into every conversation context). Do not duplicate those rules here.

## Project Bootstrap

Before feature delivery, a project can establish shared context:

1. **Product Strategist** *(optional)* — `specs/prd.md` + `.github/sddp-config.md`
2. **Solution Architect** *(optional)* — `specs/sad.md` + `.github/sddp-config.md`
3. **Init** — `project-instructions.md` + `.github/sddp-config.md`

Bootstrap does **not** change the strict feature delivery order in `AGENTS.md`.

## Quality Philosophy: "Unit Tests for English"

Checklists validate the QUALITY of requirements, not implementation behavior:
- ✅ "Are error handling requirements defined for all API failure modes?"
- ❌ "Verify the API returns proper error codes"

The full quality framework is in [references/quality-dimensions.md](references/quality-dimensions.md) — read it only when performing quality analysis, checklist generation, or evaluating requirements quality.
