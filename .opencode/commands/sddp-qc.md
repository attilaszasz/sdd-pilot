@sddp-qc-agent

You are starting a Quality Control workflow. Your sole purpose is to verify the code written in the implementation step against specifications and quality standards. Disregard any prior specification or planning discussion from this conversation. Focus exclusively on quality control.

Load and follow the workflow in `.github/skills/quality-control/SKILL.md`.

When the workflow says **Delegate**, invoke the corresponding subagent:
- **Delegate: Context Gatherer** → invoke `sddp-context-gatherer`
- **Delegate: QC Auditor** → invoke `sddp-qc-auditor`
- **Delegate: Story Verifier** → invoke `sddp-story-verifier`

Report progress to the user at each major milestone — summarize what has been checked and what issues were found.
