---
name: writing-quality
description: "Removes common AI writing patterns while preserving meaning, evidence, structure, and SDDP traceability. Ambient through AGENTS.md; not directly invokable."
---

# Writing quality

> Runtime primer: `AGENTS.md` section `Communication Style` under `Writing Quality`. This file expands the editing rules and safety limits. It is not a required read during ordinary workflow execution.

Adapted from the user-provided Unslop rules.

## Purpose

Edit prose so it sounds direct, specific, and written for this project. Remove stock AI phrasing without making the text sterile or changing what it claims.

Preserve meaning, scope, certainty, evidence, citations, and the user's voice. Style work never authorizes a new requirement, stronger claim, resolved ambiguity, changed priority, or removed caveat.

## Process

1. Scan newly written or changed prose for the patterns below.
2. Rewrite only the affected narrative spans. Match the intended tone.
3. Add human judgment where the format allows it. Be specific, vary sentence length, and use first person when it fits.
4. Ask, "What makes this obviously AI generated?" Fix any remaining tells.
5. Run the owning structural validator after the writing pass.

## Safety limits

Never run a whole-file style rewrite over SDDP artifacts or governance files. In parser-sensitive files, edit only narrative spans created or changed by the current task.

Preserve these elements exactly unless the workflow explicitly owns their change:

- frontmatter, headings, required section order, tables, and column schemas
- checkbox lines and state
- IDs, priorities, markers, tags, paths, commands, URLs, and citations
- code fences, inline code, Mermaid, JSON, JSONL, YAML, OpenAPI, and GraphQL
- quoted user or source text
- uncertainty and legal, security, policy, or compliance language
- append-only history in `autopilot-log.md` and `divergence-log.md`

Do not use writing quality to resolve `[NEEDS CLARIFICATION]`, alter acceptance criteria, reorder priorities, or mutate artifact grammars. ADR files remain writable only through the ADR Author.

If deterministic Markdown compression also applies, use this order:

1. Complete the writing-quality pass.
2. Run validator-backed Markdown compression.
3. Run the artifact's structural validator.

## Voice

- State an opinion when the document calls for judgment. Do not manufacture one for factual or machine-readable output.
- Vary rhythm. Mix short sentences with longer ones that need the room.
- Acknowledge real tradeoffs instead of flattening them into neutral lists.
- Use `I` when first person fits the speaker and format.
- Prefer concrete facts, mechanisms, examples, and measured values.
- Keep natural structure. Do not force every point into a polished three-part list.

## Patterns to remove

### Content

- Puffery such as "pivotal moment", "testament to", "evolving landscape", or "setting the stage". State what happened.
- Promotional words such as "vibrant", "breathtaking", "groundbreaking", "renowned", or "must-visit". Use a factual description.
- Vague attribution such as "experts believe" or "reports suggest". Name the source or remove the claim.
- Name-dropping without context. Keep the source that matters and state what it reported.
- Superficial `-ing` clauses such as "highlighting", "showcasing", or "fostering". Delete them or explain the concrete effect.
- Formulaic challenge language such as "despite challenges, it continues to thrive". Name the problem and result.

### Language

- Stock words such as "additionally", "crucial", "delve", "enhance", "interplay", "intricate", "pivotal", "showcase", "tapestry", "testament", "underscore", and abstract "landscape". Use plain words.
- Inflated substitutes for `is` or `has`, including "serves as", "stands as", "boasts", and "features".
- "Not just X, but Y." State the point directly.
- Forced groups of three, synonym cycling, and false "from X to Y" ranges.
- Technical-sounding metaphors such as "substrate", "wedge", "vector", "locus", "nexus", noun "primitive", metaphorical "harness", "surface", "bedrock", "scaffolding", "paradigm", "gold-plating", "ratchet", "evacuate", "endgame", "north star", and "flywheel". Name the actual component, action, or limit.

### Style

- Avoid em dashes in prose. End the sentence or use a comma. Do not replace the dash with parentheses or another dash used for the same purpose.
- Use colons for lists or examples, not as routine sentence connectors.
- Do not bold every proper noun, acronym, or list label.
- Avoid inline-header lists that repeat their labels. Keep a lead-in only when the following text adds new information.
- Use sentence case for newly authored narrative headings unless a required template fixes the heading text.
- Remove decorative emoji and use straight quotes in newly authored prose.

### Communication

- Remove chatbot phrases such as "I hope this helps", "Let me know if", "Of course", and "Certainly".
- Answer directly. Do not praise the question or agree with the user before giving the answer.
- Remove empty disclaimers. Find the missing source or omit the unsupported claim.

### Plain speech

- Cut filler. Use "to" instead of "in order to" and "because" instead of "due to the fact that".
- Reduce stacked hedges to the level of uncertainty the evidence supports.
- Replace generic conclusions with a specific fact, decision, or next action.
- Say what a mechanism does. If a sentence could appear unchanged in another project's docs, make it project-specific or cut it.
- Split dense sentences. Prefer one idea per sentence when clauses make the reader backtrack.
- Prefer active voice when the actor matters and is known.
- Cut adverbs that prop up weak verbs. Use a stronger verb or a measured value.
- Prefer plain words: `use`, `help`, `many`, and `if` instead of `utilize`, `facilitate`, `numerous`, and `in the event that`.

## Output check

The pass succeeds when the prose is concrete, natural, and no less accurate than the source. If a cleaner sentence changes meaning or weakens a required safeguard, keep the original meaning and rewrite again.
