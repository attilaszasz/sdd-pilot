# Tasks Annotation Fixture

Use this fixture to dry-run the extended task format before changing task-generation or implementation rules.

## Fixture Goals

- Confirm `after:T###` dependencies are explicit and re-orderable on resume.
- Confirm `← T###:Symbol` and `→ exports:` annotations are parseable.
- Confirm `[COMPLETES REQ]` appears only on the last task for a requirement spanning 3+ tasks.
- Confirm no `[P]` task is batched with its declared producer dependency.
- Confirm acceptance test stub tasks (`← plan:AcceptanceTestStubs`) precede their requirement's implementation tasks and are never `[P]`-batched with them.
- Confirm `[VERIFY: <command>]` annotations parse into the `verify` array and are scoped to the task's file/requirement.

## Sample

```text
## Phase 1: Work Item 1 - Accounts (Priority: P1) 🎯 MVP

- [ ] T001 [US1] {FR-001} Create acceptance test stub in tests/user.test.py ← plan:AcceptanceTestStubs
- [ ] T002 [US1] {FR-001} Create User model in src/models/user.py → exports: UserModel(id,email,role) [VERIFY: grep "class UserModel" src/models/user.py]
- [ ] T003 [US1] {FR-001} Implement user service in src/services/user.py after:T002 ← T002:UserModel → exports: UserService.register() [VERIFY: pytest tests/test_user.py] [VERIFY: grep "def register" src/services/user.py]
- [ ] T004 [US1] {FR-001} [COMPLETES FR-001] Add user endpoint in src/api/users.py after:T003 ← T003:UserService

## Phase 2: Work Item 2 - Orders (Priority: P2)

- [ ] T005 [P] [US2] {FR-002} Create Order model in src/models/order.py → exports: OrderModel(id,status)
- [ ] T006 [US2] {FR-002} Implement order service in src/services/order.py after:T005 ← T005:OrderModel → exports: OrderService.submit()
- [ ] T007 [US2] {FR-002} [COMPLETES FR-002] Add order endpoint in src/api/orders.py after:T006 ← T006:OrderService
```

## Expected Parser Output

- `T001.imports[0].sourceTask = "plan"` (plan-derived stub source, not a task ID)
- `T001.imports[0].filePath = null` (the Developer reads `## Acceptance Test Stubs` from `plan.md` directly)
- `T002.verify = ["grep \"class UserModel\" src/models/user.py"]`
- `T003.dependencies = ["T002"]`
- `T003.imports[0].sourceTask = "T002"`
- `T003.imports[0].filePath = "src/models/user.py"`
- `T003.verify = ["pytest tests/test_user.py", "grep \"def register\" src/services/user.py"]` (repeatable annotation → array order preserved)
- `T004.verify = []` (no VERIFY annotation)
- `T004.completesRequirement = "FR-001"`
- `T005.parallel = true`
- `T006.parallel = false`

## Expected Review Outcomes

- No `[P]` dependency violation for `T005`/`T006`
- No missing export/import pairing for `T002`/`T003` or `T006`/`T007`
- No misplaced `[COMPLETES]` marker
- Stub task `T001` precedes every `FR-001` implementation task; `T001` is not `[P]`-batched with `T002`
- P2 work item (`US2`) has no stub task (P1-only scope)
- VERIFY commands are non-empty, contain no literal `]`, and are scoped to each task's file/symbol (T002 → User model symbol; T003 → user-service test + register method)
- All task lines stay under their character cap (300 with VERIFY, 200 without)