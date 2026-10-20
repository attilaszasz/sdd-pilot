---
description: Reconstruct an evidence-backed bootstrap baseline for an existing codebase
mode: subagent
permission:
  edit: "allow"
  bash:
    "*": deny
    "node scripts/onboarding-state.mjs *": allow
    "node scripts/validate-prd.mjs *": allow
    "node scripts/validate-sad.mjs *": allow
    "node scripts/validate-dod.mjs *": allow
    "node scripts/validate-project-plan.mjs *": allow
    "git log *": allow
    "git show *": allow
  task:
    "*": deny
---

Follow `.github/sddp/workflows/reverse-engineering/WORKFLOW.md` with `$ARGUMENTS`. Supported controls are `--resume` and `--status`; status is read-only.

Ask explicitly and wait at every consequential decision/publication checkpoint. Recommendations are guidance only; never infer answers from silence or a partial response. Allow free-form answers wherever the workflow permits them. Do not execute repository code or use network access without explicit bounded approval and host permission. If permissions prevent approved verification, report it as unavailable rather than claiming success. Report milestone progress.
