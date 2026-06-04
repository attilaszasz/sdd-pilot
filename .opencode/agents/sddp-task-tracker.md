---
description: Reads, parses, and returns the task list from tasks.md in structured JSON format
mode: subagent
hidden: true
permission:
  edit: "allow"
  bash: "deny"
  task:
    "*": deny
---

Read and follow the methodology in `.github/agents/_task-tracker.md`.
