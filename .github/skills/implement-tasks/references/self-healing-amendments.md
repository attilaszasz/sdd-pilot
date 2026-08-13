# Self-Healing Artifact Amendments

> **Load condition**: Read this file only after the Developer returns `Status: SUCCESS` with one or more `Divergence` blocks. Complete all amendments, revalidate their exact on-disk inputs, and then re-parse `COVERAGE_MATRIX` before processing the next task. Do not load this file when no divergence was reported.

Apply each divergence by category:

- `file-path` -> in `plan.md` `## Requirement Coverage Map`, update the `File Path(s)` cell of the row whose `Req ID` matches the divergence `ReqID` from `Original` to `Actual`. When the divergence `ReqID` is `—`, update the matching `## Project Structure` Source Code entry instead. Do not change the `Req ID` column.
- `symbol` -> update the `Function(s)/Symbol(s)` cell of the matching Requirement Coverage Map row AND the corresponding entity/symbol name in `data-model.md` (when the entity exists). Both columns must stay populated.
- `api-shape` -> update the affected schema in `FEATURE_DIR/contracts/` (request/response types, status codes, paths) to match `Actual`. Also update the `## API Surface Summary` row in `plan.md` when the route/verb/types changed.
- `architecture` -> split by scope:
  - Feature-local divergence (affects only this feature's boundaries): append a new `AD-###` row to `plan.md` `## Architecture Decisions` with the divergence as the decision, `Actual` as the chosen option, and a one-line rationale. Do not reuse or renumber existing `AD-###` IDs.
  - Project-wide divergence (changes a cross-cutting boundary, integration, or quality attribute shared outside this feature): **Delegate: ADR Author** (`.github/agents/_adr-author.md`) with `Operation: create`, `DecisionScope: project-level`, and the divergence payload. After it returns, update the `specs/sad.md` ADR catalog table with the returned `SadCatalogRow` and reference the returned `ADR-NNNN` from `plan.md` instead of recording an `AD-###` row.

After all amendments for the task:

1. Build `AMENDED_ARTIFACTS` from exact before/after byte snapshots of every artifact touched by the procedure, including `plan.md`, `data-model.md`, `contracts/` files, feature-local architecture entries, `specs/sad.md`, created ADR files, `divergence-log.md`, and `autopilot-log.md`. Missing referenced artifacts and partial writes are amendment failures; do not infer an unchanged or successfully amended artifact.
2. If `AMENDED_ARTIFACTS` contains `plan.md`, `data-model.md`, any `contracts/` file, feature-local architecture, `specs/sad.md`, or a created ADR, run Plan Validator with the current on-disk `FEATURE_DIR/plan.md` and `FEATURE_DIR/spec.md`, then Tasks Validator with the current on-disk `FEATURE_DIR/tasks.md` and `FEATURE_DIR/spec.md`. Run in that order. Pass only checksum-verified `P1RequirementIds`; otherwise require each validator's live parser. These are fresh verdicts, never a reuse of the invocation's earlier gates.
3. Compare the byte snapshots of every validator input after each validator returns. If `spec.md`, `plan.md`, or `tasks.md` changed while validation ran, repeat the affected owning and downstream validators against the new bytes. Continue only when the PASS verdicts cover the exact bytes that the next task will consume.
4. Any amendment error, missing artifact, partial write, validator failure, malformed validator verdict, or input that changes again during its revalidation is a blocking post-amendment failure. Keep the current task `[ ]`, remove it from `IN_REVIEW_TASKS`, do not start another task or Phase Review, and do not create `.completed`. `AUTOPILOT = true` must halt and append a `halt` row to `FEATURE_DIR/autopilot-log.md` with Phase=`Implement+QC`, Detail="Self-healing post-amendment gate FAIL", Outcome="Halt implementation", and the affected artifacts. Interactive runs halt and report the exact failed amendment or validator; they do not offer a bypass because the Developer result was validated against superseded inputs.
5. Re-parse `COVERAGE_MATRIX` from the validated `plan.md` so the next task's `ExpectedEvidence` and the Phase Review Requirement Coverage Diff use fresh values.
6. Append one row per divergence to `FEATURE_DIR/divergence-log.md` (create the file if absent):

   ```markdown
   | Timestamp | TaskID | ReqID | Category | Original | Actual | AffectedArtifact | Rationale |
   | [ISO 8601] | T### | (FR\|TR\|OR\|RR)-### or — | [category] | [original] | [actual] | [artifact:section] | [rationale] |
   ```

7. When `AUTOPILOT = true`, log each amendment as a `decision` row to `FEATURE_DIR/autopilot-log.md`: Timestamp=now, Phase=`Implement+QC`, Event=`decision`, Detail="Self-healing amendment: [category] on [AffectedArtifact]", Outcome="Amended", Rationale="[Developer divergence rationale]", Artifacts=`[plan.md](plan.md), [divergence-log.md](divergence-log.md)`. Validate and atomically append the complete row under the current run per the Autopilot logging contract.
8. Report: "↺ T### diverged ([N] amendment[s]): [category:affectedArtifact; ...]; revalidated [AMENDED_ARTIFACTS]"

Do not treat a divergence as complete until every required amendment and post-amendment gate passes. Logs are append-only and do not satisfy or bypass phase validation.
