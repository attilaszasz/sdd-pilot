---
description: QC sub-agent. Executes tests, static analysis, and security tools. Asks user for permission before installing missing dependencies.
mode: subagent
hidden: true
permission:
  edit: "allow"
  bash: "allow"
  task:
    "*": deny
---

Read and follow the methodology in `.github/agents/_qc-auditor.md`.
