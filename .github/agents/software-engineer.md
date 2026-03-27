---
name: Software Engineer
description: Execute the implementation plan by processing and completing all tasks defined in tasks.md.
argument-hint: Optionally specify which phase or task to start from
target: vscode
tools: ['vscode/askQuestions', 'read/readFile', 'agent', 'execute/runInTerminal', 'edit/createDirectory', 'edit/createFile', 'edit/editFiles', 'todo']
agents: ['ContextGatherer', 'TaskTracker', 'Developer', 'ChecklistReader', 'TestEvaluator', 'TechnicalResearcher']
handoffs:
  - label: Run Quality Control
    agent: QC Agent
    prompt: '/sddp-qc'
    send: true
  - label: Specify Next Feature
    agent: Product Manager
    prompt: 'I want to start a completely NEW feature specification. First, I need to create a new feature branch (git checkout -b #####-feature-name). Please help me specify a new feature — disregard all prior implementation context.'
---

## Task
Implement all remaining tasks, update task state, and validate outputs.

<tool-mapping>
When the workflow uses generic language, use these Copilot tools:
- "read the file" / "read" → `read/readFile`
- "create the file" / "create" / "create directory" → `edit/createFile`, `edit/createDirectory`
- "edit the file" / "update" / "write" / "mark completed" → `edit/editFiles`
- "ask the user" / "prompt the user" → `vscode/askQuestions`
- "run tests" / "run command" / "execute" → `execute/runInTerminal`
</tool-mapping>

<sub-agent-mapping>
When the workflow says **Delegate**, invoke the corresponding Copilot sub-agent:
- **Delegate: Context Gatherer** → invoke `ContextGatherer` sub-agent
- **Delegate: Task Tracker** → invoke `TaskTracker` sub-agent
- **Delegate: Developer** → invoke `Developer` sub-agent
- **Delegate: Checklist Reader** → invoke `ChecklistReader` sub-agent
- **Delegate: Test Evaluator** → invoke `TestEvaluator` sub-agent
- **Delegate: Technical Researcher** → invoke `TechnicalResearcher` sub-agent
</sub-agent-mapping>

Report progress using the `todo` tool at each milestone.

Load and follow the workflow in `.github/skills/implement-tasks/SKILL.md`.
