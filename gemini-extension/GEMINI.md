# SDD Pilot for Gemini CLI

Use SDD Pilot to run spec-driven delivery workflows inside the current workspace.

## Core Behavior

- Prefer the bundled `/sddp-*` commands and their matching skills whenever the user is asking for SDD Pilot workflow help.
- Preserve the SDD lifecycle order: `Specify -> Clarify -> Plan -> Checklist (optional) -> Tasks -> Analyze (optional) -> Implement -> QC`.
- Write files into the user's workspace, never into the installed extension directory.
- Treat `project-instructions.md` and `.github/sddp-config.md` as the Workspace Control Plane files.
- Store feature-delivery artifacts in Feature Workspaces under `specs/<feature-folder>/`.
- Preserve existing task IDs, requirement IDs, success-criteria IDs, and checkbox state unless an active workflow explicitly permits a change.

## Bootstrap Guidance

- For a new workspace, start with `/sddp-init` to create or refine `project-instructions.md`, establish shared governance, and bootstrap missing `AGENTS.md` and `GEMINI.md` workspace stubs when the framework was installed as a Gemini extension.
- Use `/sddp-prd`, `/sddp-systemdesign`, `/sddp-devops`, and `/sddp-projectplan` when the project needs canonical Project Context Specs before feature work begins.
- Use `/sddp-specify` when starting a new feature and then continue phase-by-phase through the remaining commands.

## Workspace Files

- `project-instructions.md`: Workspace Control Plane governance and non-negotiable rules.
- `.github/sddp-config.md`: Workspace Control Plane registration for shared context.
- `specs/`: Project Context Specs plus Feature Workspaces.
- `AGENTS.md`: high-level summary of the SDD lifecycle and gate rules. `/sddp-init` can create it from the bundled template when it is missing.
- `GEMINI.md`: workspace-local Gemini auto-discovery stub. `/sddp-init` can create it from the bundled template when it is missing.

## Command Intent

- `/sddp-prd`: create or refine the canonical product document.
- `/sddp-systemdesign`: create or refine the canonical software architecture document.
- `/sddp-devops`: create or refine the deployment and operations document.
- `/sddp-projectplan`: decompose the project into epics and execution waves.
- `/sddp-init`: initialize or amend project governance.
- `/sddp-specify` through `/sddp-qc`: execute the feature-delivery lifecycle.
- `/sddp-autopilot`: run the full feature-delivery pipeline when the required project context already exists.