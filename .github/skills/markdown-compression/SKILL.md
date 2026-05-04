---
name: markdown-compression
description: "Safely compresses narrative Markdown using deterministic compaction plus validator checks. Only for allowlisted non-parser-sensitive artifacts."
---

# Markdown Compression

Use this only for safe narrative Markdown. This is not a general rewrite tool.

## Safe Targets

- `README.md`
- `docs/**/*.md`
- `specs/<feature>/research.md`
- `specs/<feature>/analysis-report.md`
- `specs/<feature>/manual-test.md`

## Blocked Targets

- `project-instructions.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`
- all workflow, agent, instruction, and wrapper Markdown under `.github/`, `.agents/`, `.claude/`, `.windsurf/`, `.opencode/`, `.codex/`
- `specs/prd.md`, `specs/sad.md`, `specs/dod.md`, `specs/project-plan.md`, `specs/adrs/*.md`
- feature-workspace parser-sensitive artifacts: `spec.md`, `plan.md`, `tasks.md`, `qc-report.md`, `checklists/*.md`, `autopilot-log.md`

## Process

1. Run `node scripts/compress-markdown.mjs --check <path>` to confirm the path is allowlisted and validator-safe.
2. For preview only, run `node scripts/compress-markdown.mjs --stdout <path>`.
3. To write the compressed file, run `node scripts/compress-markdown.mjs <path>`.
4. The script creates `<name>.original.md` once, then preserves it on later runs.
5. If validation fails, stop. Do not write partial output.

## Validation Guarantees

The validator preserves these elements exactly:

- headings
- fenced code blocks
- inline code
- bare URLs and Markdown links
- requirement and task identifiers
- table rows
- checkbox lines

## Compression Rules

- Trim filler and redundant phrasing only.
- Keep commands, paths, and structural lines exact.
- Prefer concise normal prose, not stylized shorthand, for persisted files.

## Fallback

- If Node is unavailable, do not auto-compress.
- If the target is blocked, leave it unchanged and tighten the source workflow instructions instead.