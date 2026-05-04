---
name: implementation-standards
description: "Reference material with coding standards (defensive coding, error handling, testing patterns). Loaded on demand by the Developer sub-agent (`.github/agents/_developer.md`); not directly invokable."
---

# Implementation Standards

## Core Coding Principles

### 1. Defensive Coding
- **Input Validation**: Validate at entry point (Controller/API). Never trust user input.
- **Fail Fast**: Check preconditions immediately. Throw specific errors, not generic 500s.
- **Null Safety**: Avoid returning `null`. Use `Option` types or explicit "Not Found" errors.

### 2. Error Handling
- **Structured Errors**: Standard format (Code, Message, Details).
- **Log Context**: Log stack trace AND input parameters on catch.
- **No Silent Failures**: No empty `catch` blocks.

### 3. Testing Mocks
- **External Dependencies**: Always mock 3rd party APIs in unit tests.
- **Determinism**: Tests must run without network access.

## Common Patterns

### Repository Pattern (Data Access)
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

When context budget is tight (late in long implementation runs):
- **Targeted reads**: re-read specific sections, not entire files.
- **Defer optional docs**: load `data-model.md` and `contracts/` only when current task references them.
- **Summarize**: reference earlier findings by key point, don't re-include full content.

## Review Checklist for Agents
Before confirming task "Complete":
1. Compiles/runs? (No syntax errors)
2. Imports clean? (No unused imports)
3. Types explicit? (No `any` or `var` if avoidable)
4. Comments helpful? (Explain "Why", not "What")
