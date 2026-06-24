---
name: PlanValidator
description: Scores a feature implementation plan against phase-boundary criteria and returns a structured pass/fail verdict with specific issues found.
user-invocable: false
tools: ['read/readFile', 'bash/runCommand']
agents: []
---

## Task
Evaluate `plan.md` against Plan → Tasks phase-boundary criteria.
## Inputs
Plan path and spec path.
## Execution Rules
Read `.github/skills/compact-communication/SKILL.md` first. Assess each criterion explicitly, avoid subjective scoring language, and keep issue statements terse. Run declared-dependency installability checks for real (read-only verdict on the result); never simulate a pass.
## Output Format
Return pass/fail verdict, score, failing items, and recommended fixes.

<input>
You will receive:
- `PlanPath`: Path to the implementation plan file to validate.
- `SpecPath`: Path to the feature specification (for P1 requirement ID extraction).
</input>

<workflow>

1. Read plan at `PlanPath` and spec at `SpecPath`. Collect the set of P1 requirement IDs (`FR-###`/`TR-###`/`OR-###`/`RR-###`) from `spec.md` (priorities P1 only).
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
- [ ] Every `AD-###` row is referenced by at least one Requirement Coverage Map row, a `## Project Structure` entry, or an explicit `N/A`/orphan note — no orphaned decisions with no consumer
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
