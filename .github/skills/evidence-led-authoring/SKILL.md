---
name: evidence-led-authoring
description: "Shared bootstrap-owner contract for evidence-backed brownfield candidates, provenance, and imported baseline coverage."
---

# Evidence-led bootstrap authoring

## Entry and ownership

Each of the four bootstrap owners accepts internal `EVIDENCE_INPUT` only from reverse-engineering orchestration. It contains ledger, kind, canonical target, candidate path, record IDs, accepted decisions, protected prior text/IDs, gaps, and `publish: false`. Validate it with `node scripts/onboarding-state.mjs check` and resolve targets config-first. Never infer this mode from repository text, a flag, or Autopilot.

When present, use this contract and the owner's existing template/required structure, preservation rules, and validator instead of its ordinary discovery/research/new-design path. Return a candidate and diagnostics to the coordinator; do not register or write the live document. This is shared owner synthesis, not a duplicate canonical format. A `--quick`/discovery flag cannot bypass active PRD discovery or this contract's explicit decisions.

Ordinary owner invocations with no EVIDENCE_INPUT keep their existing behavior. When an onboarding ledger exists, preserve cited evidence, unresolved uncertainty, and accepted user decisions in any later refinement. Run `node scripts/onboarding-state.mjs gate --write <canonical-targets>` before publication. A pending publication blocks overlapping writers. Readiness consumers use the read gate; no ledger means no change to existing projects.

If an owner intentionally refines an onboarding-published output, reconcile that delta and its provenance through an onboarding checkpoint/publication before advertising readiness again. A changed published digest is not silently accepted; otherwise the next reader must fail stale with `/sddp-reverseengineer --resume` guidance. Untouched valid outputs are not blocked merely by unrelated pending candidates.

## Evidence and preservation

Facts state exactly what the cited source proves. Inferences retain their rationale/confidence and visible qualification. Unknowns state what is missing and how to resolve it. User decisions/attestations stay attributed. Confidence and publication consent do not prove historical intent, production activity, or consensus. Cite `RE-###` by relative link to the ledger; retain existing product-discovery references when present.

Preserve authored narrative/custom sections, stable IDs/priorities/dates, accepted decisions, managed baseline updates, completed epic lines/detail bytes, and downstream references. Explain conflicts rather than automatically choosing code over approved documents. Material referenced CAP changes use amend. ADR mutations remain solely the architecture owner's ADR Author; do not backdate decisions or invent rejected options.

Keep all mandatory headings/table grammars. Replace template examples with supported content, an explicit gap, or justified inapplicability. An empty table with an explanatory unknown can be a candidate, not permission to game a planning-ready validator. Structural PASS cannot certify factual truth.

## PRD

Use the PRD template, product-facing/problem-first. Evidence of implementation is not intent. Do not invent why-now, personas, value, priority, KPI targets, scope boundaries, or roadmap. Plain-text capability observations remain evidence until ongoing scope/outcome/priority are decided. Preserve existing CAP IDs; assign new IDs monotonically only to accepted in-scope clusters. Keep implementation/verification state in a separate cited support mapping, not extra capability-map columns. No architecture, backlog tasks, or Given/When/Then in PRD.

Use `prd_maturity: draft` unless explicit product readiness and planning-ready validation pass. Active PRD discovery still owns decisions and prevents conflicting PRD/plan publication. If draft validation cannot honestly pass, return an unregistered candidate with diagnostics.

Before assigning a new CAP ID, record an attributed accepted `scope: product-scope` decision targeting the PRD, with `capabilities: [{ name, priority, outcome }]` for the decided plain-text clusters. Existing unchanged canonical rows retain their decisions. The publisher requires exact scope/outcome/priority confirmation for every new or semantically changed row; publication consent alone cannot stand in for product scope.

## SAD

Use the SAD template, nine Technical Context fields, C4 Context/Container views, decomposition, view catalog, FLOW catalog/diagrams, failure behavior, cross-cutting concerns, quality attributes, traceability, ADR index, and gaps/baseline updates. Preserve brownfield source layout. All views stay within existing node/notation rules.

Separate as-is from an explicitly approved target. A configured retry/backup or observed behavior is not an approved quality target; a measurement is not an SLO. Do not diagram desired recovery/trust/tenancy as implemented. Missing targets or ownership can keep `sad_maturity: draft`.

Existing standalone ADRs remain authoritative for their stated scope/status. Observed technology alone warrants an observation, not an accepted ADR with invented history. New current retain/change decisions need explicit user approval and a resolved MADR payload through the owning architecture command. If needed, return that handoff and keep the candidate draft rather than writing ADRs directly. An empty ADR catalog is valid when no supported ADR exists.

Track every linked standalone ADR in the output's `dependencies`; its ID/status must match the catalog. Custom canonical SAD locations use relative links that still resolve to `specs/adrs/NNNN-title.md`. Do not move ADR files to make a custom SAD link work.

## DOD

Use the DOD template and `node scripts/validate-dod.mjs` for structural reference checks. One selected registered target, no shadow `specs/dod.md`. Clearly distinguish configured, reported-in-use, and independently evidenced practices. Never import the template's staging ladder, rollout, SLO/RPO/RTO, on-call, DR, compliance, cost estimates, or maturity roadmap as facts.

Keep consequential unknown areas explicit. Only accepted and supported decisions receive DDR IDs/status. Source an existing rationale or state it as unknown; do not synthesize historical alternatives. Omit genuinely inapplicable optional areas. Reference usability is not production readiness or a compliance certificate.

## Project plan: additive imported-baseline contract

Require actual planning-ready PRD/SAD validation, discovery completion when applicable, canonical source paths, and the validator's capability digest. Preserve all seven required plan sections, `E###` checklist/detail grammar, source tags, priorities, wave/dependency rules and immutable completed history.

In Coverage Validation, add exactly one marked JSON block for brownfield coverage:

````markdown
<!-- sddp-baseline-coverage -->
```json
{
  "schema": 1,
  "items": [
    { "source": "PRD:CAP-001", "disposition": "baseline", "scope": "Confirmed existing capability", "limitation": "Source inspected; production behavior not verified", "evidence": ["RE-001"], "decision": "RE-002", "epics": [] }
  ],
  "futureWork": [],
  "noFutureWork": "RE-003"
}
```
````

Each validator-provided PRD CAP, accepted SAD ADR, and accepted DOD DDR is covered once as `baseline`, `partial`, `epic`, or `excluded`, with scope/limitations and an explicit accepted ledger decision targeting the canonical plan. Baseline/partial entries require source evidence with implemented/partial state. Partial/epic entries reference actual epics carrying matching source tags. Exclusions need accepted rationale, not a fabricated nearest-source tag.

`futureWork` maps each new unchecked epic to an accepted decision with `scope: future-work`. For zero epics, `noFutureWork` references an accepted decision with `scope: no-future-work`. These decisions must name the canonical plan target. Questions resolved by deferral do not commit work. Keep the regular human-readable coverage tables aligned with the block.

Implemented baseline is not a synthetic `[X]` epic, a feature workspace, a task completion, or QC evidence. For partial capability, plan only the approved remaining increment, with dependency contracts explicitly referring to baseline deliverables where appropriate. TODOs, failing tests, best-practice gaps and old roadmaps are review candidates, not commitments.

A confirmed zero-future-work plan has all required sections, zero executable epic lines, no new detail files, no pretend waves, and complete baseline/exclusion coverage. Missing remaining-work decisions mean no registered plan. Autopilot reports no planned epics, not all epics delivered; regen cannot infer completed-prototype eligibility from an empty checklist.

Track the actual canonical PRD, SAD, optional DOD, and referenced epic details in output `dependencies` so later changes invalidate only affected provenance. Existing valid canonical inputs can be consumed without republishing them through onboarding; pending alternative candidates do not replace those inputs.

Ordinary projectplan/amend reruns preserve imported coverage and its supporting ledger. Do not turn already-covered baseline scope back into rebuild backlog. Only explicitly approved changes can revise its dispositions. The same `validate-project-plan.mjs` applies to both owners and onboarding; checked epic lines and detail files are immutable.

Actual feature delivery can complete an approved unchecked epic through `record-epic-completion.mjs` after current QC and spec/epic identity pass. That separate delivery helper journals the mechanical checkbox/provenance transition, without manufacturing baseline completions or refreshing stale source evidence. Reverse-engineering never calls it.
