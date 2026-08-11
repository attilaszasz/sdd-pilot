# Self-Healing Artifact Amendments

> **Load condition**: Read this file only after the Developer returns `Status: SUCCESS` with one or more `Divergence` blocks. Complete all amendments and re-parse `COVERAGE_MATRIX` before processing the next task. Do not load this file when no divergence was reported.

Apply each divergence by category:

- `file-path` -> in `plan.md` `## Requirement Coverage Map`, update the `File Path(s)` cell of the row whose `Req ID` matches the divergence `ReqID` from `Original` to `Actual`. When the divergence `ReqID` is `—`, update the matching `## Project Structure` Source Code entry instead. Do not change the `Req ID` column.
- `symbol` -> update the `Function(s)/Symbol(s)` cell of the matching Requirement Coverage Map row AND the corresponding entity/symbol name in `data-model.md` (when the entity exists). Both columns must stay populated.
- `api-shape` -> update the affected schema in `FEATURE_DIR/contracts/` (request/response types, status codes, paths) to match `Actual`. Also update the `## API Surface Summary` row in `plan.md` when the route/verb/types changed.
- `architecture` -> split by scope:
  - Feature-local divergence (affects only this feature's boundaries): append a new `AD-###` row to `plan.md` `## Architecture Decisions` with the divergence as the decision, `Actual` as the chosen option, and a one-line rationale. Do not reuse or renumber existing `AD-###` IDs.
  - Project-wide divergence (changes a cross-cutting boundary, integration, or quality attribute shared outside this feature): **Delegate: ADR Author** (`.github/agents/_adr-author.md`) with `Operation: create`, `DecisionScope: project-level`, and the divergence payload. After it returns, update the `specs/sad.md` ADR catalog table with the returned `SadCatalogRow` and reference the returned `ADR-NNNN` from `plan.md` instead of recording an `AD-###` row.

After all amendments for the task:

1. Re-parse `COVERAGE_MATRIX` from the amended `plan.md` so the next task's `ExpectedEvidence` and the Phase Review Requirement Coverage Diff use fresh values.
2. Append one row per divergence to `FEATURE_DIR/divergence-log.md` (create the file if absent):

   ```markdown
   | Timestamp | TaskID | ReqID | Category | Original | Actual | AffectedArtifact | Rationale |
   | [ISO 8601] | T### | (FR\|TR\|OR\|RR)-### or — | [category] | [original] | [actual] | [artifact:section] | [rationale] |
   ```

3. When `AUTOPILOT = true`, log each amendment as a `decision` row to `FEATURE_DIR/autopilot-log.md`: Timestamp=now, Phase=`Implement`, Event=`decision`, Detail="Self-healing amendment: [category] on [AffectedArtifact]", Outcome="Amended", Rationale="[Developer divergence rationale]", Artifacts=`[plan.md](plan.md),[divergence-log.md](divergence-log.md)`.
4. Report: "↺ T### diverged ([N] amendment[s]): [category:affectedArtifact; ...]"

Never halt on a divergence. Log and report an unrecoverable amendment problem, such as a missing referenced artifact, but continue the run.
