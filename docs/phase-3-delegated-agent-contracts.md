# Phase 3 brief: metadata-driven delegated-agent contracts

## Outcome

Make delegated-agent identity and host availability explicit, immutable, and independently testable. A canonical registry replaces filename and prose inference as the source of truth for agent inventory and expected host wrappers.

Status: complete. The final cross-host audit passes the repository, extracted-release, policy, reachability, and inventory checks listed below.

## Scope

Phase 3 covers the 36 canonical agents under `.github/agents/` and their supported Copilot, Claude, Codex, and OpenCode surfaces.

The first delivery slice:

- defines each agent's stable ID, display name, kind, canonical path, workflow target, required capabilities, and expected host paths;
- records intentional OpenCode-only coordinator agents separately from canonical delegated agents;
- makes drift-report row construction and extra-wrapper detection consume the registry;
- preserves the current drift-report role kind as `workflow` for compatibility;
- fails closed when registry entries diverge from canonical files or supported host inventories.

The second delivery slice:

- makes Claude wrapper target and capability checks consume registered host and canonical paths;
- makes Codex delegate resolution prefer registered names and canonical paths while retaining custom-fixture fallback;
- makes Copilot role selection and methodology allowlists resolve through registered identities;
- makes OpenCode delegate, coordinator, and capability checks consume registered host paths;
- makes wrapper inventory validation derive Claude and Codex expectations from the registry instead of canonical-directory filenames.

The third delivery slice:

- records exact methodology-agent Claude tools and structured parent-handoff policy;
- records exact methodology-agent Codex sandbox mode;
- records exact methodology-agent OpenCode edit, Bash, and deny-all task policy;
- makes host validators reject valid-but-wrong permissions as registry drift;
- exposes normalized execution policy in drift-report agent rows.

The fourth delivery slice:

- records exact OpenCode edit and Bash policy for role and coordinator agents;
- derives their task grants from transitive canonical workflow reachability instead of duplicating delegate arrays in the registry;
- validates all registered role and coordinator policies even when no public command selects the agent;
- corrects missing and excess OpenCode task grants while preserving handwritten behavioral instructions.

The fifth delivery slice:

- compares host tools, sandbox modes, permissions, capabilities, and delegate sets through shared pure adapters;
- keeps parsing, path resolution, synthetic-fixture fallback, and finding text in each host validator;
- adds Copilot and Claude visibility to the rendered delegated-agent matrix without changing its machine-readable surface schema or summary counts.

The closure audit:

- validates every registered Claude wrapper even when no public command currently reaches it;
- validates coordinator identity, path, workflow, uniqueness, and execution policy;
- validates registry-derived agent inventories in extracted Copilot, Claude, Codex, and OpenCode release bundles;
- runs strict drift, cross-host contract tests, release-runtime tests, and the complete test suite.

## Contract decisions

- `.github/agents/*.md` remains the canonical behavioral content for delegated agents.
- Registry metadata owns identity, kind, canonical path, host availability, host path, workflow target, and required capability declarations.
- Methodology agents use underscore-prefixed canonical files and have Claude, Codex, and OpenCode wrappers.
- Role agents use non-prefixed canonical files, target one canonical workflow, and have OpenCode wrappers. Their Copilot files are the canonical agents themselves.
- OpenCode coordinator agents without canonical `.github/agents/` counterparts are explicit registry exceptions, not inferred from workflow prose.
- Role and coordinator task grants are derived from the canonical workflow graph; the registry stores only the derivation policy.
- Shared host-policy adapters compare normalized values only; host parsers and host-specific behavior remain independent.
- The registry validates wrappers; it does not generate or rewrite their behavioral bodies.

## Acceptance criteria

- The registry contains exactly one immutable record for every canonical agent.
- Canonical file paths, names, kinds, workflow targets, and required capabilities match registry metadata.
- Expected Claude, Codex, and OpenCode paths exist exactly where the registry declares them.
- Extracted host bundles contain every applicable registered agent wrapper and OpenCode coordinator.
- Drift-report agent rows are created from registry order and identity rather than directory enumeration.
- The rendered agent matrix shows Copilot, Claude, OpenCode, and Codex status.
- Missing, duplicate, unsupported, or extra agent contracts fail automated validation.
- Strict drift, release-focused tests, and the complete test suite pass.

## Non-goals

- Generating agent wrappers.
- Broadening agent permissions beyond canonical workflow reachability.
- Renaming canonical agents or host wrappers.
