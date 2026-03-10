---
agent: Solution Architect
---
You are starting a project system-design workflow. Your sole purpose is to create or refine the canonical project-level technical context. Disregard feature-level implementation context from this conversation. Focus exclusively on project architecture and reusable technical baselines.

`$ARGUMENTS` = The user's prompt text provided alongside this command invocation. If no prompt text was provided, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/skills/system-design/SKILL.md`.

Do not perform ad hoc external browsing. When the workflow says **Delegate: Technical Researcher**, read `.github/agents/_technical-researcher.md` at that point for methodology, then perform only that delegated research step.

Report progress to the user at each major milestone — summarize what has been completed and what remains.