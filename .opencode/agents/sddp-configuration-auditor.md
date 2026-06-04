---
description: Validates updated project instructions against templates and propagates changes
mode: subagent
hidden: true
permission:
  edit: "allow"
  bash: "deny"
  task:
    "*": deny
---

Read and follow the methodology in `.github/agents/_configuration-auditor.md`.
