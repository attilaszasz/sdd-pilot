---
name: init-project
description: "Bootstraps or amends SDD project governance — the non-negotiable project principles and rules that gate all downstream agents. Use when initializing a new project, updating existing principles, or when the user mentions project instructions, governance, or /sddp-init."
---

# Project Initializer Workflow

<rules>
- Always operate on `project-instructions.md` — never create a new file
- Preserve heading hierarchy from the template
- All dates in ISO format (YYYY-MM-DD)
- Principles must be declarative, testable, and free of vague language
- Version changes follow semantic versioning (see instructions-management skill)
- If critical info is missing, insert `TODO(<FIELD>): explanation` and flag in report
- Research industry best practices before drafting — **Delegate: Technical Researcher**
- In AMEND mode, research only changed or newly introduced principles unless the user explicitly requests a full refresh
- If the user attaches or references a product document (markdown file), capture its path and persist it in `.github/sddp-config.md` for use by downstream agents (`/sddp-specify`, etc.)
- If a Technical Context Document is already registered, preserve it during init. If none is registered but the default project SAD exists at `docs/sad.md`, adopt it. Never clear the Technical Context Document path during init.
</rules>

<workflow>

## 0. Acquire Skills

Read `.github/skills/instructions-management/SKILL.md` to understand the update process, versioning rules, consistency propagation, and principles of good instructions writing.

## 1. Detect Mode

Read `project-instructions.md`.

### Case A: First-Time Init (template has placeholder tokens)

- Identify every placeholder token of the form `[ALL_CAPS_IDENTIFIER]`
- The user might need fewer or more principles than the template — adapt accordingly
- Set `MODE = INIT`

### Case B: Amendment (instructions already filled in)

- Identify which sections the user wants to change
- Note the current version from the footer
- Set `MODE = AMEND`

## 2. Collect Values

For each placeholder (INIT) or changed section (AMEND):
- If user input supplies a value: use it
- Otherwise infer from repo context (README, docs, prior versions) — use search tools to discover relevant files
- `LAST_AMENDED_DATE`: today if changes are made
- `INSTRUCTIONS_VERSION`:
  - **INIT mode**: start at `1.0.0`
  - **AMEND mode**: increment per semantic versioning rules:
    - **MAJOR**: Backward-incompatible principle removals or redefinitions
    - **MINOR**: New principle/section added or materially expanded
    - **PATCH**: Clarifications, wording, typos

If version bump type is ambiguous, ask the user to choose from options (MAJOR/MINOR/PATCH) with reasoning before finalizing.

## 2.5. Product Document

Check if the user attached a file or referenced a product document path in their input or the conversation.

1. **Detect**: Look for file attachments, explicit file paths (e.g., `docs/product-brief.md`, `prd.md`), or mentions of a "product document", "product brief", "PRD", "Product Requirement Document", or similar.
2. **Ask if not detected**: Ask the user:
   - **Header**: "Product Doc"
   - **Question**: "Do you have a product document (markdown) that describes your product? This will be used as context in future `/sddp-specify` runs."
   - **Options**: "No product document" (recommended) + free-form input enabled for entering a path.
3. **If a path is provided**:
   - Validate the file exists by attempting to read it.
   - If the file does not exist or is not readable, warn the user and proceed without it.
   - If valid, store the path in `.github/sddp-config.md` under the `## Product Document` section by setting the `**Path**:` field.
4. **If no product document**: Ensure `.github/sddp-config.md` exists with an empty `**Path**:` field (create if missing, or leave as-is if already present).

The product document path is persisted as a reference — the original file is read on demand by downstream agents. If the file moves or is deleted later, those agents will handle the error gracefully.

## 2.6. Technical Context Document

Preserve or adopt the project-level Technical Context Document before research.

1. Ensure `.github/sddp-config.md` exists before final write-back.
2. If `.github/sddp-config.md` exists, parse `## Technical Context Document` → `**Path**:`.
3. If the parsed path is non-empty:
  - Preserve it unchanged by default.
  - If the default project SAD exists at `docs/sad.md` and differs from the registered path:
    - Ask the user whether to keep the existing path or adopt the default project SAD.
    - Recommend adopting the default project SAD only when it is substantive and the user wants the system-design output to become canonical.
4. If the parsed path is empty or the config does not exist, and the default project SAD exists at `docs/sad.md`:
  - Adopt it by setting `## Technical Context Document` → `**Path**:` to `docs/sad.md`.
5. If the existing registered path is unreadable or missing but the default project SAD exists at `docs/sad.md`:
  - Warn the user.
  - Recommend adopting the default project SAD.
6. Never remove a populated Technical Context Document path during init.

The Technical Context Document remains a reference path. Its content is read on demand by downstream agents.

## 3. Research Best Practices

Set research scope by mode:
- **INIT mode**: research all proposed principle areas.
- **AMEND mode**: research only modified/new principles and governance sections.
- If an unchanged principle already has sufficient rationale in the current instructions, reuse it without re-research.

Before delegating, report to the user: "🔍 Researching industry standards for project principles — this may take 15–30 seconds."

**Delegate: Technical Researcher** (see `.github/agents/_technical-researcher.md` for methodology):
- **Topics**: Only the scoped areas above (changed/new in AMEND; all in INIT), with relevant industry standards (e.g., testing strategies, CI/CD patterns, code review processes, documentation standards, 12-Factor App, OWASP, Google SRE practices).
- **Context**: The feature/project description from the user input. If a product document was registered in Step 2.5, read it and include a summary of its key points (product vision, domain, target audience, constraints) as additional context. If a Technical Context Document was preserved or adopted in Step 2.6, read it and include a short summary of the established architecture/stack constraints as additional context.
- **Purpose**: "Strengthen principle rationale and align rules with industry-recognized patterns."

Incorporate the research findings into the drafted principles. Cite sources where appropriate.

## 4. Draft Updated Content

- Replace every placeholder with concrete text (no bracketed tokens left)
- Preserve heading hierarchy
- Each Principle: succinct name, non-negotiable rules, explicit rationale
- Governance section: amendment procedure, versioning policy, compliance expectations
- Comments can be removed once replaced, unless they still add guidance

## 5. Consistency Check

**Delegate: Configuration Auditor** (see `.github/agents/_configuration-auditor.md` for methodology):
- **Input**: The full text of the drafted Project Instructions.
- **Task**: Validate the new Project Instructions against project templates and update any that reference outdated principles.

The audit will produce a Sync Impact Report summarizing version changes, modified principles, and template updates.

## 6. Validation

- Review the Sync Impact Report.
- Include the report in your response to the user.
- Verify:
  - No unexplained bracket tokens remaining
  - Version line matches report
  - Dates in ISO format
  - Principles use MUST/SHOULD with rationale (no "should" without justification)

## 7. Write and Report

Write updated project instructions to `project-instructions.md`.

Output:
- Mode used (INIT or AMEND) and what was changed
- New version and bump rationale
- Product document: path if registered, or "none" if skipped
- Technical Context Document: path if preserved/adopted, or "none"
- Files flagged for manual follow-up
- Next step: instruct the user to commit current changes first using the suggested commit message, then:
  - if no Technical Context Document is registered, recommend the optional `/sddp-systemdesign` step before feature delivery
  - create a feature branch (`git checkout -b #####-feature-name`)
  - start `/sddp-specify` — compose a useful suggested prompt for the user based on the current context
  - Replace `#####-feature-name` with a concrete proposed branch name inferred from available context (user input, product document, project description, or conversation). Use the conventional format: a short numeric prefix (e.g., `00001`) followed by a kebab-case feature slug (e.g., `00001-user-authentication`). If the next feature is not yet known, infer a reasonable first feature from the product document or project goals.
- Include a brief feature-description guide to help the user write a good `/sddp-specify` prompt:
  ```
  A good `/sddp-specify` prompt describes **what** and **who**, not **how**:
  - ✅ "Users can register and log in with email and password"
  - ✅ "Admins can export monthly sales reports as CSV"
  - ❌ "Build a REST API with JWT auth" (too implementation-focused)
  - ❌ "Build the app" (too vague)
  ```
- Suggested commit message for the commit above (e.g., `docs: init project instructions v1.0.0` or `docs: amend project instructions to vX.Y.Z`)

</workflow>
