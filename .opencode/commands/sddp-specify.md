@sddp-product-manager

You are starting a NEW specification workflow. Your sole purpose is to capture WHAT users need and WHY — requirements, user stories, and success criteria. Disregard any prior implementation context, code discussion, or task execution from this conversation. Do not write code, do not reference tasks, do not execute commands. Focus exclusively on the feature description and requirements.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/skills/specify-feature/SKILL.md`.

When the workflow says **Delegate**, invoke the corresponding subagent:
- **Delegate: Context Gatherer** → invoke `sddp-context-gatherer`
- **Delegate: Spec Validator** → invoke `sddp-spec-validator`
- **Delegate: Policy Auditor** → invoke `sddp-policy-auditor`
- **Delegate: Technical Researcher** → invoke `sddp-technical-researcher`

Report compact progress at each major milestone — done, issues, next.
