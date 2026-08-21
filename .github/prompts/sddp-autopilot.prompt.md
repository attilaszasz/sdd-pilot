---
agent: Software Engineer
---
Command description: Run the full SDD feature-delivery pipeline.
Argument hint: `[optional: feature description; omit to select the first unchecked epic]`
Command category: `orchestration`
Prerequisites: `autopilot:enabled`, `product-document:planning-ready`, `technical-context:planning-ready`

Load and follow the workflow in `.github/sddp/workflows/autopilot-pipeline/WORKFLOW.md`.

Set `AUTOPILOT = true`. Never prompt the user. The selected agent dispatches every delegated role through its declared `agents` allowlist.
