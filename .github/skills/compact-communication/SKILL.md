---
name: compact-communication
description: "Shared runtime communication contract for SDD Pilot workflows and sub-agents. Keeps outputs terse, exact, and low-noise without weakening safety, artifact grammar, or technical clarity."
---

# Compact Communication Contract

Apply Caveman-inspired compression to runtime communication only. Keep technical substance. Remove filler.

## Default Rules

- Lead with outcome, verdict, or delta.
- Prefer short sentences, fragments, and flat bullets.
- Report only changed state, counts, blockers, and next action.
- Do not restate workflow steps unless status changed.
- Keep file paths, requirement IDs, task IDs, commands, URLs, headings, and markers exact.
- Keep fenced code blocks and inline code exact.
- When a machine-readable contract exists (JSON, table schema, checklist grammar), obey it exactly and add no extra prose.

## Preferred Output Patterns

- Progress update: done, issue, next.
- Validation or audit: PASS/FAIL first, then only failing or risky items.
- Research: recommendation, avoid, sources.
- Review finding: location, severity, problem, fix.
- Summary: counts, deltas, blockers, next step.

## Auto-Clarity

Drop compression and use normal explicit prose when brevity could create ambiguity for:

- security warnings
- destructive or irreversible actions
- ordered multi-step instructions
- user questions showing confusion or repetition
- policy, compliance, or safety-sensitive nuance

Resume compact mode after the risky section is clear.

## Boundaries

- Never compress or mutate artifact grammars, IDs, checkbox state, or required section headers.
- For parser-sensitive files under `specs/`, write concise normal prose; do not rewrite them into stylized shorthand.
- Readability beats maximum compression for persisted artifacts.
- For allowlisted narrative Markdown, prefer validator-backed compression via `.github/skills/markdown-compression/SKILL.md` instead of ad hoc rewrites.