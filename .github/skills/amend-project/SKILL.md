---
name: amend-project
description: "Propagate a user-described bootstrap change across canonical project artifacts and the project plan by analyzing impact and executing the owning bootstrap workflows inline."
---

# Project Amender Workflow

<rules>
- Project-bootstrap scope only. Do not run feature-delivery phases.
- Never update `specs/prd.md`, `specs/sad.md`, `specs/dod.md`, `specs/project-plan.md`, or `project-instructions.md` directly when an owning bootstrap workflow exists for that artifact. Execute the owning workflow inline instead.
- Read local context first: `README.md`, `project-instructions.md`, `.github/sddp-config.md` when present, and all resolved canonical bootstrap artifacts.
- Resolve canonical document paths using the same config-first, fallback-second pattern used by `project-planning/SKILL.md`.
- `project-instructions.md` is always rooted at the workspace root and is never registered through `.github/sddp-config.md`.
- Product Document, Technical Context Document, and Project Plan are mandatory. Halt if any are unresolvable.
- Deployment & Operations Document is optional. When absent, skip DOD impact analysis and execution.
- `specs/project-plan.md` is always considered for update because any accepted bootstrap change must be reflected in future epic planning.
- Completed epics (`[X]`) in `specs/project-plan.md` are immutable. Only unchecked epics may be adjusted.
- Each inline workflow invocation must receive the full change description plus artifact-specific amendment guidance derived from the impact analysis. Never pass vague instructions like "update as needed".
- Interactive mode: ask the user to confirm or override the impact assessment before executing inline workflows.
- `AUTOPILOT = true`: accept the workflow's recommended/default decisions, do not ask the user, and log automatic decisions when an autopilot log is available in the active context.
- If one inline workflow halts or fails, record the failure, continue with the remaining independent workflows, and report all failures in the summary.
- Idempotency matters: artifacts assessed as `NONE` must not be touched.
</rules>

<workflow>

## 1. Gate Check — Resolve Canonical Documents

Read `.github/sddp-config.md` when it exists.

Resolve each canonical document in this order:

### 1.1 Project Instructions
- Use `project-instructions.md` at the workspace root.
- Missing → **HALT**: "Run `/sddp-init` first to create `project-instructions.md`."

### 1.2 Product Document
- Config: `## Product Document` → `**Path**:` → set `PRODUCT_DOC`
- Fallback: `specs/prd.md`
- Unresolved → **HALT**: "Run `/sddp-prd` first or register the Product Document in `.github/sddp-config.md`."

### 1.3 Technical Context Document
- Config: `## Technical Context Document` → `**Path**:` → set `TECH_CONTEXT_DOC`
- Fallback: `specs/sad.md`
- Unresolved → **HALT**: "Run `/sddp-systemdesign` first or register the Technical Context Document in `.github/sddp-config.md`."

### 1.4 Deployment & Operations Document
- Config: `## Deployment & Operations Document` → `**Path**:` → set `DEPLOY_OPS_DOC`
- Fallback: `specs/dod.md`
- Unresolved → set `HAS_DOD = false` and continue.
- Resolved → set `HAS_DOD = true`.

### 1.5 Project Plan
- Config: `## Project Plan` → `**Path**:` → set `PROJECT_PLAN_DOC`
- Fallback: `specs/project-plan.md`
- Unresolved → **HALT**: "Run `/sddp-projectplan` first or register the Project Plan in `.github/sddp-config.md`."

Read all resolved documents before continuing.

## 2. Analyze Change Impact

Treat `$ARGUMENTS` as the change description. If `$ARGUMENTS` is empty, ask the user for the bootstrap change to propagate and halt until a change description is provided.

Summarize the requested change into `CHANGE_SUMMARY` and assess each artifact:

### 2.1 `project-instructions.md`
Set `INSTRUCTIONS_IMPACT = UPDATE` when the change:
- introduces or changes language/runtime, frameworks, storage, or infrastructure choices
- changes testing or quality policy
- changes source layout rules
- conflicts with an existing core principle

Otherwise set `INSTRUCTIONS_IMPACT = NONE`.

### 2.2 Product Document (`PRODUCT_DOC`)
Set `PRD_IMPACT = UPDATE` when the change:
- introduces a new capability or materially changes an existing capability
- adds or removes a target user, buyer, persona, or operating actor
- changes scope boundaries, success measures, or strategic priorities

Otherwise set `PRD_IMPACT = NONE`.

### 2.3 Technical Context Document (`TECH_CONTEXT_DOC`)
Set `SAD_IMPACT = UPDATE` when the change:
- requires a new ADR or revises an existing ADR
- changes architecture boundaries, integrations, trust boundaries, or deployment model assumptions
- changes the data model, interface contracts, or key quality attributes such as performance, scalability, security, or reliability

Otherwise set `SAD_IMPACT = NONE`.

### 2.4 Deployment & Operations Document (`DEPLOY_OPS_DOC`)
If `HAS_DOD = false`, set `DOD_IMPACT = SKIPPED`.

If `HAS_DOD = true`, set `DOD_IMPACT = UPDATE` when the change:
- requires new infrastructure or hosting changes
- changes CI/CD expectations or environment strategy
- adds monitoring, alerting, resilience, or operational readiness requirements
- changes deployment topology, release strategy, incident expectations, or cost controls

Otherwise set `DOD_IMPACT = NONE`.

### 2.5 Project Plan (`PROJECT_PLAN_DOC`)
Set `PROJECT_PLAN_IMPACT = UPDATE`.

Capture a one-line reason for each assessment.

## 3. Present Impact Assessment

Present a concise assessment in this shape:

```text
Change: "<CHANGE_SUMMARY>"

Impact assessment:
- project-instructions.md: UPDATE | NONE — <reason>
- prd.md: UPDATE | NONE — <reason>
- sad.md: UPDATE | NONE — <reason>
- dod.md: UPDATE | NONE | SKIPPED — <reason>
- project-plan.md: UPDATE — <reason>
```

Interactive mode:
- Ask the user to confirm the assessment or override specific artifacts before proceeding.
- Apply explicit user overrides before execution.

`AUTOPILOT = true`:
- Do not ask for confirmation.
- Keep the assessment as the execution plan.
- If an active autopilot log is available, append the accepted assessment and any automatic decisions.

## 4. Build Inline Workflow Inputs

For each artifact with `IMPACT = UPDATE`, build a concrete instruction payload that includes:
- the full `CHANGE_SUMMARY`
- why that artifact must change
- the specific sections, capabilities, ADRs, DDRs, policies, or epics that likely need revision
- any user overrides accepted in Step 3

Minimum payload shapes:

### 4.1 Project Instructions Payload
"Amend project instructions to accommodate: `<CHANGE_SUMMARY>`. Specifically revise core principles, technology stack, testing policy, source layout, and workflow constraints only where this change requires it. Preserve all registered canonical document paths."

### 4.2 Product Document Payload
"Refine the Product Document to incorporate: `<CHANGE_SUMMARY>`. Specifically adjust affected capabilities, scope boundaries, personas, priorities, and success measures. Preserve valid existing narrative and capability IDs."

### 4.3 Technical Context Payload
"Refine the Technical Context Document to accommodate: `<CHANGE_SUMMARY>`. Specifically add or revise the ADRs, architectural boundaries, integrations, data model assumptions, and quality attributes impacted by this change. Preserve valid existing architecture context."

### 4.4 Deployment & Operations Payload
"Refine the Deployment & Operations Document to accommodate: `<CHANGE_SUMMARY>`. Specifically update environment strategy, CI/CD expectations, infrastructure, observability, reliability, and operational readiness where the change affects them. Preserve valid existing operations context."

### 4.5 Project Plan Payload
"Refine the Project Plan to incorporate: `<CHANGE_SUMMARY>`. Add new epics or update existing unchecked epics as needed. Preserve checked epics. Trace all resulting epic changes back to the updated Product, Technical Context, and Deployment & Operations artifacts."

## 5. Execute Inline Bootstrap Workflows

Execute only the workflows whose artifacts are marked `UPDATE`, in this strict order:

1. `project-instructions.md` → load and execute `.github/skills/init-project/SKILL.md`
2. `PRODUCT_DOC` → load and execute `.github/skills/product-document/SKILL.md`
3. `TECH_CONTEXT_DOC` → load and execute `.github/skills/system-design/SKILL.md`
4. `DEPLOY_OPS_DOC` → load and execute `.github/skills/deployment-operations/SKILL.md` when `HAS_DOD = true` and `DOD_IMPACT = UPDATE`
5. `PROJECT_PLAN_DOC` → load and execute `.github/skills/project-planning/SKILL.md`

Execution rules:
- Pass the artifact-specific payload built in Step 4 as the inline workflow input.
- In interactive mode, preserve the shared workflow's own question/answer behavior.
- In `AUTOPILOT = true`, accept recommended/default answers inside nested workflows and log decisions when possible.
- After each workflow finishes, record one of: `UPDATED`, `SKIPPED`, `FAILED`.
- `FAILED` means the workflow halted or could not complete. Continue to the next independent workflow.

## 6. Summary Report

Return a concise summary with:
- each artifact and whether it was `UPDATED`, `SKIPPED`, or `FAILED`
- one line describing what changed for each updated artifact
- new or modified epic IDs reported by the planning workflow when available
- all failures, if any
- the recommended next step, usually running `/sddp-autopilot` or `/sddp-specify` for the first new or updated epic

</workflow>