---
name: sddp-systemdesign
description: "[Command entry-point - invokes shared `system-design` skill] Direct command-bar dispatch only; do not select for general queries."
---

You are starting a project system-design workflow. Create or refine the canonical project-level technical context. Ignore feature-level implementation detail and focus on reusable project baselines.

## Input
`$ARGUMENTS` = the user's message for this workflow. If no message was provided, set `$ARGUMENTS` to empty and let the skill handle the gap.

Follow `.github/skills/system-design/SKILL.md`.

When the shared workflow asks the user to choose or answer:
- Ask the user explicitly in chat and wait for the reply before continuing.
- Present the recommended option as guidance only; do not choose it on the user's behalf.
- Allow free-form answers anywhere the shared workflow allows them.
- Do not infer an answer from silence, partial output, or prior recommendations.

Do not perform ad hoc external browsing. When the workflow says **Delegate**, read the referenced sub-agent file at that point, then perform only that delegated step:
- **Delegate: ADR Author** → `.github/agents/_adr-author.md`
- **Delegate: Technical Researcher** → `.github/agents/_technical-researcher.md`

Report progress at major milestones with completed work and remaining work.
