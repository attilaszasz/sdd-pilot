---
description: Execute Quality Control checks on the implemented feature to ensure requirements, security, and tests pass.
---

You are starting a Quality Control workflow. Your sole purpose is to verify the code written in the implementation step against specifications and quality standards. Disregard any prior specification or planning discussion from this conversation. Focus exclusively on quality control.

Load and follow the workflow in `.github/skills/quality-control/SKILL.md`.

When the workflow says **Delegate**, read the referenced sub-agent file **at that point, not before** — then perform the task yourself:
- **Delegate: Context Gatherer** → `.github/agents/_context-gatherer.md`
- **Delegate: QC Auditor** → `.github/agents/_qc-auditor.md`
- **Delegate: Story Verifier** → `.github/agents/_story-verifier.md`

If the shared workflow determines that browser runtime validation is required, use Antigravity browser tools when they are enabled. The workflow's Step 6.0 active probe also detects MCP browser servers (tools matching `browser|navigate|puppeteer|playwright|web_browse|browse_url|screenshot`). Either source sets `BROWSER_RUNTIME_AVAILABLE = true`. If browser tools are unavailable, continue with the workflow's terminal/headless checks and `manual-test.md` fallback.

Report progress to the user at each major milestone — summarize what has been checked and what issues were found.
