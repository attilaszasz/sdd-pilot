# SDD Pilot Glossary

## Workflow

- **Spec-driven development (SDD):** A delivery approach that defines what to build in a specification before planning or writing code.
- **Project bootstrap:** Optional work that establishes shared product, technical, operational, and project-planning context before feature delivery.
- **Feature delivery lifecycle:** The ordered workflow: Specify, Clarify, Plan, optional Checklist, Tasks, optional Analyze, Implement, and QC.
- **Phase gate:** A required artifact or validator result that must pass before the next lifecycle phase begins.
- **Autopilot:** The explicitly authorized mode that runs the complete feature-delivery lifecycle without waiting for interactive decisions.
- **Implement+QC loop:** An optional command that repeats implementation and quality control until QC passes or its iteration limit is reached.
- **Feature workspace:** A feature's artifacts under `specs/<feature-folder>/`, normally named after a `#####-feature-name` branch.
- **Product discovery:** The optional, resumable PRD workflow that gathers evidence, stakeholder input, scope decisions, and open questions before product synthesis.
- **Shared skill:** Tool-agnostic workflow logic used by the commands and agents for a lifecycle phase.
- **Agent role:** The specialized responsibility assigned to a workflow phase, such as Product Manager, Software Architect, or Quality Controller.

## Core Artifacts

- **Product Requirements Document (PRD):** The canonical product context, normally `specs/prd.md`, containing prioritized capabilities and product decisions.
- **Software Architecture Document (SAD):** The canonical technical context, normally `specs/sad.md`, describing architecture, flows, quality attributes, and ADRs.
- **Deployment & Operations Document (DOD):** The canonical operational context, normally `specs/dod.md`, describing deployment and operational expectations.
- **Project Implementation Plan:** The canonical project-level epic plan at `specs/project-plan.md`.
- **Project instructions:** The repository's governing rules in `project-instructions.md`, including technology, quality, and workflow requirements.
- **SDDP configuration:** The shared registration and pipeline settings in `.github/sddp-config.md`.
- **Planning-ready:** A PRD or SAD maturity state that satisfies the stricter validation profile required for project planning and Autopilot.
- **Draft:** A structurally valid PRD or SAD that still has unresolved context needed for planning readiness.
- **Feature specification (`spec.md`):** The feature's user stories or objectives, requirements, assumptions, risks, implementation signals, and success criteria.
- **Spec type:** The specification category: product, technical, or operational. It determines whether the document uses user stories or objectives and its required sections.
- **Implementation plan (`plan.md`):** The feature's technical approach, architecture decisions, project structure, requirement coverage map, and acceptance test stubs.
- **Task list (`tasks.md`):** The ordered, phased implementation work for a feature.
- **Quality-control report (`qc-report.md`):** The record of tests, linting, security checks, coverage, and requirements traceability performed during QC.
- **Checklist:** An optional requirements-quality review under `checklists/` that must be completed before implementation unless the user explicitly overrides it.
- **Architecture Decision Record (ADR):** A standalone MADR file under `specs/adrs/` that records a project-level architecture decision and its rationale.
- **Research artifact (`research.md`):** Optional feature-level research that records technical decisions and their supporting evidence.
- **Data model (`data-model.md`):** An optional feature artifact defining entities, fields, and relationships.
- **Contract (`contracts/`):** An optional feature artifact defining an API or other interface that implementation must satisfy.
- **Manual test (`manual-test.md`):** A conditional test script used when automated checks cannot fully validate an interactive or visual behavior.

## Requirements And Traceability

- **User story:** A product-facing, independently testable need in a product feature specification, identified as `US#` and prioritized `P1`, `P2`, or `P3`.
- **Objective:** An independently testable technical or operational outcome in a non-product feature specification, identified as `OBJ#` and prioritized `P1`, `P2`, or `P3`.
- **Requirement:** A concrete obligation owned by one user story or objective. Product requirements use `FR-###`; technical, operational, and reliability requirements use `TR-###`, `OR-###`, and `RR-###`.
- **Capability:** A prioritized product outcome in the PRD, identified as `CAP-###`, that informs project planning and feature work.
- **Success criterion:** A measurable, technology-agnostic outcome for a story or objective, identified as `SC-###`.
- **P1:** The highest priority. P1 stories or objectives define the viable MVP and require concrete acceptance criteria and task coverage.
- **P2 and P3:** Lower-priority stories or objectives that follow P1 work when scope and capacity allow.
- **Requirement Coverage Map:** The `plan.md` table that maps each requirement to implementation file paths and symbols.
- **Acceptance test stub:** A planned P1 test that starts in a failing or pending state and turns green only when its requirement is implemented.
- **Traceability:** The links from stories and requirements through plans, tasks, code, tests, and QC evidence.
- **Task dependency:** An `after:T###` annotation that prevents a task from starting until the named task is complete.
- **Parallel task:** A task marked `[P]` that may run alongside independent work in the same phase.
- **Import/export contract:** Task annotations that identify a produced symbol and the downstream task that consumes it, enabling early compatibility checks.
- **VERIFY annotation:** A `[VERIFY: <command>]` task annotation that declares a command which must pass before the task is marked complete.

## Validation And Completion

- **Spec Validator:** The mandatory Spec-to-Plan validator. It checks specification completeness, P1 acceptance criteria, unresolved clarification markers, and stress-test findings.
- **Plan Validator:** The mandatory Plan-to-Tasks validator. It checks P1 requirement coverage, architecture-decision references, and declared dependency installability.
- **Tasks Validator:** The mandatory Tasks-to-Implement validator. It checks task grammar, phase structure, dependency cycles, P1 coverage, size limits, and checked-task provenance.
- **Instructions Check:** The `plan.md` assessment that confirms the planned work complies with `project-instructions.md`.
- **Quality control (QC):** The final lifecycle phase, which validates implemented work against tests, static analysis, security checks, and feature requirements.
- **`.completed`:** A feature-workspace marker created by Implement only after all tasks are complete with no unresolved CRITICAL or ERROR bugs.
- **`.qc-passed`:** A feature-workspace marker created by QC only after the QC report, evidence digests, Git baseline, and repository-state digest validate.
- **Release ready:** The state reached when a valid `.qc-passed` marker exists.
- **BUG task:** A task added after QC identifies a defect. It records a severity, requirement, category, description, and affected file location.
- **Review finding (`.review-findings`):** Structured implementation-review evidence that QC preserves and uses to prioritize verification.

## Supporting Concepts

- **Clarification marker:** A `[NEEDS CLARIFICATION: ...]` item in a specification that records an unresolved user decision. It can be resolved only with user-approved input.
- **Stress-test finding:** A ranked `STF-###` finding from adversarial specification review that identifies a contradiction, boundary risk, or concurrent-trigger ambiguity.
- **MADR:** Markdown Any Decision Records, the format used for standalone architecture decision records.
- **Canonical document:** The single registered source of truth for a project context document. A non-empty path in `.github/sddp-config.md` is authoritative.
- **Workspace control plane:** Repository-root governance and coordination files, including `project-instructions.md`, `AGENTS.md`, and `.github/sddp-config.md`.
- **Framework internals:** The agents, skills, instructions, and tool-specific wrappers that implement SDD Pilot's workflows.
- **Drift report:** Output from `scripts/drift-report.mjs` that detects missing, stale, or divergent workflow wrappers and runtime contracts.
- **Wrapper:** A tool-specific command or agent file that exposes the shared SDD Pilot workflows in GitHub Copilot, OpenCode, Codex, Claude Code, Antigravity, or Windsurf.
- **Runtime output contract:** The compact, outcome-oriented communication rules shared by SDD Pilot workflows and sub-agents.
