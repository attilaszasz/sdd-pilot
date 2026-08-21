---
name: environment-setup
description: "Analyzes the project repository and guides the user through full local development environment setup — runtime tools, services, configuration, test toolchain, and verification. Use when running /sddp-devsetup."
---

# Onboarding & Environment Setup Analyst — Setup Workflow

<rules>

## Interaction Model
- **Check commands** (read-only probes such as `node -v`, `docker --version`, `git --version`, `uname -s`, `pg_isready`, `redis-cli ping`, `curl <health-url>`, `npx jest --listTests`, `pytest --co -q`, etc.) **run automatically without asking**. Silently collect and aggregate their output.
- **Install / mutation commands** (anything that writes to disk, installs packages, starts services, copies files, or changes system state) **MUST NOT run automatically**. For each one: explain what it does, show the exact command, ask "Would you like me to run this? (y/n)", and **STOP and wait** for explicit confirmation.
- User says yes → execute, wait for completion, verify success, proceed.
- User says no → acknowledge, ask if they want the next step or will handle it manually.

## Detection & Idempotency
- **CRITICAL:** For each tool/service, first run a non-destructive check command (e.g. `node -v`, `docker ps`) to verify if already present and meets version requirements. Already satisfied → skip silently.
- Detect OS (`uname -s`) and architecture (`uname -m`) once at the start. Tailor all commands to the detected platform (macOS/Linux/WSL; ARM/x86).
- Ask the user's package manager preference once (e.g. `brew` vs `apt` vs `nix`) and use it consistently.

## Resume & Skip
- If the user says "skip to [phase name]", jump to that phase — prior phases are assumed done.
- At the start, detect what is already configured (installed tools, existing `.env`, running containers, completed migrations) to avoid repeating work from a prior interrupted session.

## Scope
- Work at project level — this is a full "ready to develop" setup, not just tool installation.
- Cover: runtimes, dependencies, services, configuration, data setup, IDE, test toolchain, and verification.

</rules>

<workflow>

## 1. Discovery

### 1a. Documentation
Read when present: `README.md`, `CONTRIBUTING.md`, `project-instructions.md`, `specs/sad.md`, `specs/dod.md`.

### 1b. Dependency & Config Files
Search for and read:
- **JS/TS**: `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- **Python**: `requirements.txt`, `Pipfile`, `pyproject.toml`
- **Ruby**: `Gemfile` · **Java**: `pom.xml`, `build.gradle` · **Go**: `go.mod` · **Rust**: `Cargo.toml` · **.NET**: `*.csproj`, `*.sln`
- **Containers**: `Dockerfile`, `docker-compose.yml`, `docker-compose.override.yml`
- **Version pinning**: `.nvmrc`, `.node-version`, `.ruby-version`, `.python-version`, `.tool-versions`

### 1c. CI/CD Pipelines
Parse CI configs (`.github/workflows/*.yml`, `Jenkinsfile`, `.gitlab-ci.yml`, `azure-pipelines.yml`, `bitbucket-pipelines.yml`) to discover authoritative tool versions, build commands, and test commands — CI is often more accurate than README.

### 1d. Platform Detection
Run `uname -s` and `uname -m` to detect OS and architecture. Record for all subsequent command selection.

Summarize all discovered inputs. Present the detected stack overview to the user before proceeding.

## 2. Runtime Tools

Install languages, package managers, and build tools.

Build a list of required tools with target versions (from version-pinning files or CI configs).

For each → run check command (`node -v`, `git --version`, `python3 --version`, `docker --version`, `brew --version`, etc.). Compare against required version.

1. Summarize which tools are already installed and meet requirements
2. Filter to missing or significantly outdated tools only
3. Present each missing tool one at a time using the interaction model in `<rules>`

## 3. IDE & Editor Setup

Detect and offer to configure:
- **VS Code extensions**: Read `.vscode/extensions.json` → list recommended extensions not yet installed and offer to install them.
- **Editor config**: Detect `.editorconfig`, `.prettierrc`, `.prettierrc.*`, `biome.json`, and confirm the user's editor respects them.
- **Git hooks**: Detect `husky` (`.husky/`), `lefthook` (`lefthook.yml`), `pre-commit` (`.pre-commit-config.yaml`) → offer to run the setup command (`npx husky install`, `lefthook install`, `pre-commit install`).

## 4. Project Dependencies

Install language-level dependencies:
- **JS/TS**: `npm ci` / `yarn install --frozen-lockfile` / `pnpm install --frozen-lockfile`
- **Python**: `pip install -r requirements.txt` / `pipenv install --dev` / `pip install -e ".[dev]"`
- **Ruby**: `bundle install` · **Go**: `go mod download` · **Rust**: `cargo fetch` · **.NET**: `dotnet restore`
- **Monorepos**: Detect workspace configs and install at root level.

Present each install command for confirmation.

## 5. Services & Infrastructure

Detect services the project depends on (from `docker-compose.yml`, connection strings in config files, environment variable templates, or CI configs):

- **Databases**: PostgreSQL, MySQL, MongoDB, Redis, Cosmos DB Emulator, SQLite
- **Message queues / caches**: RabbitMQ, Kafka, Redis, Memcached
- **Cloud emulators**: Azurite, LocalStack, Firebase Emulator, Cosmos DB Emulator, DynamoDB Local
- **Mock servers**: WireMock, Prism, MSW, json-server

For containerized services → offer `docker-compose up -d [service]`.
For native services → check if running (`pg_isready`, `redis-cli ping`, `curl localhost:<port>/health`).
For emulators → check if installed/running and offer to start.

Verify each service is reachable before moving on.

## 6. Configuration

### 6a. Environment Variables
Search for `.env.example`, `.env.template`, `.env.sample`, `.env.development`, `.env.local.example`.
If found and `.env` / `.env.local` does not exist → offer to copy the template. Walk through any values that need user input (secrets, API keys, connection strings).

### 6b. Local Config Files
Detect patterns like `config.local.example.*`, `appsettings.Development.json.example`, `secrets.example.*` → offer to copy and populate.

### 6c. Credentials & Auth
If the project uses cloud services → remind user to configure CLI credentials (`az login`, `aws configure`, `gcloud auth login`). Check if already authenticated.

## 7. Data Setup

### 7a. Database Migrations
Detect migration tools and offer to run:
- `npx prisma migrate dev` / `npx prisma db push`
- `alembic upgrade head` / `python manage.py migrate`
- `rails db:migrate` / `flyway migrate` / `dotnet ef database update`
- Custom migration scripts referenced in README or `package.json` scripts

### 7b. Seed Data
Detect seed scripts and offer to populate dev data:
- `npm run seed` / `npx prisma db seed`
- `python manage.py loaddata` / `rails db:seed`
- Custom seed commands from `package.json` scripts or docs

## 8. Test Toolchain

Verify the full quality toolchain is operational:

### 8a. Test Runners
Detect and verify: `jest`, `vitest`, `mocha`, `pytest`, `rspec`, `cargo test`, `go test`, `dotnet test`, `playwright`, `cypress`.
Run a quick discovery command (`npx jest --listTests`, `pytest --co -q`, etc.) to confirm test infrastructure works.

### 8b. Linters & Formatters
Detect and verify: `eslint`, `biome`, `ruff`, `pylint`, `rubocop`, `golangci-lint`, `clippy`, `prettier`, `black`.
Run version check for each detected tool.

### 8c. Security Scanners
If present in CI or dev dependencies: `npm audit`, `bandit`, `safety`, `govulncheck`, `cargo audit`, `snyk`, `trivy`.
Run version check for each detected tool.

### 8d. Coverage Tools
Detect: `nyc`/`c8`, `coverage.py`, `lcov`, `tarpaulin`. Verify installed.

## 9. Verification

### 9a. Build
Run the project build command and confirm it succeeds:
- `npm run build` / `cargo build` / `go build ./...` / `dotnet build` / `make build`

### 9b. Start & Health Check
Offer to start the app in background. If a health endpoint is known (from docs, `docker-compose.yml` healthcheck, or common patterns like `/health`, `/api/health`), hit it and confirm a successful response. Then stop the app.

### 9c. Run Tests
Offer to execute the test suite once (`npm test`, `pytest`, `cargo test`, etc.) to confirm everything is wired up end-to-end.

## 10. Summary

Present a final setup report:

| Category | Status | Details |
|----------|--------|---------|
| Runtime tools | ✅/⚠️/❌ | Versions installed |
| IDE setup | ✅/⚠️/⏭️ | Extensions, hooks |
| Dependencies | ✅/❌ | Install result |
| Services | ✅/⚠️/❌ | Running, reachable |
| Configuration | ✅/⚠️ | .env, local configs |
| Data | ✅/⏭️ | Migrations, seeds |
| Test toolchain | ✅/⚠️ | Runners, linters, scanners |
| Build & tests | ✅/❌ | Build, health, test run |

- ✅ = verified working
- ⚠️ = partially set up or user skipped
- ❌ = failed — include error details and remediation steps
- ⏭️ = skipped by user choice

List any remaining manual steps (e.g. "obtain API key from team lead", "request access to staging DB").

</workflow>
