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
- If the user attaches or references documents (product doc, architecture/tech context doc) or a folder containing them, discover and persist their paths in `.github/sddp-config.md` for use by downstream agents (`/sddp-specify`, `/sddp-plan`, `/sddp-autopilot`, etc.)
- When no folder is explicitly provided, default to scanning `docs/` — but always confirm with the user before registering auto-discovered documents
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

## 2.5. Document Discovery

Discover and register the **Product Document** and the **Technical Context Document** (architecture / tech stack). This step handles three input shapes: a folder, a single file, or nothing.

### Step 1 — Classify input

Examine the user's message for file attachments, explicit paths, or mentions of documents / folders.

- **Folder detected** (the path is a directory — e.g., `docs/`, `./documentation`, `/docs`): set `SCAN_DIR` to that folder, `SCAN_SOURCE = explicit`.
- **Single file detected** (one markdown file attached or referenced): skip to **Step 7**.
- **Nothing detected**: set `SCAN_DIR = docs/` (project-relative), `SCAN_SOURCE = default`.
  - If `docs/` does not exist → skip to **Step 5**.

### Step 2 — Recursive folder scan

Enumerate all `.md` files recursively under `SCAN_DIR`. If zero `.md` files are found → skip to **Step 5**.

### Step 3 — Classify files (filename-first, content-fallback)

Run two classification passes over the discovered files.

**Pass 1 — Filename keywords** (case-insensitive, match against the basename):
- Product doc signals: `product`, `prd`, `brief`, `requirements`, `overview`
- Tech context signals: `architecture`, `tech-context`, `tech-stack`, `technical`, `infrastructure`, `stack`, `system-design`

Score each file: +1 per keyword match. Assign the file to the category with the higher score. If tied or zero matches → move the file to Pass 2.

**Pass 2 — Content fallback** (only for files unclassified by Pass 1):
- Read the first 200 lines of each unclassified file.
- Apply the same sufficiency categories used by the autopilot document gate (see `autopilot-pipeline/SKILL.md`):
  - **Product doc** (≥3 of 5): vision/purpose, audience/actors, domain context, scope/boundaries, success measures
  - **Tech context** (≥3 of 5): language/runtime, frameworks/libraries, storage/database, infrastructure/deployment, architecture/patterns
- Assign the file to whichever type it passes (≥3 categories). If it qualifies for both → assign to the type with the higher category count.

**Auto-pick best match**: For each document type, select the file with the highest score. If one file is the top candidate for both types, assign it to its strongest type and select the next-best file for the other type.

### Step 4 — Confirm or auto-register

- **`SCAN_SOURCE = explicit`** (user explicitly provided a folder):
  - Report findings: "Found: Product Doc → `<path>`, Tech Context → `<path>`" (or "not found" for either).
  - Register both in `.github/sddp-config.md` without asking for confirmation.
- **`SCAN_SOURCE = default`** (auto-scanned `docs/`):
  - Report findings and **ask the user to confirm**:
    - **Header**: "Docs Discovery"
    - **Question**: "I found these documents in `docs/`:\n• Product Document: `<path>` (or none)\n• Technical Context: `<path>` (or none)\nShould I register them?"
    - **Options**: "Yes, register both" (recommended), "Let me choose manually" (free-form input enabled for entering paths), "Skip — no documents"
  - If "Let me choose manually" → accept user-provided paths and validate each.
  - If "Skip" → proceed without documents.
- **Autopilot guard (I2)**: If `AUTOPILOT = true`, skip all confirmation prompts. Auto-register whatever was found and log each decision (path + classification) to `FEATURE_DIR/autopilot-log.md`.

### Step 5 — Ask user (fallback)

Reached when no folder was found/scanned or the scan produced zero documents.

Ask a single combined question:
- **Header**: "Project Documents"
- **Question**: "Do you have a docs folder or individual document files? These help downstream agents (`/sddp-specify`, `/sddp-plan`, `/sddp-autopilot`) produce better output.\n• Product Document — describes your product (vision, audience, scope)\n• Technical Context — describes architecture, tech stack, constraints"
- **Options**: "No documents" (recommended) + free-form input enabled for entering a folder path or individual file path(s).

If the user provides a path → loop back to **Step 1** to classify it.

- **Autopilot guard (I2)**: If `AUTOPILOT = true`, default to "No documents". Log: "Autopilot: No documents folder detected — skipping document registration." Skip the user prompt.

### Step 6 — Persist

For each registered document path: update `.github/sddp-config.md` under the corresponding `## Product Document` or `## Technical Context Document` section by setting the `**Path**:` field.

For document types where nothing was found: leave the existing `**Path**:` value untouched (do not clear a previously registered path). If `.github/sddp-config.md` does not exist, create it from the default template.

### Step 7 — Single file handling

Reached when the user passed exactly one file (not a folder).

1. Classify the file using **Pass 1** and **Pass 2** from Step 3.
2. If it clearly matches one type (passes ≥3 categories or has filename keyword matches for only one type) → register it for that type, report the classification to the user.
3. If ambiguous (matches both types equally, or matches neither) → ask the user:
   - **Header**: "Document Type"
   - **Question**: "Is `<filename>` a Product Document or a Technical Context Document?"
   - **Options**: "Product Document", "Technical Context Document"
4. **Autopilot guard (I2)**: If `AUTOPILOT = true` and classification is ambiguous, default to **Product Document**. Log: "Autopilot: Ambiguous file `<filename>` — defaulting to Product Document."
5. After classification, persist the path per **Step 6**.

---

Document paths are persisted as references — the original files are read on demand by downstream agents. If a file moves or is deleted later, those agents will handle the error gracefully.

## 3. Research Best Practices

Set research scope by mode:
- **INIT mode**: research all proposed principle areas.
- **AMEND mode**: research only modified/new principles and governance sections.
- If an unchanged principle already has sufficient rationale in the current instructions, reuse it without re-research.

Before delegating, report to the user: "🔍 Researching industry standards for project principles — this may take 15–30 seconds."

**Delegate: Technical Researcher** (see `.github/agents/_technical-researcher.md` for methodology):
- **Topics**: Only the scoped areas above (changed/new in AMEND; all in INIT), with relevant industry standards (e.g., testing strategies, CI/CD patterns, code review processes, documentation standards, 12-Factor App, OWASP, Google SRE practices).
- **Context**: The feature/project description from the user input. If a product document was registered in Step 2.5, read it and include a summary of its key points (product vision, domain, target audience, constraints) as additional context. If a technical context document was also registered, read it and include a summary of its key points (tech stack, architecture, infrastructure, constraints) as additional context.
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
- Documents registered: Product Doc → `<path>` or "none", Tech Context → `<path>` or "none"
- Files flagged for manual follow-up
- Next step: instruct the user to commit current changes first using the suggested commit message, then create a feature branch (`git checkout -b #####-feature-name`), then start `/sddp-specify` — compose a useful suggested prompt for the user based on the current context
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
