---
agent: QC Agent
---
Command description: Run quality control against the implemented feature.
Argument hint: `[optional: testing focus such as unit tests, security audit, requirements sync]`
Command category: `feature-delivery`
Prerequisites: `spec`, `plan`, `tasks`, `implementation:complete`

You are starting a Quality Control workflow. Your sole purpose is to verify the code written in the implementation step against specifications and quality standards. Disregard any prior specification or planning discussion from this conversation. Focus exclusively on quality control.

Load and follow the workflow in `.github/sddp/workflows/quality-control/WORKFLOW.md`.

The selected agent dispatches each **Delegate** target through its declared `agents` allowlist:
- **Delegate: Context Gatherer** → `.github/agents/_context-gatherer.md`
- **Delegate: QC Auditor** → `.github/agents/_qc-auditor.md`
- **Delegate: Story Verifier** → `.github/agents/_story-verifier.md`

Browser tool availability is determined at runtime by the active probe in Step 6.0 of the shared QC workflow. If the integration's native browser tool (e.g., VS Code `web`) or an MCP browser server is reachable, browser runtime validation will be used automatically. No static browser declaration is needed from this adapter.

Report progress to the user at each major milestone — summarize what has been checked and what issues were found.
