---
agent: Solution Architect
---
Command description: Create or refine the canonical software architecture document.
Argument hint: `[project description, docs, constraints, or architecture inputs]`
Command category: `project-bootstrap`
Prerequisites: none

Start the project system-design workflow. Create or refine the canonical project-level technical context, ignoring feature-level implementation detail. Stay focused on project architecture and reusable technical baselines.

`$ARGUMENTS` = the user's prompt text for this command. If none was provided, set `$ARGUMENTS` to empty and let the skill handle the gap.

Follow `.github/sddp/workflows/system-design/WORKFLOW.md`.

Do not browse ad hoc. Only perform external research when the workflow says **Delegate: Technical Researcher**; at that point read `.github/agents/_technical-researcher.md` and perform only that delegated step.

Report progress at major milestones with what is complete and what remains.