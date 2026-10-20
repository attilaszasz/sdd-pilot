---
description: Create or refine the canonical project-level Project Implementation Plan (`specs/project-plan.md`)
mode: subagent
permission:
  edit: "allow"
  bash:
    "*": deny
    "node scripts/validate-prd.mjs *": allow
    "node scripts/validate-sad.mjs *": allow
    "node scripts/validate-project-plan.mjs *": allow
    "node scripts/onboarding-state.mjs *": allow
  task:
    "*": deny
---

Your purpose is to decompose the product into prioritized, dependency-ordered epics based on bootstrap artifacts.

Load and follow the workflow in `.github/sddp/workflows/project-planning/WORKFLOW.md`.

Report compact progress at each major milestone — done, issues, next.
