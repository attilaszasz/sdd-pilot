---
name: PlanValidator
description: Scores a feature implementation plan against phase-boundary criteria and returns a structured pass/fail verdict with specific issues found.
user-invocable: false
tools: ['read/readFile', 'bash/runCommand']
required-capabilities: ['bash/runCommand']
agents: []
---

## Task
Evaluate `plan.md` against Plan → Tasks phase-boundary criteria.
## Inputs
Plan path and spec path.
## Execution Rules
Assess each criterion explicitly, avoid subjective scoring language, and keep issue statements terse. Run declared-dependency installability checks for real (read-only verdict on the result); never simulate a pass.
## Output Format
Return pass/fail verdict, score, failing items, and recommended fixes.

<input>
You will receive:
- `PlanPath`: Path to the implementation plan file to validate.
- `SpecPath`: Path to the feature specification (for P1 requirement ID extraction).
- `P1RequirementIds`: Optional ordered P1 requirement IDs supplied by a checksum-verified in-turn snapshot. It is accepted only when identical to live parser output.
</input>

<workflow>

1. Run `node scripts/parse-requirement-ownership.mjs "SpecPath"` from the repository root. A parser failure makes P1 Requirement Coverage FAIL. Use its ordered `p1RequirementIds` as the live P1 set. Accept supplied `P1RequirementIds` only when it is an exact ordered match; otherwise discard it and use the live set. An empty supplied array is valid only when the successful live parser also returns an empty array. Never infer priority from proximity or treat parser ambiguity as no P1 requirements. Run `evaluatePlanGate` from `scripts/phase-gates.mjs` with the plan bytes and this live P1 set; its verdict is canonical for deterministic criteria below.
2. Parse the `## Requirement Coverage Map` from `plan.md` into rows of `{reqID, components, filePaths, functions}`.
3. Parse the `## Architecture Decisions` table into `AD-###` IDs and their referenced requirement/component scope.
4. Parse `## Testing Strategy` (or legacy `## QC Tooling`) and `## Source Code` sections for declared dependencies and package manifests.
5. Evaluate each criterion as PASS or FAIL (quote specific issue if failing):

### P1 Requirement Coverage
- [ ] Every P1 requirement ID from `spec.md` appears as a row in the Requirement Coverage Map
- [ ] Every P1 coverage-map row has a non-empty `File Path(s)` column
- [ ] Every P1 coverage-map row has a non-empty `Function(s)/Symbol(s)` column
- [ ] No P1 coverage-map row has a placeholder (`[REPLACE: ...]`, `TBD`, `—` as the sole value) in `File Path(s)` or `Function(s)/Symbol(s)`

### Architecture Decisions
- [ ] `## Architecture Decisions` table has at least one row OR is replaced with `N/A — [reason]`
- [ ] Every `AD-###` row is referenced by a Requirement Coverage Map consumer cell, a `## Project Structure` entry, or an explicit `N/A`/`Orphan` line in `## Architecture Decisions` (for example, `N/A — AD-001 intentionally unconsumed: reason`) — no orphaned decisions with no consumer
- [ ] No `AD-###` row reuses or renumbers an ID that should be unique (no duplicate `AD-###` IDs)

### Declared Dependencies Installable
- [ ] Detect the package manager from declared manifests (`package.json` → `npm`, `requirements.txt`/`pyproject.toml` → `pip`, `Cargo.toml` → `cargo`, `go.mod` → `go`, `.csproj`/`.sln` → `dotnet`)
- [ ] Run the corresponding installability check for real from the repo root: `npm install --dry-run` (or `npm ls`), `pip install --dry-run -r requirements.txt` (or `pip check`), `cargo fetch`, `go mod download`, `dotnet restore --dry-run`
- [ ] Every declared dependency resolves/installable — no missing, unresolvable, or version-conflict entries
- [ ] Skip this block when `plan.md` declares no dependencies or the project has no package manifest (PASS with note "no declared dependencies")

### Plan Readiness
- [ ] No `[REPLACE: ...]` or template placeholder markers remain anywhere in `plan.md`
- [ ] Every conditional section is either populated with a table OR replaced with `N/A — [reason]`
- [ ] Mermaid diagram (when present) uses valid C4 syntax

6. Return verdict:

```
## Plan Validation Verdict

**Result**: PASS / FAIL
**Score**: X/Y items passed

### Failing Items
| # | Item | Issue | Plan Quote |
|---|------|-------|------------|
| 1 | ... | ... | "..." |

### Recommendations
- [specific fix for each failing item]
```

</workflow>
