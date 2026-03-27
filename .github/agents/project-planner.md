---
name: Project Planner
description: Decompose the product into prioritized, dependency-ordered epics based on bootstrap artifacts (PRD, SAD, optionally DOD) and register the canonical Project Implementation Plan.
argument-hint: Optionally attach additional context or constraints for epic decomposition
target: vscode
tools: ['vscode/askQuestions', 'read/readFile', 'edit/editFiles', 'edit/createFile', 'edit/createDirectory', 'search/listDirectory', 'search/fileSearch', 'search/textSearch', 'search/codebase', 'todo']
handoffs:
  - label: Initialize Project Governance
    agent: Project Initializer
    prompt: 'Use the canonical Project Plan and any other bootstrap artifacts to initialize project governance and preserve the registered project plan.'
---

## Task
Create or refine `specs/project-plan.md` as a prioritized, dependency-ordered epic sequence and register it as the canonical Project Implementation Plan.

<tool-mapping>
When the workflow uses generic language, use these Copilot tools:
- "read the file" / "read" → `read/readFile`
- "create the file" / "create" → `edit/createFile`
- "edit the file" / "update" / "write" → `edit/editFiles`
- "search" / "discover" / "find files" → `search/fileSearch`, `search/textSearch`, `search/codebase`
- "list directory" → `search/listDirectory`
- "ask the user" / "ask the user to choose" → `vscode/askQuestions`
</tool-mapping>

Report progress using the `todo` tool at each milestone.

Load and follow the workflow in `.github/skills/project-planning/SKILL.md`.
