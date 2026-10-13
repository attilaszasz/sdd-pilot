# SDD Pilot framework development

This checkout contains the framework source, not an installed downstream project. Maintain the framework directly; downstream lifecycle gates do not govern framework development.

## Command guard

If the user requests execution of any `/sddp-*` command while this file is loaded, stop before running scripts, delegating agents, or modifying artifacts. Warn:

> SDD command blocked: framework-development AGENTS.md is loaded. Run this command in a downstream project installed from an SDD Pilot release archive, or in a staged consumer test fixture.

Discussing, reviewing, editing, or testing command implementations is allowed. A command name quoted in documentation or a test is not an execution request. Do not load the downstream instructions into this session to bypass the guard.

## Source layout

- `.github/sddp/workflows/`: canonical command orchestration.
- `.github/skills/` and `.github/agents/`: shared references and delegated roles.
- `.agents/`, `.claude/`, `.codex/`, `.opencode/`, `.windsurf/`, and `.github/prompts/`: host wrappers. Preserve cross-host behavior when changing commands.
- `scripts/` and `tests/`: Node.js runtime, release tooling, and contract tests. Use Node.js 22 or newer.
- `templates/downstream/AGENTS.md`: downstream runtime context, installed as root `AGENTS.md` in every release archive. Preserve its contracts independently of this file.
- `project-instructions.md`: downstream governance template, not framework-development policy.

## Maintenance

Keep canonical workflows and host wrappers consistent. Preserve artifact grammars, traceability IDs, and existing consumer behavior unless the requested change explicitly alters them. Never edit downstream fixture artifacts to hide a failing test.

Run `node --test tests/*.test.mjs` and `node scripts/drift-report.mjs --context source --output .build/drift-report --strict` after changes. For release changes, test all six host archives and their installed runtime context. Test pipeline execution in staged consumer projects, not this source checkout.

Keep developer instructions and source-only templates out of release archives. Do not publish, push, or tag a release without user authorization. Report changed behavior, test results, and remaining blockers concisely.
