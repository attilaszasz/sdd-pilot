---
sad_schema: "1.0"
sad_maturity: draft
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# Software Architecture Document: [PROJECT]

## Purpose and Scope

[Summarize the system purpose, primary problem space, scope, and system boundary.]

## Technical Context

**Language/Version**: [Runtime and language versions by boundary when polyglot]<br>
**Primary Dependencies**: [Primary frameworks, libraries, and platform dependencies]<br>
**Storage**: [Stores by owner/boundary, or N/A]<br>
**Testing**: [Test frameworks and architecture test approach]<br>
**Target Platform**: [Runtime, hosting, client, edge, or device targets]<br>
**Project Type**: [single service/web/mobile/platform/library/polyglot]<br>
**Performance Goals**: [Measurable latency, throughput, interaction, or batch targets]<br>
**Constraints**: [Regulatory, residency, budget, compatibility, or platform constraints]<br>
**Scale/Scope**: [Users, tenants, events, data volume, regions, or deployment scope]

## System Decomposition

| Boundary | Responsibilities | Data Ownership | Exposed Interfaces | Dependencies | Deployment Independence |
|----------|------------------|----------------|--------------------|--------------|-------------------------|
| [Boundary] | [Owned responsibilities] | [Owned records or N/A] | [API, events, UI, files] | [Required boundaries/systems] | [Independent, coupled, or in-process] |

## System Scope and Context

[Describe primary users, external systems, business/domain context, trust boundaries, and exclusions.]

### C4 System Context

```mermaid
C4Context
    title System Context
    Person(user, "Primary User", "Core actor")
    System(system, "[PROJECT]", "Primary system")
    System_Ext(ext1, "External System", "Key dependency")
    Rel(user, system, "Uses")
    Rel(system, ext1, "Exchanges data")
```

### C4 Container View

```mermaid
C4Container
    title Container View
    Person(user, "Primary User")
    System_Boundary(system, "[PROJECT]") {
        Container(app, "Application", "[runtime/framework]", "Main app")
        ContainerDb(db, "Data Store", "[database/storage]", "Owned data")
    }
    System_Ext(ext1, "External System", "Key dependency")
    Rel(user, app, "Uses")
    Rel(app, db, "Reads/writes")
    Rel(app, ext1, "Calls")
```

## Architecture View Catalog

| View | Concern | Scope | Notation | Rationale |
|------|---------|-------|----------|-----------|
| System Context | Actors and external dependencies | Whole system | C4 Context | Required overview |
| Container View | Runtime and data boundaries | Whole system or named scope | C4 Container | Required overview |
| [Additional View] | [Question answered] | [Domain/trust zone/runtime/region] | [Sequence/Flowchart/State/ER/C4 Component] | [Why needed] |

## Solution Strategy and Architecture Style

- **Architecture Style**: [Modular monolith, service-oriented, event-driven, serverless, or hybrid]
- **Source Code Layout**: [Adopted project layout; preserve established brownfield layout]
- **Why this style fits**: [Brief rationale tied to constraints and quality attributes]
- **Alternatives considered**: [Rejected approach and primary tradeoff]

## Major Data Flow Catalog

| Flow ID | Trigger | Source / Actor | Processing Boundaries | Stores | Egress | Trust / Data Class | Consistency / Transaction | Failure / Recovery | Diagram |
|---------|---------|----------------|-----------------------|--------|--------|--------------------|---------------------------|--------------------|---------|
| FLOW-001 | [Trigger] | [Source] | [Boundary sequence] | [Stores or N/A] | [Destination or response] | [Trust crossings and classification] | [Consistency/transaction boundary] | [Timeout, retry, fallback, compensation, replay, or recovery] | FLOW-001 |

## Major Data Flow Diagrams

### FLOW-001: [Flow Name]

```mermaid
sequenceDiagram
    participant User as Primary User
    participant App as Application
    participant DB as Primary Data Store
    User->>App: Initiates action
    App->>DB: Reads or writes data
    alt Success
        DB-->>App: Result
        App-->>User: Response
    else Store unavailable
        DB--xApp: Timeout or error
        App-->>User: Recoverable failure
    end
```

[State retry limits, idempotency, compensation, dead-letter/replay, fallback, or operator recovery when material.]

## Additional Architecture Views

[Include only selected views. Use sequence diagrams for temporal behavior, flowcharts for async/data/trust/deployment paths, state diagrams for lifecycles, ER diagrams for conceptual ownership, and C4 Component only for materially complex containers.]

## Deployment and Trust Topology

```mermaid
flowchart TB
    User["User / Client"] --> Edge["Public Edge<br>Trust boundary"]
    subgraph Private["Private Runtime"]
        App["Application<br>runtime/framework"]
        Data[("Primary Store<br>database/storage")]
        App --> Data
    end
    Edge --> App
```

[Describe regions/zones, network and identity boundaries, scaling units, failover assumptions, and which details are deferred to the DOD.]

## Cross-Cutting Concerns

### Security

[Authentication, authorization, identity propagation, secrets, tenancy, trust boundaries, data classification, and compliance posture.]

### Reliability

[Availability targets, retry/fallback, idempotency, degradation, recovery, RTO, and RPO.]

### Observability

[Logs, metrics, traces, correlation, audit events, alerting, and diagnostic ownership.]

### Data Management

[Ownership, lineage, lifecycle, retention/deletion, migration, consistency, residency, and backup expectations.]

### Integration Strategy

[Protocols, contracts, versioning, compatibility, event semantics, and external dependency isolation.]

### Operations

[Operational ownership, environments, release assumptions, support boundaries, and DOD handoff.]

## Quality Attributes

| Attribute | Target | Measurement | Architectural Response |
|-----------|--------|-------------|------------------------|
| Performance | [Measurable target] | [Measurement method] | [Design response] |
| Reliability | [Measurable target] | [Measurement method] | [Design response] |
| Security | [Measurable target] | [Measurement method] | [Design response] |
| Maintainability | [Measurable target] | [Measurement method] | [Design response] |
| Scalability | [Measurable target] | [Measurement method] | [Design response] |

## Architecture Traceability

| Capability / Objective | Boundary | Major Flow | Quality Target | ADRs |
|------------------------|----------|------------|----------------|------|
| [P1 capability or objective] | [Boundary] | FLOW-001 | [Attribute target] | [ADR-NNNN or N/A] |

## Architecture Decision Records

Project-level architectural decisions are maintained as standalone MADR files under `specs/adrs/`. This table is a navigational index; full decision records live in the linked files.

| ADR ID | Title | Status | Date | Supersedes | File |
|--------|-------|--------|------|------------|------|
| ADR-0001 | [Decision Title] | accepted | [DATE] | - | [0001-decision-title.md](adrs/0001-decision-title.md) |

<!-- Rows are managed by the ADR Author subagent. Do not embed full decision prose here. -->

## Risks, Assumptions, Constraints, and Open Questions

### Risks

- [Risk and why it matters]

### Assumptions

- [Assumption that influences the architecture]

### Constraints

- [Hard constraint that limits design choices]

### Open Questions

- [Question that still needs a decision, or None]

## Project Context Baseline Updates

- [Reusable project-level technical context promoted from downstream planning runs, or None]
