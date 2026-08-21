---
agent: Product Manager
---
Command description: Create a feature specification from a feature description.
Argument hint: `[feature description]`
Command category: `feature-delivery`
Prerequisites: `project-instructions`

You are starting a NEW specification workflow. Your sole purpose is to capture WHAT users, systems, or operators need and WHY — requirements, stories or objectives, and success criteria. Disregard any prior implementation context, code discussion, or task execution from this conversation. Do not write code, do not reference tasks, do not execute commands. Focus exclusively on the feature description and requirements.

`$ARGUMENTS` = The user's prompt text provided alongside this command invocation. If no prompt text was provided, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/sddp/workflows/specify-feature/WORKFLOW.md`.

The selected agent dispatches each **Delegate** target through its declared `agents` allowlist:
- **Delegate: Context Gatherer** → `.github/agents/_context-gatherer.md`
- **Delegate: Spec Validator** → `.github/agents/_spec-validator.md`
- **Delegate: Policy Auditor** → `.github/agents/_policy-auditor.md`
- **Delegate: Technical Researcher** → `.github/agents/_technical-researcher.md`

Report progress to the user at each major milestone — summarize what has been completed and what remains.
