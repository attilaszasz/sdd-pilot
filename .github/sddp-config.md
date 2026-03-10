# SDD Project Configuration

<!-- Managed by /sddp-prd, /sddp-systemdesign, /sddp-devops, /sddp-projectplan, /sddp-init, and /sddp-plan. Do not edit manually unless you know what you're doing. -->
<!-- This file stores project-level SDD settings read by ContextGatherer and downstream agents. -->

## Product Document

<!-- A reference document describing the product vision, users, scope, and success measures. -->
<!-- Registered by /sddp-prd when specs/prd.md is created, or preserved/adopted by /sddp-init and /sddp-systemdesign when the default project PRD exists. -->
<!-- When /sddp-prd is used, specs/prd.md is the canonical Product Document. -->

**Path**: 

## Technical Context Document

<!-- A reference document describing the project's tech stack, architecture, or constraints. -->
<!-- Registered by /sddp-systemdesign when specs/sad.md is created, or by /sddp-plan when another file is provided. -->
<!-- When /sddp-systemdesign is used, specs/sad.md is the canonical Technical Context Document. -->

**Path**: 

## Deployment & Operations Document

<!-- A reference document describing deployment strategy, environments, CI/CD, infrastructure, observability, reliability, and operational processes. -->
<!-- Registered by /sddp-devops when specs/dod.md is created, or preserved/adopted by /sddp-init when the default project DOD exists. -->
<!-- When /sddp-devops is used, specs/dod.md is the canonical Deployment & Operations Document. -->

**Path**: 

## Project Plan

<!-- A high-level decomposition of the project into epics with dependency ordering and execution waves. -->
<!-- Registered by /sddp-projectplan when specs/project-plan.md is created. -->

**Path**: 

## Checklist Settings

<!-- Controls automatic checklist queue generation by /sddp-plan. -->
<!-- MaxChecklistCount is a hard cap on the number of recommended checklist domains generated. -->
<!-- The plan agent may generate fewer entries if the feature has fewer relevant risk areas. -->

**MaxChecklistCount**: 1

## Autopilot

<!-- When true, all SDD workflows run end-to-end without user prompts. -->
<!-- Every decision point uses the recommended/default option automatically. -->
<!-- Requires a Product Document and Technical Context Document to be registered above. -->
<!-- The /sddp-autopilot command reads this setting and enforces document prerequisites. -->

**Enabled**: false
