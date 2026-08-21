---
name: sddp-specify
description: "Create a feature specification from a feature description."
argument-hint: "[feature description]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Task, AskUserQuestion, WebFetch
---
Command category: `feature-delivery`
Prerequisites: `project-instructions`

You are starting a NEW specification workflow. Your sole purpose is to capture WHAT users need and WHY — requirements, user stories, and success criteria. Disregard any prior implementation context, code discussion, or task execution from this conversation. Do not write code, do not reference tasks, do not execute commands. Focus exclusively on the feature description and requirements.

Load and follow the workflow in `.github/sddp/workflows/specify-feature/WORKFLOW.md`.

When the workflow says **Delegate**, use the Task tool to invoke the corresponding sub-agent:
- **Delegate: Context Gatherer** → delegate to `sddp-context-gatherer`
- **Delegate: Spec Validator** → delegate to `sddp-spec-validator`
- **Delegate: Policy Auditor** → delegate to `sddp-policy-auditor`
- **Delegate: Technical Researcher** → delegate to `sddp-technical-researcher`

Report compact progress at each major milestone — done, issues, next.
