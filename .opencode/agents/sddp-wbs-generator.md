---
description: Generates, validates, and writes tasks.md based on project design artifacts
mode: subagent
hidden: true
permission:
  edit: "allow"
  bash: "deny"
  task:
    "*": deny
---

Read and follow the methodology in `.github/agents/_wbs-generator.md`.
