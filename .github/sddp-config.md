# SDD Project Configuration

<!-- Managed by /sddp-init, /sddp-systemdesign, and /sddp-plan. Do not edit manually unless you know what you're doing. -->
<!-- This file stores project-level SDD settings read by ContextGatherer and downstream agents. -->

## Product Document

**Path**: 

## Technical Context Document

<!-- A reference document describing the project's tech stack, architecture, or constraints. -->
<!-- Registered by /sddp-systemdesign when docs/sad.md is created, or by /sddp-plan when another file is provided. -->
<!-- When /sddp-systemdesign is used, docs/sad.md is the canonical Technical Context Document. -->

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
