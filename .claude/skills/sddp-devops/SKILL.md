---
name: sddp-devops
description: "Create or refine the deployment and operations document."
argument-hint: "[project description, infrastructure context, deployment constraints, or operations inputs]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Task, AskUserQuestion, WebFetch
---
Command category: `project-bootstrap`
Prerequisites: none

Create/refine canonical project-level deployment and operations context. Ignore feature-level implementation detail; focus on deployment, infrastructure, observability, reliability, and operations.

Follow `.github/sddp/workflows/deployment-operations/WORKFLOW.md`.

Delegate external research only when the workflow says **Delegate**:
- **Delegate: Technical Researcher** → `sddp-technical-researcher` via Task

Report compact progress at major milestones — done, issues, next.
