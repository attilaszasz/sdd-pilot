# Existing-project onboarding

Install a tool-specific SDD Pilot release into your project. Do not run bootstrap commands in the framework source checkout.

```text
/sddp-reverseengineer
/sddp-reverseengineer --resume
/sddp-reverseengineer --status
```

The first command starts local evidence collection. Add context such as “Onboard packages/api and packages/web; the retired mobile prototype is excluded.” Resume continues an interrupted run from disk. Status reports progress without writing anything. An existing active run is never overwritten by another start.

## What gets inspected

The agent surveys documentation, source entry points and capability paths, manifests, configuration, schemas, tests, CI/CD, infrastructure, operational docs, and available local Git history. Large repositories are inspected in bounded subsystem batches. Coverage records explicitly say inspected, deferred, excluded, or inaccessible. No Git or shallow history limits historical understanding without blocking source inspection.

Static inspection is the default. Bundled state/validation helpers and read-only local Git inspection do not execute application code. Running tests/scripts, installing dependencies, launching services, fetching remote history, accessing trackers, or checking live infrastructure requires an explicit bounded approval. Permission limitations remain visible; unexecuted tests are never reported as passing. Do not supply secrets or customer data.

## How uncertainty is handled

A fact says exactly what a cited source proves. A manifest proves a declared dependency, not its use; CI YAML proves configured deployment, not a successful production release. An inference carries evidence, reasoning, alternatives, and confidence. Unknowns remain gaps. User answers are attributed decisions or attestations, not retroactive proof of historical rationale or stakeholder consensus.

Implementation state (implemented, partial, planned, disabled, undetermined), verification level, and commitment state are separate. A working UI does not prove the intended business outcome. An old roadmap or TODO is not a current promise. A failing test or missing best practice does not automatically create future work.

The agent groups material questions by product, architecture, operations, and remaining work. Each has a recommendation, evidence, consequences, and a free-form/defer option. It saves the batch before asking and waits for actual answers. There is no fixed two-batch limit. Deferring a blocker can still permit an honest reference draft but not planning readiness.

## Files and readiness

`specs/reverse-engineering.md` is the durable ledger. Its marked JSON state holds stable `RE-###` records, source digests, coverage, stages, decisions, questions, canonical targets, approvals, and publication status. The generated narrative is a readable summary of that state. Checkpoints are compare-before-write and append-only for history. Do not edit published digests or discard the ledger when a plan relies on it.

`specs/reverse-engineering/` contains subsystem summaries and explicitly noncanonical candidates. Its ignored `.recovery/` directory holds only private transaction/recovery data. Do not commit or publish recovery files. Support documents are not a parallel product/architecture registry; `.github/sddp-config.md` remains the canonical path registry.

The four outputs retain the existing canonical structures and IDs:

- PRD: product-facing intent and accepted scope; no invented personas, priorities, success targets, or capability IDs for undecided observations.
- SAD: observed boundaries, C4 overviews, major flows and real failure behavior; no manufactured architectural history. New current ADR decisions go through the architecture owner and ADR Author.
- DOD: configured versus reported/evidenced practices, explicit operational gaps, and supported DDRs; no template staging/SLO/on-call/roadmap defaults.
- Project plan: only explicitly approved remaining work becomes executable epics. Confirmed implemented scope is imported baseline coverage, never synthetic checked epics or rebuild backlog.

Each output reports structural validation, user confirmation, and permitted use separately. A review candidate is not canonical. An explicitly approved canonical draft is not planning-ready. Registration identifies the document; it does not certify readiness. PRD/SAD still require their actual planning-ready validators before project planning/autopilot. A DOD structural PASS is reference usability, not production readiness or compliance certification.

When even draft validation cannot honestly pass, the candidate remains unregistered. Independent supported outputs may be published while others await decisions. The agent never promises that repository inspection alone can complete all four documents.

## Already-implemented capabilities and future work

Brownfield plans keep the existing required sections, capability digest, `E###` checklist/detail grammar, dependencies, and traceability. Their Coverage Validation section includes an additional marked `sddp-baseline-coverage` JSON block. It maps each canonical source to a confirmed baseline, partial remaining scope, epic, or justified exclusion, with evidence and limitations.

Only an explicit future-work decision can create a new unchecked epic. Partial capability produces only the agreed remaining increment. Existing checked epics and their detail files are unchanged. Ordinary projectplan/amend reruns preserve the baseline instead of rebuilding it.

If no future work is intended, explicitly confirm that decision. With planning-ready PRD/SAD and complete baseline/exclusion coverage, a zero-epic plan is valid. Autopilot then says “No planned epics,” not that all functionality was delivered through SDD. Baseline evidence cannot create completion/QC markers or make an empty plan eligible for prototype regeneration.

## Reviewing and publishing

The agent presents the material delta, evidence, caveats, selected paths, and readiness before publication. Even a new canonical draft needs explicit approval. Confirmation binds the candidate, evidence, current live document, and config digests; edits invalidate approval and require a refreshed review.

Those bindings and the validation profile live in the immutable publication decision, not only a mutable approval field. Clearing an approval cannot let the agent silently reuse old consent for new bytes. Pending alternative candidates keep their own evidence context; they do not invalidate untouched published documents unless their existing sources, dependencies, decisions, or live conflicts actually change.

Registered custom paths remain the only canonical write targets. Broken registrations are surfaced, not bypassed. Conflicts between implementation and accepted documents are reconciled explicitly; neither automatically wins. Referenced CAP changes go through amend, and active PRD discovery still owns product decisions.

The publisher validates a selected dependency-consistent candidate set, journals prior bytes, writes the live documents/config, validates again, and records publication. Resume recovers an interrupted publication using only known before/after bytes. If a user edited an affected file meanwhile, recovery stops before restoring anything. Reconcile that conflict explicitly; never delete the entire support directory to “fix” it.

A stale writer lock can be removed only after verifying no other writer remains, and only that lock file. A changed source, coverage inventory, canonical dependency, or published document makes the affected output stale; unrelated pending candidates do not invalidate untouched outputs. Structural validators cannot detect whether every model-written sentence is true: review the evidence and consequential interpretations.

Resurveying changed evidence appends replacement observations and an evidence-reconciliation record; it never deletes history or changes an old source digest. Historical observations cannot establish current baseline coverage. Revised user decisions explicitly supersede the prior decision, so withdrawn scope or publication consent cannot be reused. Consequential changes need renewed validation, and republishing needs fresh confirmation.

## Continuing the lifecycle

Typical adoption is release installation → reverse engineering/review → missing decisions through PRD/systemdesign/devops/projectplan → init → normal feature delivery. Init-first and init-only workflows remain valid. Existing governance is not rewritten by onboarding. Init alone owns project rules and Derived QC Policy and now distinguishes untouched governance templates from existing implementation so it does not impose `/src` on brownfield projects.

Use resumed onboarding for evidence gaps and initial establishment. Use the owning bootstrap command for new product/design/operations decisions, retaining provenance. Use amend for later intentional cross-artifact changes. Never use regen as onboarding; it archives implementation and has different eligibility and authorization rules.

Repository inspection cannot recover unrecorded product strategy, original rejected architectural options, actual production drift, ownership, commercial targets, legal/compliance posture, or future commitments. Those need authoritative evidence or decisions. Source inspection, passing tests, user confirmation, and structural validation are not release certification.
