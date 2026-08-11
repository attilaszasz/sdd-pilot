---
name: markdown-compression
description: "Safely compresses narrative Markdown using deterministic compaction plus validator checks. Only for allowlisted and gated artifacts."
---

# Markdown Compression

Use this only for safe narrative Markdown or explicitly gated governance prose. This is not a general rewrite tool.

## Safe Targets

- `README.md`
- `docs/**/*.md`
- `specs/<feature>/research.md`
- `specs/<feature>/analysis-report.md`
- `specs/<feature>/manual-test.md`

## Gated Targets

- `.github/skills/implement-tasks/SKILL.md` - exact manifest entry; compresses only prose inside `<rules>` and `<workflow>` blocks
- all other governance files require a separate manifest entry and dry-run review before compression

## Blocked Targets

- `project-instructions.md`, `AGENTS.md`, `CLAUDE.md`
- all unlisted workflow, agent, instruction, and wrapper Markdown under `.github/`, `.agents/`, `.claude/`, `.windsurf/`, `.opencode/`, `.codex/`
- `specs/prd.md`, `specs/sad.md`, `specs/dod.md`, `specs/project-plan.md`, `specs/adrs/*.md`, `specs/plan/*.md`
- feature-workspace parser-sensitive artifacts: `spec.md`, `plan.md`, `tasks.md`, `qc-report.md`, `checklists/*.md`, `autopilot-log.md`

## Process

1. Run `node scripts/compress-markdown.mjs --check <path>` to confirm the path is allowlisted or explicitly gated and validator-safe.
2. For preview only, run `node scripts/compress-markdown.mjs --stdout <path>`; gated targets automatically use narrative-only mode.
3. Review the proposed diff. For a manual narrative-only preview, add `--narrative-only`.
4. To write the compressed file, run `node scripts/compress-markdown.mjs <path>`.
5. Run `node scripts/compress-markdown.mjs --idempotent <path>` after writing and in CI.
6. The script creates `<name>.original.md` once, then preserves it on later runs.
7. If validation fails, stop. Do not write partial output.

## Validation Guarantees

The validator preserves these elements exactly:

- frontmatter
- headings
- fenced code blocks
- inline code
- bare URLs and Markdown links
- requirement and task identifiers
- table rows
- checkbox lines
- Markdown list prefixes and indented lines
- HTML comment blocks
- `<rules>` and `<workflow>` tag lines
- every line outside gated narrative blocks

## Compression Rules

- Trim filler and redundant phrasing only.
- Keep commands, paths, and structural lines exact.
- Compress governance prose only inside the explicitly supported narrative blocks.
- Prefer concise normal prose, not stylized shorthand, for persisted files.

## Fallback

- If Node is unavailable, do not auto-compress.
- If the target is blocked, leave it unchanged and tighten the source workflow instructions instead.
