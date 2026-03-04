---
name: implementation-standards
description: "Standard patterns and practices for code implementation. Use when writing code in the `/sddp-implement` phase to ensure consistency, safety, and maintainability."
---

# Implementation Standards

## Core Coding Principles

### 1. Defensive Coding
- **Input Validation**: Never trust user input. Validate at the entry point (Controller/API).
- **Fail Fast**: Check preconditions immediately. Throw specific errors, not generic 500s.
- **Null Safety**: Avoid returning `null`. Use `Option` types or explicit "Not Found" errors.

### 2. Error Handling
- **Structured Errors**: Use a standard error response format (Code, Message, Details).
- **Log Context**: When catching an exception, log the stack trace AND the input parameters that caused it.
- **No Silent Failures**: Never empty `catch` blocks.

### 3. Testing Mocks
- **External Dependencies**: Always mock 3rd party APIs in unit tests.
- **Determinism**: Tests must run without network access.

## Common Patterns

### Repository Pattern (Data Access)
*Use strictly for database interactions.*
```pseudo
interface UserRepository {
  findById(id: string): Promise<User | null>
  save(user: User): Promise<User>
}
```

### Service Layer (Business Logic)
*Contains all domain rules. Never access DB directly from Controller.*
```pseudo
class UserService {
  constructor(repo: UserRepository)
  
  async register(email: string) {
    if (await this.repo.findByEmail(email)) {
      throw new DuplicateEmailError()
    }
    // ... logic
  }
}
```

## Context-Window Efficiency

When context window budget is tight (e.g., late in a long implementation run with many files already processed):
- **Prefer targeted reads**: Re-read specific sections of a file rather than loading entire files when only a portion is needed.
- **Defer optional docs**: Only load `data-model.md`, `contracts/`, and `quickstart.md` when the current task references them directly.
- **Summarize, don't repeat**: When referencing earlier findings or review results, summarize the key point rather than re-including full content.

## Review Checklist for Agents
Before confirming a task as "Complete":
1.  **Does it compile/run?** (No syntax errors)
2.  **Are imports clean?** (No unused imports)
3.  **Are types explicit?** (No `any` or `var` if avoidable)
4.  **Are comments helpful?** (Explain "Why", not "What")
