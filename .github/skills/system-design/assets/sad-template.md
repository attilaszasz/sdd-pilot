# Software Architecture Document: [PROJECT]

> Date: [DATE] | Status: Draft

## Purpose and Scope

[Summarize the system purpose, primary problem space, and boundary. Avoid meta statements about the document itself.]

## Technical Context

**Language/Version**: [e.g. TypeScript 5.8 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g. Next.js 15, FastAPI, React, Azure SDKs, or NEEDS CLARIFICATION]<br>
**Storage**: [e.g. PostgreSQL, Azure Cosmos DB, files, or N/A]  
**Testing**: [e.g. Vitest, pytest, Playwright, or NEEDS CLARIFICATION]<br>
**Target Platform**: [e.g. Linux containers on Azure, iOS 17+, desktop CLI]  
**Project Type**: [single service/web/mobile/platform/library]<br>
**Performance Goals**: [e.g. <250 ms p95 API latency, <2 s page interactive]  
**Constraints**: [e.g. regulated data, offline use, strict budget, vendor constraints]  
**Scale/Scope**: [e.g. 10k MAU, single-tenant pilot, multi-region growth target]

## System Scope and Context

[Describe the system boundary, primary users, external systems, and business or domain context.]

### C4 System Context

```mermaid
C4Context
    title System Context
    Person(user, "Primary User", "Core actor")
    System(system, "[PROJECT]", "Primary system")
    System_Ext(ext1, "External System", "Key dependency")
    Rel(user, system, "Uses")
    Rel(system, ext1, "Syncs")
```

### C4 Container View

```mermaid
C4Container
    title Container View
    Person(user, "Primary User")
    System_Boundary(system, "[PROJECT]") {
        Container(app, "Application", "[runtime/framework]", "Main app")
        ContainerDb(db, "Data Store", "[database/storage]", "System data")
    }
    System_Ext(ext1, "External System", "Key dependency")
    Rel(user, app, "Uses")
    Rel(app, db, "Read/write")
    Rel(app, ext1, "Calls")
```

### C4 Component View

[Omit unless it materially improves understanding.]

```mermaid
C4Component
    title Component View
    Container_Boundary(app, "Application") {
        Component(interface, "Interface Layer", "[framework/module]", "Entry points")
        Component(domain, "Domain Layer", "[module/package]", "Business rules")
        Component(data, "Data Access", "[module/package]", "Persistence")
    }
    ComponentDb(db, "Data Store", "[database/storage]", "System data")
    Rel(interface, domain, "Calls")
    Rel(domain, data, "Uses")
    Rel(data, db, "Read/write")
```

## Solution Strategy and Architecture Style

- **Architecture Style**: [e.g. modular monolith, service-oriented, serverless]
- **Source Code Location**: All project source code must reside in the `/src` directory.
- **Why this style fits**: [Brief rationale]
- **Alternatives considered**: [Rejected approaches]

## Key Runtime Flows and Failure Paths

### Primary Flow

```mermaid
sequenceDiagram
    participant User as Primary User
    participant App as Application
    participant DB as Primary Data Store
    User->>App: Initiates action
    App->>DB: Read/write data
    DB-->>App: Result
    App-->>User: Response
```

### Failure Paths

- [Failure mode] -> [Expected mitigation, fallback, or recovery behavior]
- [Failure mode] -> [Expected mitigation, fallback, or recovery behavior]

## Deployment and Infrastructure View

```mermaid
flowchart TB
    subgraph Cloud["Cloud / Hosting ([provider])"]
        Runtime["Runtime Environment<br>[container/service]"]
        Data["Data Services<br>[database/storage]"]
    end
    App["Application<br>[runtime/framework]"] --> DataStore["Primary Data Store<br>[database/storage]"]
    Runtime --> App
    Data --> DataStore
```

## Cross-Cutting Concerns

### Security

[Authentication, authorization, secrets, trust boundaries, and compliance posture.]

### Reliability

[Availability targets, retry and fallback approach, resilience patterns, recovery expectations.]

### Observability

[Logging, metrics, tracing, alerting, and diagnostics baseline.]

### Data Management

[Data ownership, lifecycle, retention, migration, consistency, and backup expectations.]

### Integration Strategy

[How the system integrates with internal and external services, APIs, or events.]

### Operations

[Operational ownership, environments, release strategy, and support expectations.]

## Quality Attributes

| Attribute | Target | Measurement | Notes |
|-----------|--------|-------------|-------|
| Performance | [target] | [measurement method] | [notes] |
| Reliability | [target] | [measurement method] | [notes] |
| Security | [target] | [measurement method] | [notes] |
| Maintainability | [target] | [measurement method] | [notes] |
| Scalability | [target] | [measurement method] | [notes] |

## Architecture Decisions

### ADR-001: [Decision Title]

- **Status**: Proposed | Accepted | Superseded
- **Context**: [Decision context]
- **Decision**: [What was chosen]
- **Rationale**: [Why it was chosen]
- **Alternatives Considered**: [Alternatives and why they were rejected]
- **Tradeoffs**: [What gets better and worse]
- **Consequences**: [Expected downstream impact]

## Risks, Assumptions, Constraints, and Open Questions

### Risks

- [Risk and why it matters]

### Assumptions

- [Assumption that influences the architecture]

### Constraints

- [Hard constraint that limits design choices]

### Open Questions

- [Question that still needs a decision]

## Project Context Baseline Updates

- [Reusable project-level technical context promoted from downstream planning runs]