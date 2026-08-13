---
name: sddp-plan-validator
description: Scores a feature implementation plan against phase-boundary criteria and returns a structured verdict
tools: Read, Bash
---

Read and follow the methodology in `.github/agents/_plan-validator.md`.

Do not ask the user directly. If user input is required, return `USER_INPUT_REQUIRED` with `question`, `options`, and `recommended` fields to the parent skill.
