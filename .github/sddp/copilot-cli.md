# Copilot CLI command dispatch

Use this adapter only after the user explicitly invokes an SDDP command skill. Do not select command skills automatically for general requests.

Read the referenced `.github/prompts/` file as command instructions, not as a CLI-discoverable prompt. Preserve its workflow reset, input handling, mutation policy, delegate references, and canonical workflow. Its `agent` frontmatter selects a VS Code role; it does not switch the CLI agent.

Execute the canonical workflow in the current CLI session. Use Copilot CLI's native file, shell, search, and user-question tools instead of VS Code tool identifiers. Set `$ARGUMENTS` to the text supplied after the skill invocation, or empty when omitted.

When the workflow says **Delegate**, launch a CLI sub-agent with the exact referenced agent file's task, inputs, execution rules, and output contract. Translate VS Code tool names to available CLI capabilities without broadening read-only or mutation restrictions. Do not rely on VS Code-only role profiles or their `agents` allowlists being active in CLI, and do not silently perform delegated work inline.

When `AUTOPILOT = false`, ask the user at decision points and wait for an explicit answer; recommendations are not consent. When `AUTOPILOT = true`, preserve the canonical automatic-decision and safety rules. Report concise progress at major milestones.
