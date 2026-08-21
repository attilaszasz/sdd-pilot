---
name: product-document
description: "Creates or safely refines the canonical project PRD through quick two-batch clarification or resumable product discovery."
---

# Product Strategist - Product Document Workflow

<rules>
- Project scope only. Produce exactly one canonical PRD; never also write a shadow `specs/prd.md`.
- Read local context first. Keep the PRD product-facing, problem-first, and mostly technology-agnostic.
- Exclude feature acceptance criteria, Given/When/Then, architecture, implementation plans, backlog tasks, and SDD internals.
- Delegate all external research to **Technical Researcher**. Research never decides scope.
- Never infer stakeholder consensus, approval, or an unanswered decision.
- Preserve valid authored narrative and stable IDs during refinement.
- Run `node scripts/validate-prd.mjs` against the candidate and live PRD. Hand-written validation is not a substitute.
</rules>

<workflow>

## 1. Parse Controls

Parse control tokens in `$ARGUMENTS`; remaining text is the product brief.

Supported controls:
- `--quick`: quick two-batch workflow.
- `--discover`: start or reopen adaptive discovery.
- `--resume`: resume paused/interrupted discovery.
- `--skip-research`: do not perform external research; valid with quick, discover, or resume.

Rules:
- No path control means `PATH = QUICK`. Do not score complexity or ask the user to choose a path.
- At most one of `--quick`, `--discover`, and `--resume` may appear. Duplicated, conflicting, malformed, or unknown `--...` controls → **HALT** and list accepted controls.
- `--skip-research` changes research behavior only. With `--resume`, it may skip pending research but never removes existing findings.

## 2. Resolve Context and Canonical PRD

Read safe fixed root inputs first: `README.md`, `project-instructions.md`, and `.github/sddp-config.md`. Parse every registered or user-supplied path without reading its target, apply the path-safety rule below, and only then read safe paths for the registered Product Document, `specs/prd.md`, `specs/prd-discovery.md`, `specs/prd-research.md`, `specs/sad.md`, `specs/project-plan.md`, `specs/plan/*.md`, explicit user inputs, and relevant product/strategy/research documents under the root or `docs/`.

Resolve `CANONICAL_PRD` before questions or drafting:
0. Every candidate path must be normalized, repository-relative, free of `..` traversal, and symlink-free before any read or write. Absolute, drive-qualified, mixed-separator, external, or symlinked paths → **HALT** without touching either target.
1. A non-empty registered `## Product Document` → `**Path**:` that is readable wins when there is no conflict: it is the presumptive canonical path and sole write target.
2. If registration is empty/absent, adopt readable `specs/prd.md`; otherwise adopt `specs/prd.md` as the new default.
3. A non-empty unreadable registration → **HALT** and ask the user to repair the path or explicitly replace the registration. Do not silently fall back.
4. If a readable registration and another substantive document present conflicting canonical claims/content, or the user requests a different target, show the paths and ask which is canonical. Do not merge or write until answered.
5. A selected custom path remains custom: write that path and register it. Do not create or refine `specs/prd.md` too.

Set `MODE = REFINE` when `CANONICAL_PRD` has substantive content; otherwise `CREATE`. Summarize all inputs as `PROJECT_CONTEXT`.

If `specs/prd-discovery.md` exists, validate its frontmatter and target before choosing a workflow path. Malformed state blocks all writes. When its target matches `CANONICAL_PRD` and status is `active` or `ready-to-synthesize`, QUICK must **HALT** and instruct `/sddp-prd --resume`; it may not rewrite the PRD beneath durable discovery. Continuing QUICK requires first completing discovery or explicitly abandoning it through a resumed discovery decision.

## 3. Establish Safe Refinement State

In `REFINE`:
- Read the registered/default project plan and epic detail files before proposing PRD changes.
- Preserve every existing `CAP-###` for the same capability. Never renumber or reuse an ID; additions use one greater than the highest ID ever present.
- Preserve `## Project Context Baseline Updates` and valid authored narrative. Replace contradictions rather than duplicating text.
- Preview material changes with affected sections, `CAP-###` IDs, and project-plan references before writing; require user confirmation.
- A removal of a referenced capability, or a semantic change to a capability used by an `[X]` completed epic, is cross-artifact work. **HALT** with the proposed delta and route it to `/sddp-amend`; do not change the PRD here.

Migrate legacy PRDs in the candidate, not as a separate write: add missing template frontmatter, preserve recognized and custom metadata, preserve the original `created` value when known, set `updated`, and set `prd_maturity` to exactly `draft` or `planning-ready`.

## 4. Quick Path

`PATH = QUICK` creates no `specs/prd-discovery.md` or `specs/prd-research.md`.

### 4.1 Blocking Batch

Identify only unresolved high-impact decisions: product name in CREATE, vision/why now, primary user/buyer, problem/JTBD, evidence quality, release boundary, success measures, and canonical conflict. Ask one batch of 1-6 questions when needed. Each question includes the decision, recommended answer, brief local-context rationale, main tradeoff, and free-form option.

### 4.2 Useful Research

Unless `--skip-research`, delegate only when current evidence cannot support a material recommendation. Keep the returned report transient; do not create a research artifact.

**Delegate: Technical Researcher** (`.github/agents/_technical-researcher.md`):
- **Topics**: unresolved product/domain/user evidence gaps, maximum four
- **Context**: `PROJECT_CONTEXT`, blocking answers, known evidence, hypotheses
- **Purpose**: "Support project-level PRD decisions without choosing scope or inventing stakeholder agreement."
- **File Paths**: relevant paths read in Step 2

### 4.3 Follow-Up Batch

Ask one follow-up batch of 1-7 unresolved decisions when needed. Use the same question format. For each research-suggested addition recommend exactly one disposition: include in scope, record out of scope, record as open question, or reject. Never silently expand scope.

After these two batch opportunities, unresolved blockers keep `prd_maturity: draft`. If the product requires durable evidence reconciliation or stakeholder decisions that QUICK cannot safely settle, do not switch paths or ask a path-choice question; halt with a direct instruction to rerun `/sddp-prd --discover ...`.

Proceed to Step 6.

## 5. Discover or Resume Path

Use `specs/prd-discovery.md` as the durable discovery ledger and `.github/sddp/workflows/product-document/assets/prd-discovery-template.md` as its schema.

### 5.1 Artifact State and IDs

Discovery `status` values are exactly `active`, `ready-to-synthesize`, `completed`, or `abandoned`. Research `status` is exactly `completed`. PRD `prd_maturity` values are exactly `draft` or `planning-ready`. A paused checkpoint is represented by `status: active` plus `awaiting_user: true`; it remains visibly unfinished to downstream validators. `abandoned` requires an explicit user decision and preserves all history; it never implies that its unresolved decisions were accepted.

Stable discovery IDs:
- `EVD-###`: evidence, including source and confidence.
- `HYP-###`: unverified hypothesis.
- `PDD-###`: product discovery decision, with decision maker and evidence/rationale.
- `PDQ-###`: unresolved or resolved product discovery question.

Never renumber, delete, or reuse these IDs. Allocate each type monotonically from its highest persisted number. References do not define IDs. Convert a hypothesis into evidence or a decision by cross-reference, not by changing its ID. Provisional capability labels remain plain text and never receive `CAP-###`; assign `CAP-###` only during final PRD synthesis after scope is decided.

`--discover` behavior:
- Missing ledger → create it with `status: active`, `awaiting_user: false`, `current_stage: framing`, `next_stage: framing`, `target_prd: CANONICAL_PRD`, and the existing capability digest when refining.
- `active` or `ready-to-synthesize` ledger → **HALT** and instruct `--resume`; never restart over durable work.
- `completed` ledger → append a refinement session, preserve all IDs/history, set `status: active`, and start at `framing` for the new delta.
- `abandoned` ledger → append a new session only after the user explicitly chooses to restart; preserve all IDs/history and allocate new IDs monotonically.

`--resume` behavior:
- Missing/unreadable ledger → **HALT** and instruct `--discover` or repair.
- `active` with `awaiting_user: false` → continue the persisted `next_stage` after the last durable entry.
- `active` with `awaiting_user: true` → require the pending answer, record it, set `awaiting_user: false`, then continue `next_stage`.
- `ready-to-synthesize` → continue at `synthesis`; never reopen decided scope implicitly.
- `completed` → **HALT**; use `--discover` for another refinement session or `--quick` for bounded PRD refinement.
- `abandoned` → **HALT**; use `--discover` and explicitly confirm a new session before changing its status.

Before every user checkpoint, persist all new entries, set `status: active`, `awaiting_user: true`, and set `next_stage` to the stage that consumes the answer. Resume from disk, never from memory. Record each answer as a `PDD-###` and update linked `PDQ-###` status; silence, a recommendation, or one stakeholder's view is not consensus. If interrupted without a prompt, leave `status: active`, `awaiting_user: false`, and the current `next_stage`.

### 5.2 Ordered Stages

Run these stages in order; skip already completed work on resume:

1. **framing**: capture product intent, actors, problem, desired outcome, constraints, known facts, `HYP-###`, and blocking `PDQ-###`. Score product framing, evidence, stakeholders, consequence, scope coupling, and existing impact from 0-2; persist the total and hard triggers in `## Complexity Profile`. The score controls discovery depth only because the explicit flag already selected the path.
2. **evidence**: inventory local/user evidence as `EVD-###`; distinguish observed facts, reported views, and hypotheses; record source, date, relevance, and confidence.
3. **research+stakeholders**: map affected users, buyers, operators, approvers, and dissent. Record views as evidence, not consensus. Unless `--skip-research`, delegate external research only for consequential evidence gaps. If it runs, write `specs/prd-research.md` from the research template, map accepted findings to `EVD-###`, and keep its `status: completed`; otherwise do not create the file.
4. **scope-options**: develop 2-4 coherent scope options with plain-text provisional capabilities, exclusions, value, evidence, risks, and tradeoffs. No option receives `CAP-###`.
5. **decision-checkpoints**: present unresolved material `PDQ-###` items and scope options in one batch with recommendations and tradeoffs. Only explicit user answers create `PDD-###` decisions.
6. **readiness**: check that vision/problem, primary users, evidence, scope/exclusions, outcomes, constraints, material dissent, and blocking questions are sufficiently resolved. Failed readiness persists gaps as `PDQ-###`, sets `status: active`, `awaiting_user: true`, and waits. Passed readiness sets `status: ready-to-synthesize`, `awaiting_user: false`, `current_stage: readiness`, `next_stage: synthesis`, and permits `prd_maturity: planning-ready`.
7. **synthesis**: synthesize only decided scope into the canonical candidate. Allocate stable `CAP-###` IDs to final in-scope capability clusters; keep undecided items in Open Questions and excluded/deferred items out of the capability map.

Use `.github/sddp/workflows/product-document/assets/prd-research-template.md` only when external research actually runs. Research refreshes replace the report body while preserving referenced `EVD-###` mappings and source history needed for traceability.

## 6. Draft the Canonical Candidate

Use `.github/sddp/workflows/product-document/assets/prd-template.md`. Preserve all required headings or clear existing equivalents. The candidate must cover product purpose, users/stakeholders, domain evidence, needs/JTBD, principles, scope boundaries, capability map, outcomes/metrics, assumptions, constraints, dependencies, risks, open questions, validation approach, handoff guidance, and `## Project Context Baseline Updates`.

Capability map rules:
- One outcome-oriented row per decided in-scope capability cluster.
- Stable `CAP-###`, priority `P1`/`P2`/`P3`, no feature stories or implementation details.
- P1 capabilities alone describe a viable product outcome.

Set `prd_maturity: planning-ready` only when discovery/readiness or equivalent QUICK answers establish the required product context, no blocking product decision remains, and validation passes. Otherwise use `draft`.

## 7. Validate, Write, Register

1. Re-read live source artifacts and confirm the preview still matches them.
2. Write the complete candidate to a temporary sibling of `CANONICAL_PRD` without changing the live PRD.
3. Run `node scripts/validate-prd.mjs "<candidate-path>" --profile "PRD_MATURITY"`. Any non-zero exit or malformed/non-passing JSON → delete the candidate, report validator errors, and leave the live PRD/config/discovery completion state unchanged.
4. After PASS, atomically replace `CANONICAL_PRD` with the exact validated candidate bytes; remove the temporary file.
5. Run `node scripts/validate-prd.mjs "CANONICAL_PRD" --profile "PRD_MATURITY"`. Any non-zero exit or malformed/non-passing JSON → restore the prior live bytes (or remove the new file in CREATE), leave config unchanged, keep discovery non-completed, and **HALT**.
6. Only after live PASS, create/update `.github/sddp-config.md` `## Product Document` → `**Path**: CANONICAL_PRD`, preserving unrelated config. Registration failure → restore the prior live PRD bytes (or remove the CREATE output), preserve the prior config bytes, keep discovery non-completed, and **HALT**.
7. Only after registration succeeds, set discovery `status: completed`, `awaiting_user: false`, `current_stage: none`, `next_stage: none`, and `target_prd: CANONICAL_PRD`. If this final ledger write fails, leave the already consistent PRD/config pair intact and leave the prior active ledger as a downstream lock; **HALT** with `/sddp-prd --resume` recovery guidance and never report completion. Ordering is mandatory: candidate validation → canonical write → live validation → config registration → discovery completed.

## 8. Autopilot and Report

Inline `AUTOPILOT` behavior:
- `AUTOPILOT = true` with QUICK may select clearly marked recommendations for ordinary questions and report those decisions.
- QUICK encountering a discovery-required decision, unsafe refinement, unreadable registration, or unresolved canonical conflict → **HALT**; never auto-switch paths or infer consent.
- DISCOVER or RESUME may perform deterministic reading/staging, but must **HALT** at every user decision checkpoint with the ledger safely marked `status: active`, `awaiting_user: true`. Never infer stakeholder consensus.

Report only: path/mode, inputs read, questions/decisions count, whether research ran, material refinement delta, candidate/live validator results, canonical path and registration, artifact statuses, remaining `PDQ-###`/assumptions, and the appropriate next command (`--resume`, `/sddp-systemdesign`, or `/sddp-amend`).

</workflow>
