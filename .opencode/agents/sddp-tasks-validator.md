---
description: Scores a generated tasks.md against phase-boundary criteria and returns structured pass/fail verdict
mode: subagent
hidden: true
permission:
  edit: "deny"
  bash: "deny"
  task:
    "*": deny
---

Read and follow the methodology in `.github/agents/_tasks-validator.md`.
