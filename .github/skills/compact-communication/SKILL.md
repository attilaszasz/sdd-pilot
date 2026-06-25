---
name: compact-communication
description: "[DEPRECATED — rules moved to AGENTS.md §Communication Style. This file is a deprecation shim only. Do not re-introduce a Read instruction for this path; the rules are ambient context loaded once via AGENTS.md.]"
---

# Compact Communication Contract — DEPRECATED

The runtime communication contract (default rules, preferred output patterns, auto-clarity exceptions, and exact-preservation boundaries) now lives in `AGENTS.md` under `## Communication Style`. That section is loaded once per command as ambient context; no skill or sub-agent should `Read` this file.

This shim is kept so existing external references to the path do not break. The `scripts/drift-report.mjs` strict check fails any PR that re-introduces a `Read .github/skills/compact-communication/SKILL.md` instruction outside this file.
