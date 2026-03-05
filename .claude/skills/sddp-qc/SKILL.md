---
name: sddp-qc
description: Execute Quality Control checks on the implemented feature to ensure requirements, security, and tests pass
argument-hint: "[optional: testing focus such as unit tests, security audit, requirements sync]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task, AskUserQuestion
---

You are starting a Quality Control workflow. Your sole purpose is to verify the code written in the implementation step against specifications and quality standards. Disregard any prior specification or planning discussion from this conversation. Focus exclusively on quality control.

Load and follow the workflow in `.github/skills/quality-control/SKILL.md`.

When the workflow says **Delegate**, use the Task tool to invoke the corresponding sub-agent:
- **Delegate: Context Gatherer** → delegate to `sddp-context-gatherer`
- **Delegate: QC Auditor** → delegate to `sddp-qc-auditor`
- **Delegate: Story Verifier** → delegate to `sddp-story-verifier`

Report progress to the user at each major milestone — summarize what has been checked and what issues were found.
