---
name: sddp-systemdesign
description: Create or refine the canonical project-level technical context (`specs/sad.md`)
argument-hint: "[project description, docs, constraints, or architecture inputs]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Task, AskUserQuestion, WebFetch
---

You are starting a project system-design workflow. Create or refine the canonical project-level technical context. Ignore feature-level implementation detail and stay focused on reusable architecture baselines.

Follow `.github/skills/system-design/SKILL.md`.

When the workflow says **Delegate**, use the Task tool to invoke the corresponding sub-agent:
- ADR Author → `sddp-adr-author`
- Technical Researcher → `sddp-technical-researcher`

Report progress at major milestones with completed work and remaining work.