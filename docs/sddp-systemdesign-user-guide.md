# `/sddp-systemdesign` User Guide

`/sddp-systemdesign` creates or refines the canonical Software Architecture Document (SAD). It automatically adjusts the collaboration depth and architecture views to the system's complexity.

## How Complexity Works

You do not select a complexity mode. The agent classifies the system from concrete signals in the prompt, Product Document, repository, and existing architecture files.

| Classification | Typical signals | Expected interaction |
|----------------|-----------------|----------------------|
| Simple | One domain, one or two runtimes, one store, few integrations | Focused questions only when major choices are unresolved |
| Compound | Several boundaries, deployables, stores, integrations, or asynchronous paths | Approve the proposed decomposition and major flow inventory |
| Complex | Distributed ownership, regulated data, multi-region behavior, strict recovery, migration, or streaming | Compare decomposition alternatives, approve critical flows, and review the full architecture candidate |

Complexity is about architectural coupling and consequences, not team size or code volume.

## Example 1: Simple Internal Application

This system has one business domain, one application runtime, one database, and one external notification service.

```text
/sddp-systemdesign Design the architecture for LeaveTrack, an internal leave-request web app. Use TypeScript, a single Node.js application, PostgreSQL, and our existing email provider. About 500 employees will use it. Deployment is one Linux container in our existing cloud account.
```

Expected result:

- The agent normally classifies the system as `SIMPLE`.
- It may ask about authentication, availability, or source layout if those details are missing.
- The SAD contains C4 Context and Container views plus a sequence diagram for the primary request/approval flow.
- The agent avoids unnecessary services, component views, and ADRs.

## Example 2: Compound B2B SaaS

This product has several clear boundaries, separate data ownership, external integrations, and asynchronous processing.

```text
/sddp-systemdesign Design a multi-tenant invoicing platform for small agencies. Separate billing, document generation, and customer notification responsibilities. PostgreSQL stores tenant and invoice data, generated PDFs use object storage, payments go through Stripe, and invoice delivery is asynchronous. The first target is 2,000 tenants in one region.
```

Expected collaboration:

- The agent is likely to classify the system as `COMPOUND`.
- It proposes a recommended decomposition and one credible alternative. For example, a modular service may be compared with independently deployed billing and document workers.
- You approve or revise responsibilities, data ownership, interfaces, dependencies, and deployment independence before technology details are finalized.
- You approve major flows such as invoice creation, payment confirmation, PDF generation, and failed delivery recovery.

Likely diagrams include a C4 overview, a sequence diagram for invoice creation, and a flowchart for asynchronous document generation and delivery.

## Example 3: Complex Regulated Platform

Regulation, sensitive data, trust boundaries, regional isolation, and strict recovery make this architecture complex even if the initial user count is modest.

```text
/sddp-systemdesign Design a remote patient-monitoring platform for EU and US clinics. Medical observations arrive from home devices, clinicians review alerts, and support staff troubleshoot connectivity without seeing clinical data. Patient data must remain in its region. The service needs auditable access, tenant isolation, an RPO below 15 minutes, and regional failover. Existing hospital integrations use both FHIR APIs and scheduled files.
```

Expected collaboration:

- The agent classifies the system as `COMPLEX` regardless of initial scale.
- The decomposition checkpoint focuses on regional ownership, clinical versus support boundaries, identity propagation, integration isolation, and whether a boundary truly needs an independent service.
- The flow checkpoint covers ingestion, alerting, clinician access, support diagnostics, retention/deletion, cross-region restrictions, replay, and disaster recovery.
- The final preview exposes unresolved compliance assumptions and ADR-worthy decisions before files are written.

Likely diagrams include scoped C4 Container views, ingestion and trust-boundary flowcharts, clinician-access sequences, alert lifecycle state diagrams, and deployment topology. The agent should not invent regulatory approval or stakeholder agreement.

## Example 4: Data and Streaming System

Use the prompt to make ordering, replay, lineage, retention, and backpressure visible. These details drive more useful diagrams than a large generic component view.

```text
/sddp-systemdesign Design a telemetry platform that ingests events from 100,000 industrial devices. Events pass through a durable stream, real-time anomaly detection, cold storage, and a customer query API. Devices can reconnect after 24 hours offline. Preserve event order per device, support replay after rule changes, and isolate malformed or poison events.
```

The Major Data Flow Catalog should distinguish ingestion, anomaly processing, replay, query, and retention/deletion paths. Flowcharts should show producer, transport, consumer, stores, egress, retry, dead-letter handling, replay, and backpressure. A state diagram may explain device connectivity or replay orchestration when those states affect architecture decisions.

## Example 5: Refine a Brownfield Architecture

Point the agent at existing architecture and source-layout evidence. It preserves valid narrative, existing `FLOW-###` IDs, ADR references, and the established repository layout.

```text
/sddp-systemdesign Refine the registered SAD for the new asynchronous export pipeline. The current architecture is in docs/architecture.md, source remains under apps/ and packages/, and ADR-0004 still applies. Add the export and recovery flows without changing existing FLOW-001 or FLOW-002. Compare queue-based and database-outbox approaches before proposing an ADR.
```

The agent previews material changes before writing. It does not force source code into `/src`, duplicate the registered SAD at `specs/sad.md`, renumber existing flows, or create an ADR for a reversible implementation detail.

## Outputs and Readiness

| Artifact | Purpose |
|----------|---------|
| Canonical Technical Context Document, normally `specs/sad.md` | Decomposition, architecture views, flows, quality targets, traceability, and risks |
| `specs/adrs/*.md` | Consequential durable decisions with credible alternatives |
| `.github/sddp-config.md` registration | Identifies the canonical Technical Context Document |

The workflow validates a temporary candidate before publishing and validates the live registered document afterward. `sad_maturity: draft` means unresolved architecture work remains. `sad_maturity: planning-ready` means the document passed the stricter structure, flow, recovery, quality, traceability, and registration checks required by `/sddp-projectplan` and `/sddp-autopilot`.

## Practical Tips

- Include known domains, actors, integrations, stores, deployment constraints, scale, and recovery expectations in the initial prompt.
- Name sensitive data, trust boundaries, tenancy, residency, and compliance constraints explicitly.
- Describe important synchronous, asynchronous, batch, and offline paths, including failure behavior.
- Link existing repository documents rather than restating them.
- Treat the proposed decomposition as a design option, not a predetermined service map.
- Prefer a few diagrams that answer specific questions over one crowded diagram of everything.
