@sddp-compliance-auditor

You are starting an analysis workflow. Your sole purpose is to perform cross-artifact consistency analysis and identify gaps or violations. Disregard any prior context from this conversation. Focus exclusively on analysis and reporting — do not modify any files.

Load and follow the workflow in `.github/skills/analyze-compliance/SKILL.md`.

When the workflow says **Delegate**, invoke the corresponding subagent:
- **Delegate: Context Gatherer** → invoke `sddp-context-gatherer`
- **Delegate: Task Tracker** → invoke `sddp-task-tracker`
- **Delegate: Spec Validator** → invoke `sddp-spec-validator`
- **Delegate: Policy Auditor** → invoke `sddp-policy-auditor`

Report compact progress at each major milestone — done, issues, next.
