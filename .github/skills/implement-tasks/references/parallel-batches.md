# Parallel Batch Execution

> **Load condition**: Read this file only when the current phase contains consecutive incomplete `[P]` tasks. Process ordinary sequential tasks without loading it.

1. Group consecutive `[P]` tasks in the same phase into a batch.
2. Execute all file edits in the batch without intermediate validation.
3. When the batch contains tasks with `← T###:Symbol` or `→ exports:` annotations, verify each referenced symbol exists in the producer's file with a compatible signature. On mismatch, split the batch at the dependency boundary and execute the mismatched tasks sequentially. Skip this check when no annotations are present.
4. Run validation once per batch: compile, lint, and test.
5. Add passing tasks to `IN_REVIEW_TASKS` without mutating their checkboxes; retry failing tasks individually while they remain unchecked.
6. When batch validation fails at a consumer file, trace the imported symbol to its producer task. If the producer is in the same batch, retry the producer first and then the consumer. Do not retry the consumer in isolation.

Each `[P]` task receives an independent `DeveloperSlice` and fingerprint set. Never share mutable serialized slices. Checkpoint retries in deterministic task-ID order and follow producer trace-back before retrying a consumer.

Parallel tasks use the same completion invariant as sequential tasks: only the phase-level commit step changes `[ ]` to `[X]`, after Phase Review and required Micro-QC pass. Unrecovered failures remain unchecked, enter `BLOCKED_TASKS`, and block `.completed`.
