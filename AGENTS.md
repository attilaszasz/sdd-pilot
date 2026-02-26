# SDD Pilot — Agent Context

This project uses **Spec-Driven Development**. Every feature moves through ordered phases before implementation begins.

## Phase Order (strict)

```
Specify → Clarify → Plan → Checklist (optional) → Tasks → Analyze (optional) → Implement
```

**Gates — these are enforced, not suggested:**
- Never plan without `spec.md`
- Never generate tasks without `plan.md`
- Never implement without `tasks.md`
- `project-instructions.md` violations are always CRITICAL severity
- If checklists exist and any items are incomplete, implementation is blocked (override available)

## Conventions You Can't Discover From Code

### Feature folder naming
- New folders **must** use `00001-feature-name` format (5-digit prefix)
- Branch name `#####-feature-name` auto-resolves to `specs/<branch-name>/`

### Task format in `tasks.md`
```
- [ ] T### [P?] [US#?] Description with file path
```
- `[P]` = parallelizable (safe to run in parallel with other `[P]` tasks)
- `[US#]` = maps to spec user story priorities P1, P2, P3
- Phase order: Setup → Foundational → User Stories (by priority) → Polish
- Mark done: `- [ ]` → `- [X]`

### Priority system
- P1 = most critical, P1 alone should yield a viable MVP
- Each user story must be independently testable

### Project instructions (`project-instructions.md`)
- This is the **highest authority** in the SDD process
- `.github/copilot-instructions.md` and `GEMINI.md` are stubs that redirect here — don't edit them directly
- Managed exclusively by `/sddp.init`

### Architecture pattern
- Workflow logic lives in `.github/skills/<name>/SKILL.md` (tool-agnostic)
- Tool-specific wrappers load these skills — don't duplicate logic in wrappers
- Wrappers exist in `.github/agents/` (Copilot), `.agents/workflows/` (Antigravity), `.windsurf/workflows/` (Windsurf)
