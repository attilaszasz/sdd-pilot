---
name: sddp-devops
description: Create or refine the canonical project-level deployment and operations context (`specs/dod.md`)
argument-hint: "[project description, infrastructure context, deployment constraints, or operations inputs]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Task, AskUserQuestion, WebFetch
---

Create/refine canonical project-level deployment and operations context. Ignore feature-level implementation detail; focus on deployment, infrastructure, observability, reliability, and operations.

Follow `.github/skills/deployment-operations/SKILL.md`.

Delegate external research only when the workflow says **Delegate**:
- **Delegate: Technical Researcher** → `sddp-technical-researcher` via Task

Report compact progress at major milestones — done, issues, next.
