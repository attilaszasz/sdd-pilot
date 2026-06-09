---
description: Archive a completed prototype and regenerate all canonical bootstrap artifacts from scratch, informed by learnings
agent: build
subtask: false
---

You are starting a prototype retrospective workflow. Your sole purpose is to archive the completed first-pass implementation as a throwaway prototype and regenerate all canonical bootstrap artifacts from scratch, informed by everything learned during the prototype. Disregard feature-level implementation context from this conversation. Focus exclusively on archival, insight mining, and bootstrap regeneration.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/skills/prototype-regen/SKILL.md`.

Report compact progress at each major milestone — done, issues, next.
