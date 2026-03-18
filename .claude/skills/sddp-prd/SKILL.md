---
name: sddp-prd
description: Create or refine the canonical project-level Product Requirements Document (`specs/prd.md`)
argument-hint: "[rough product idea, users, domain, or market opportunity]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Task, AskUserQuestion, WebFetch
---

Create or refine the canonical project Product Requirements Document only. Ignore feature-level implementation context.

Load and follow the workflow in `.github/skills/product-document/SKILL.md`.

Delegate external research only when the workflow says **Delegate**:
- **Delegate: Technical Researcher** → `sddp-technical-researcher` via Task

Report milestone progress.
