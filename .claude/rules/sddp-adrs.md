---
paths:
  - "specs/adrs/*.md"
---

# SDD Pilot - Standalone ADRs

ADRs under `specs/adrs/` follow the MADR contract in `.github/skills/adr-authoring/SKILL.md`.

Hard rules (canonical: `.github/skills/artifact-conventions/SKILL.md`):

- ADR-NNNN numbers are monotonic and NEVER reused.
- Do NOT rename, renumber, or delete ADR files.
- All ADR file mutations flow through the ADR Author sub-agent (`.github/agents/_adr-author.md`).
- Cross-referenced by project-plan epics, plan traceability tags `{SAD:ADR-NNNN}`, and the `sad.md` ADR catalog.
