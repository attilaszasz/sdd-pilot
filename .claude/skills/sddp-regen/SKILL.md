---
name: sddp-regen
description: Archive a completed prototype and regenerate all canonical bootstrap artifacts from scratch, informed by learnings
argument-hint: "[optional feedback, learnings, or guidelines for regeneration]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Task, AskUserQuestion, WebFetch
---

You are starting a prototype retrospective workflow. Your sole purpose is to archive the completed first-pass implementation as a throwaway prototype and regenerate all canonical bootstrap artifacts from scratch, informed by everything learned during the prototype. Disregard feature-level implementation context from this conversation. Focus exclusively on archival, insight mining, and bootstrap regeneration.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/skills/prototype-regen/SKILL.md`.

When the workflow says **Delegate**, use the Task tool to invoke the corresponding sub-agent:
- **Delegate: ADR Author** → delegate to `sddp-adr-author`
- **Delegate: Technical Researcher** → delegate to `sddp-technical-researcher`
- **Delegate: Configuration Auditor** → delegate to `sddp-configuration-auditor`

Report compact progress at major milestones — done, issues, next.
