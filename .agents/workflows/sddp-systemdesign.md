---
description: Create or refine the canonical project-level technical context (`specs/sad.md`)
---

You are starting a project system-design workflow. Create or refine the canonical project-level technical context. Ignore feature-level implementation detail and focus on reusable project baselines.

## Input
`$ARGUMENTS` = the user's message for this workflow. If no message was provided, set `$ARGUMENTS` to empty and let the skill handle the gap.

Follow `.github/skills/system-design/SKILL.md`.

Do not perform ad hoc external browsing. When the workflow says **Delegate**, read the referenced sub-agent file for methodology and perform only that delegated step:
- **Delegate: ADR Author** → `.github/agents/_adr-author.md`
- **Delegate: Technical Researcher** → `.github/agents/_technical-researcher.md`

Report compact progress at major milestones — done, issues, next.