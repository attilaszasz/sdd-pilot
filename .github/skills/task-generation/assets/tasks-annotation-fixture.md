# Tasks Annotation Fixture

Use this fixture to dry-run the extended task format before changing task-generation or implementation rules.

## Fixture Goals

- Confirm `after:T###` dependencies are explicit and re-orderable on resume.
- Confirm `← T###:Symbol` and `→ exports:` annotations are parseable.
- Confirm `[COMPLETES REQ]` appears only on the last task for a requirement spanning 3+ tasks.
- Confirm no `[P]` task is batched with its declared producer dependency.

## Sample

```text
## Phase 1: Work Item 1 - Accounts (Priority: P1) 🎯 MVP

- [ ] T001 [US1] {FR-001} Create User model in src/models/user.py → exports: UserModel(id,email,role)
- [ ] T002 [US1] {FR-001} Implement user service in src/services/user.py after:T001 ← T001:UserModel → exports: UserService.register()
- [ ] T003 [US1] {FR-001} [COMPLETES FR-001] Add user endpoint in src/api/users.py after:T002 ← T002:UserService

## Phase 2: Work Item 2 - Orders (Priority: P2)

- [ ] T004 [P] [US2] {FR-002} Create Order model in src/models/order.py → exports: OrderModel(id,status)
- [ ] T005 [US2] {FR-002} Implement order service in src/services/order.py after:T004 ← T004:OrderModel → exports: OrderService.submit()
- [ ] T006 [US2] {FR-002} [COMPLETES FR-002] Add order endpoint in src/api/orders.py after:T005 ← T005:OrderService
```

## Expected Parser Output

- `T002.dependencies = ["T001"]`
- `T002.imports[0].sourceTask = "T001"`
- `T002.imports[0].filePath = "src/models/user.py"`
- `T003.completesRequirement = "FR-001"`
- `T004.parallel = true`
- `T005.parallel = false`

## Expected Review Outcomes

- No `[P]` dependency violation for `T004`/`T005`
- No missing export/import pairing for `T001`/`T002` or `T005`/`T006`
- No misplaced `[COMPLETES]` marker
- All task lines stay under the 200-character cap