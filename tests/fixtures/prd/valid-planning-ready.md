---
product: SDD Pilot
prd_maturity: planning-ready
created: 2026-08-01
updated: 2026-08-20
---
# Product Requirements Document: SDD Pilot

## Product Overview

SDD Pilot gives delivery teams a reliable specification workflow.

## Vision and Why Now

Product intent should remain intact as AI-assisted delivery accelerates.

## Problem Statement

Teams lose requirement intent when planning and implementation are disconnected.

## Background and Evidence

Repeated delivery audits show drift between project goals and feature execution.

## Target Users, Stakeholders, and Core Personas

Product leads, architects, and engineers need one stable source of product intent.

## User Needs / Jobs To Be Done

Teams need to validate project context before committing to a delivery plan.

## Product Principles or UX Principles

Product intent remains traceable and validation fails closed when evidence is incomplete.

## Scope Summary

The first release validates and preserves project-level product context.

### In-Scope Capabilities

PRD validation and capability-level planning traceability are included.

### Out-of-Scope Items

Feature implementation and deployment automation remain outside this release.

## Product Capability Map

| Capability ID | Capability | Priority | Outcome |
|---|---|---|---|
| CAP-002 | Planning traceability | P2 | Teams can trace plans to product outcomes. |
| CAP-001 | PRD validation | P1 | Teams can detect incomplete product context. |

## Success Metrics / KPIs / Desired Outcomes

Every generated project plan records the digest of its source capability map.

## Assumptions

Teams maintain one canonical Product Document for each repository.

## Constraints

Validation must run with the repository's supported Node.js runtime and no external packages.

## Dependencies

Planning and Autopilot consume the canonical Product Document registration.

## Risks

Legacy documents require migration before downstream planning can continue.

## Open Questions

Nonblocking measurement refinements may be resolved in later product reviews.

## Release or Validation Approach

Validate representative quick, discovery, refinement, and stale-plan scenarios before release.

## Handoff Guidance

Downstream work must preserve stable capability identifiers and scope boundaries.

## Project Context Baseline Updates

Reusable product discoveries remain separate from accepted capability scope until reviewed.
