# Project Instructions Versioning Rules

## Semantic Versioning for Project Instructions

Project instructions versions follow `MAJOR.MINOR.PATCH`:

### MAJOR (Breaking)
Backward-incompatible governance or principle changes:
- Removing an existing principle
- Redefining a principle to mean something fundamentally different
- Changing governance in a way that invalidates existing specs/plans

*Example: Removing "Test-First" as a non-negotiable principle*

### MINOR (Additive)
New capability without breaking existing rules:
- Adding a new principle or section
- Materially expanding guidance within an existing principle
- Adding a new governance mechanism

*Example: Adding "Observability" as a new principle*

### PATCH (Clarification)
Non-semantic refinements:
- Clarifying wording without changing meaning
- Fixing typos
- Improving examples
- Non-material formatting changes

*Example: Clarifying what "Test-First" means for integration tests*

## Version Bump Decision Tree

1. Does this change remove or redefine an existing principle? → **MAJOR**
2. Does this change add a new principle or section? → **MINOR**
3. Is it just rewording, typos, or formatting? → **PATCH**

If ambiguous, propose reasoning before finalizing.

## Date Conventions

- All dates in ISO format: `YYYY-MM-DD`
- `LAST_AMENDED_DATE`: Updated to today whenever any change is made
