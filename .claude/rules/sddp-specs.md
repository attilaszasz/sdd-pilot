---
paths:
  - "specs/**/*.md"
---

# SDD Pilot — Specification File Conventions

When editing files under `specs/`, follow these rules.

For the full rule set, see `.github/skills/artifact-conventions/SKILL.md`.

## Preservation Rules
- Do NOT reorder user story priorities (P1, P2, P3) without explicit user approval
- Do NOT change task IDs (T001, T002...) — they are used for cross-referencing
- Do NOT change checklist IDs (CHK001, CHK002...) — they are referenced externally
- Do NOT change requirement IDs (FR-001, FR-002...) — they are mapped to tasks and coverage reports
- Do NOT change success criteria IDs (SC-001, SC-002...) — they are referenced in phase reviews
- Preserve checkbox state (`- [ ]` vs `- [X]`) — changing state has gating consequences
- The only valid checkbox transition is `- [ ]` → `- [X]` (completed). Never reverse without explicit user approval.
- Respect `[NEEDS CLARIFICATION]` markers — only resolve with user-approved answers

## Format Rules
- Task format: `- [ ] T### [P?] [US#?] Description with file path`
- Requirement format: `FR-###: System MUST [specific capability]`
- Success criteria format: `SC-###: [Measurable, technology-agnostic outcome]`
- Checklist format: `- [ ] CHK### <question> [Quality Dimension, Spec §X.Y]`

## Section Rules
- Do not add new top-level sections to spec.md (except `## Clarifications`)
- Plan.md: do not remove the Instructions Check section
- Tasks.md: do not remove the Dependencies & Execution Order section
