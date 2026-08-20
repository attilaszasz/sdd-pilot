# `/sddp-prd` User Guide

`/sddp-prd` creates or refines the canonical Product Requirements Document. With no mode flag, it uses the quick path.

## Choose a Mode

| Situation | Command |
|-----------|---------|
| Product, users, problem, and scope are mostly known | `/sddp-prd <product description>` |
| Same as quick mode, but external research is unwanted | `/sddp-prd --skip-research <product description>` |
| Important evidence, scope, or stakeholder decisions are unresolved | `/sddp-prd --discover <product description>` |
| Continue a paused discovery session | `/sddp-prd --resume <new answers or context>` |

Quick mode may ask up to two focused question batches. Discovery mode persists decisions between sessions and waits for explicit answers at decision checkpoints.

## Example 1: Simple Internal Tool

The product is already well understood, so use the default quick path.

```text
/sddp-prd Create "LeaveTrack", an internal web app for employees to request leave and managers to approve it. The first release covers requests, approval, balances, and email notifications. Success means reducing manual HR processing by 50%.
```

Expected result:

- The agent asks only for missing high-impact details.
- It creates and registers `specs/prd.md`.
- No discovery or research artifact is created.
- The PRD can become `planning-ready` when all required product context is concrete.

## Example 2: Small Product Without External Research

Use `--skip-research` when the organization already owns the necessary evidence or when external browsing is inappropriate.

```text
/sddp-prd --skip-research Create a booking portal for our three rehearsal studios. Customers choose a room and time, staff manage closures, and payments remain out of scope. Use the attached customer survey as the only evidence source.
```

The agent uses repository and user-provided context, records unsupported claims as assumptions or open questions, and does not delegate external research.

## Example 3: Multi-Sided Marketplace

The product has several user groups and unresolved scope, so start discovery.

```text
/sddp-prd --discover Explore a marketplace that connects independent chefs with offices ordering team lunches. We have not decided whether delivery is handled by chefs, couriers, or the offices. Buyers want predictable timing, while chefs want flexible menus and minimum order sizes.
```

Expected discovery work:

- Frame the needs of office buyers, diners, chefs, and operators.
- Separate evidence from hypotheses.
- Compare coherent delivery and release-scope options.
- Record explicit decisions with stable `PDD-###` IDs.
- Keep provisional capabilities out of the final `CAP-###` map until selected.

The session writes `specs/prd-discovery.md`. If external research runs, it also writes `specs/prd-research.md`.

## Example 4: Regulated, High-Consequence Product

Use discovery when stakeholder authority, evidence quality, compliance, or operational risk can materially change the product.

```text
/sddp-prd --discover Define a remote medication-adherence service for older adults. Patients, caregivers, clinicians, compliance, and support teams have different needs. We need to decide whether the first release provides reminders only or also shares adherence signals with clinicians. Do not assume regulatory approval or stakeholder consensus.
```

The agent should pause for missing clinical, compliance, privacy, or decision-owner input rather than inventing an answer. A recommendation remains guidance only. Planning stays blocked while matching discovery is active or the PRD remains a draft.

## Example 5: Resume After Stakeholder Input

After a discovery checkpoint, return with the requested evidence or decision.

```text
/sddp-prd --resume Compliance approved reminders and caregiver sharing for the pilot, but clinician dashboards are deferred. The pilot owner accepted a 12-week validation period. Interview notes are in docs/research/pilot-interviews.md.
```

The agent reloads the durable ledger, records the new evidence and decisions, and continues from the persisted stage. It does not restart discovery or renumber existing IDs.

## Example 6: Refine an Existing PRD

Use quick mode for a bounded clarification that does not materially redefine referenced capabilities.

```text
/sddp-prd Clarify that CAP-003 serves regional support managers, and update its outcome metric from monthly adoption to weekly active use. Preserve all existing capability IDs.
```

Before writing, the agent previews material changes and checks project-plan references. If the request removes a referenced capability or changes one already represented by a completed epic, it stops and directs the cross-artifact change to `/sddp-amend`.

## Outputs and Readiness

| Artifact | When it appears |
|----------|-----------------|
| Canonical Product Document, normally `specs/prd.md` | Successful quick or discovery synthesis |
| `specs/prd-discovery.md` | Discovery and resume modes |
| `specs/prd-research.md` | Only when external research runs during discovery |
| `.github/sddp-config.md` registration | After the live PRD passes validation |

`prd_maturity: draft` means the document is structurally valid but still has product-definition gaps. `prd_maturity: planning-ready` means it passed the stricter readiness profile. `/sddp-projectplan` and `/sddp-autopilot` require a planning-ready PRD and no active matching discovery.

## Practical Tips

- Put known users, problems, boundaries, evidence, and success measures in the initial prompt.
- Use explicit file paths when relevant context already exists in the repository.
- Choose `--discover` when decisions depend on stakeholder input or competing scope options.
- Use `--resume` rather than starting over when a discovery ledger exists.
- Treat recommended answers as proposals; provide a free-form answer when the available options do not fit.
