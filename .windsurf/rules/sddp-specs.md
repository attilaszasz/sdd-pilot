---
trigger: always
globs: "specs/*/**/*.md"
---

# SDD Pilot — Specification File Conventions

When editing feature-artifact files inside a Feature Workspace at `specs/<feature-folder>/`, follow these rules. Do not apply them to Project Context Specs such as `specs/prd.md` or `specs/sad.md`.

For the full rule set, see `.github/skills/artifact-conventions/SKILL.md`.

## Preservation Rules
- Treat missing `spec_type` in `spec.md` frontmatter as `product`
- Do NOT reorder product user story priorities or non-product objective priorities (P1, P2, P3) without explicit user approval
- Do NOT change task IDs (T001, T002...) — they are used for cross-referencing
- Do NOT change checklist IDs (CHK001, CHK002...) — they are referenced externally
- Do NOT change requirement IDs (FR-001, TR-001, OR-001, RR-001) — they are mapped to tasks and coverage reports
- Do NOT change success criteria IDs (SC-001, SC-002...) — they are referenced in phase reviews
- Preserve checkbox state (`- [ ]` vs `- [X]`) — changing state has gating consequences
- The only valid checkbox transition is `- [ ]` → `- [X]` (completed). Never reverse without explicit user approval.
- Respect `[NEEDS CLARIFICATION]` markers — only resolve with user-approved answers

## Format Rules
- Task format: `- [ ] T### [P?] [US#|OBJ#?] {(FR|TR|OR|RR)-###?} Description with file path`
- Requirement format: `(FR|TR|OR|RR)-###: ...`
- Success criteria format: `SC-### [US#|OBJ#]: [Measurable, technology-agnostic outcome]`
- Checklist format: `- [ ] CHK### <question> [Quality Dimension, Spec §X.Y]`

## Section Rules
- Allowed spec.md top-level sections depend on `spec_type`:
	- `product`: `Problem Statement`, `Scope`, `User Scenarios & Testing`, `Requirements`, `Assumptions & Risks`, `Implementation Signals`, `Success Criteria`, optional `Glossary`, optional `Clarifications`, optional `Compliance Check`
	- `technical`: `Problem Statement`, `Scope`, `Technical Objectives`, `Integration Points`, `Requirements`, `Assumptions & Risks`, `Implementation Signals`, `Success Criteria`, optional `Glossary`, optional `Clarifications`, optional `Compliance Check`
	- `operational`: `Problem Statement`, `Scope`, `Operational Objectives`, `Integration Points`, `Requirements`, `Assumptions & Risks`, `Implementation Signals`, `Success Criteria`, optional `Glossary`, optional `Clarifications`, optional `Compliance Check`
- Plan.md: do not remove the Instructions Check section
- Tasks.md: do not remove the Dependencies section
