# `zankai-agents` — Human-Controlled Multi-Agent CLI Development Team

## Executable CLI

Build and install the current local package with `npm pack` then `npm install -g ./zankai-agents-1.0.0.tgz`. Run `zankai init` in your project directory, followed by `zankai status`. No existing package.json is required. The package has not been published to npm; the live dashboard is still planned. See [installation instructions](docs/INSTALLATION.md).

A reusable, filesystem-based multi-agent web development team template for **Next.js, TypeScript, React, shadcn/ui, Tailwind CSS, Prisma, PostgreSQL, and `npm`**.

---

## Philosophy

```text
You are the Team Lead.

The Coordinator plans the work.

The Coordinator does not secretly run the entire team.

You manually dispatch tasks to visible specialist CLIs.

Agents execute only their assigned task.

Agents communicate through task and handoff files.

Parallel work is isolated when necessary.

QA verifies integrated work.

You remain aware of what is happening throughout development.
```

> **The Golden Rule:**
> The Coordinator plans and recommends.
> The Team Lead dispatches.
> Specialist agents execute.
> Handoffs report results.
> The Coordinator determines what becomes ready next.

---

## 1. Team Roles

`zankai-agents` maintains six permanent roles defined in `.team/roles/`:

1. **`coordinator` (`TEAM-COORD`)**: Receives requests from the Team Lead, inspects project state, breaks work into bounded tasks (`T-001`, `T-002`, ...), identifies dependencies and parallel safety, updates `.team/BOARD.md`, and outputs short worker prompts for the Team Lead to run manually. Never silently launches other agents or acts as the default programmer.
2. **`architect` (`TEAM-ARCH`)**: Designs application/domain/server/client boundaries, API shapes, auth/authorization architecture, database architecture reviews, shared contracts before parallel work, and records ADRs in `.team/decisions/`.
3. **`frontend` (`TEAM-FE`)**: Implements React/Next.js UI, TypeScript frontend components, shadcn/ui, Tailwind CSS, forms, loading/error states, responsive layout, accessibility, client validation, and frontend tests.
4. **`backend` (`TEAM-BE`)**: Implements Next.js Server Actions, Route Handlers, APIs, services, repositories, authentication/authorization, Zod validation, business logic, transactions, and backend tests.
5. **`data` (`TEAM-DATA`)**: Owns Prisma schema (`prisma/schema.prisma`), PostgreSQL relations, indexes, migrations, seed data, and query performance. Requires explicit Team Lead approval (`RED`) for any destructive database change.
6. **`qa` (`TEAM-QA`)**: Independently verifies the **integrated** work against acceptance criteria, runs TypeScript/lint/test checks, reviews code for regressions, and reports `PASS` or `FAIL`. Never claims a command passed unless it actually ran.

---

## 2. Routing & Providers

Roles and AI providers are separate concepts. If a primary provider is unavailable or quota-constrained, switching to the fallback provider changes the CLI tool—not the role's responsibilities or acceptance criteria.

| Terminal | Role | Primary Provider | Fallback Provider | Default Profile |
| --- | --- | --- | --- | --- |
| `TEAM-COORD` | `coordinator` | Antigravity (`agy`) | Codex (`codex`) | `FAST` |
| `TEAM-ARCH` | `architect` | Codex (`codex`) | Antigravity (`agy`) | `DEEP` |
| `TEAM-FE` | `frontend` | Antigravity (`agy`) | Codex (`codex`) | `STANDARD` |
| `TEAM-BE` | `backend` | Codex (`codex`) | Antigravity (`agy`) | `STANDARD` |
| `TEAM-DATA` | `data` | Antigravity (`agy`) | Codex (`codex`) | `STANDARD` |
| `TEAM-QA` | `qa` | Codex (`codex`) | Antigravity (`agy`) | `STANDARD` |

---

## 3. Visible Terminal Names

Organize your terminal emulator (Windows Terminal, VS Code terminals, etc.) with named tabs or panes for the roles you need:

```text
TEAM-COORD   ACTIVE
TEAM-ARCH    IDLE
TEAM-FE      RUNNING T-014
TEAM-BE      RUNNING T-015
TEAM-DATA    BLOCKED
TEAM-QA      WAITING
```

- Not every terminal needs to be active at once.
- Six terminal tabs do **not** mean six agents continuously poll or burn tokens in the background.
- An agent runs only when you paste its task prompt into its terminal.

---

## 4. New-Project Startup

1. Copy the template into your new project (see [Section 17](#17-how-to-copyinstall-the-template)).
2. Initialize the project files in PowerShell:
   ```powershell
   npm run zankai:init -- --name "My SaaS App" --description "B2B analytics dashboard"
   ```
3. Open your **`TEAM-COORD`** terminal (Antigravity CLI or Codex fallback) and paste the kickoff prompt from `prompts/PROJECT-KICKOFF.md`.
4. `TEAM-COORD` populates `.team/PROJECT.md`, creates the initial task breakdown in `.team/tasks/` (typically `T-001` Initial Architecture → `T-002` Application Bootstrap → `T-003` Frontend Foundation / `T-004` Prisma Foundation → `T-005` Initial QA), updates `.team/BOARD.md`, and tells you which terminal to run first.

---

## 5. Normal Feature Workflow

```text
1. Team Lead → TEAM-COORD
   Gives project or feature request.

2. Coordinator (TEAM-COORD):
   - analyzes request
   - creates tasks in .team/tasks/T-NNN.md
   - sets dependencies & scopes
   - classifies parallel safety
   - updates .team/BOARD.md
   - tells Team Lead which terminal(s) to run next

3. Team Lead manually runs recommended specialist terminal(s).

4. Specialist Worker (TEAM-ARCH / TEAM-FE / TEAM-BE / TEAM-DATA):
   - reads AGENTS.md, role file, and T-NNN.md
   - implements only owned scope
   - runs verification commands
   - writes handoff in .team/handoffs/

5. Team Lead returns to TEAM-COORD and pastes prompts/COORDINATOR-CHECKIN.md.

6. Coordinator:
   - reads handoffs
   - updates .team/BOARD.md
   - unlocks newly READY tasks
   - checks for parallel conflicts
   - recommends next terminal(s)

7. Repeat until implementation tasks complete and branches/worktrees are integrated.

8. TEAM-QA validates integrated result and writes QA handoff.

9. Coordinator updates .team/BOARD.md to DONE and reports final state to Team Lead.
```

> **Small Task Exception:** For a tiny, isolated single-file fix, you can skip `TEAM-COORD` and ask `TEAM-FE` or `TEAM-BE` directly. Use the full Coordinator flow for features, multi-role work, schema changes, or architectural changes.

---

## 6. Coordinator Workflow & Output Format

Whenever `TEAM-COORD` plans a feature or processes a check-in (`prompts/COORDINATOR-CHECKIN.md`), it outputs a predictable plan:

```text
TEAM PLAN

Request:
Implement authentication.

TASKS

T-001 — Authentication Architecture
Role: Architect
Terminal: TEAM-ARCH
Provider: Codex
Profile: DEEP
Status: READY
Dependencies: None

T-002 — User and Session Schema
Role: Data
Terminal: TEAM-DATA
Provider: Antigravity
Profile: STANDARD
Status: BLOCKED
Dependencies: T-001

READY NOW

T-001 → TEAM-ARCH

TEAM LEAD ACTION

Run TEAM-ARCH with T-001.
```

Followed by the short worker prompt for `T-001`.

---

## 7. Worker Workflow & Short Worker Prompt

Workers do not need giant copy-pasted context dumps because context lives in `.team/`. Dispatch a worker with the compact prompt from `prompts/WORKER-TASK.md` (or print it via `npm run zankai:task -- T-001`):

```text
You are the Architect.

Read:

AGENTS.md
.team/PROJECT.md
.team/ARCHITECTURE.md
.team/roles/architect.md
.team/tasks/T-001.md

Execute T-001 only.

Respect its dependencies, scope, and restrictions.

Create the required handoff when complete.

Do not start another task.
```

---

## 8. Handoffs

Specialists report their work by writing a handoff file in `.team/handoffs/` using `.team/templates/HANDOFF.md`, for example:

`.team/handoffs/T-014-backend-to-coordinator.md`

Each handoff records:
- Task ID, From role, To role (`coordinator`), Terminal, Provider, Profile, Status
- Completed work & Changed files
- Verification performed & actual Verification results
- Assumptions, Known issues, Remaining work, Recommended next role
- Branch / worktree & Commit

You never have to manually summarize worker output for the Coordinator—`TEAM-COORD` reads `.team/handoffs/` directly.

---

## 9. File Ownership & Single-Writer `BOARD.md` Rule

### Single Writer for `.team/BOARD.md`
**Only `TEAM-COORD` updates `.team/BOARD.md`** (or the Team Lead running `npm run zankai:board`). Specialist workers must never edit `.team/BOARD.md`, preventing merge conflicts and race conditions.

### Default File Ownership
Task-level `Owned scope` overrides defaults, but standard ownership is:

| Path | Default Owner |
| --- | --- |
| `.team/BOARD.md` | Coordinator (`TEAM-COORD`) **only** |
| `.team/PROJECT.md` | Coordinator (`TEAM-COORD`) / Team Lead |
| `.team/ARCHITECTURE.md`, `.team/decisions/**` | Architect (`TEAM-ARCH`) |
| `src/components/**`, UI areas in `src/app/**` | Frontend (`TEAM-FE`) |
| `src/server/**`, `src/app/api/**` | Backend (`TEAM-BE`) |
| `prisma/**` | Data (`TEAM-DATA`) |

---

## 10. Parallelism Levels

Before recommending parallel work, `TEAM-COORD` classifies tasks into one of three levels:

1. **`SAFE PARALLEL`**: Independent owned scopes, stable contracts, and no shared files touched (e.g., `TEAM-FE` in `src/components/dashboard/**` and `TEAM-BE` in `src/server/reports/**`). Can run concurrently.
2. **`PARALLEL WITH ISOLATION`**: Logically independent tasks that touch shared files (`package.json`, `package-lock.json`, `.env.example`, `tsconfig.json`, middleware, shared types). **Must run in separate Git worktrees.**
3. **`SEQUENTIAL / BLOCKED`**: One task depends on another's output (e.g., `T-022` Backend depends on `T-021` Data's Prisma schema). `T-022` stays `BLOCKED` until `T-021` completes.

---

## 11. Git Worktrees for Parallel Work

When running `PARALLEL WITH ISOLATION` tasks or multiple write-heavy agents simultaneously, create isolated Git worktrees from the project root in PowerShell:

```powershell
git worktree add ..\project-be -b ai/T-014-backend
git worktree add ..\project-fe -b ai/T-015-frontend
git worktree add ..\project-data -b ai/T-016-data
git worktree list
```

Point each terminal (`TEAM-BE`, `TEAM-FE`, `TEAM-DATA`) to its respective directory (`..\project-be`, `..\project-fe`, `..\project-data`). Agents must never run destructive Git commands (`reset --hard`, `push --force`, branch deletion) without explicit Team Lead approval.

---

## 12. Shared Contracts & Integration

Before `TEAM-FE`, `TEAM-BE`, and `TEAM-DATA` work in parallel on a multi-role feature, `TEAM-ARCH` defines shared contracts in `.team/ARCHITECTURE.md` or `.team/decisions/`:
- API request/response shapes
- Domain types and enum values (e.g., `UserRole = ADMIN | USER`)
- Prisma model and field names
- Zod validation rules and auth requirements

After parallel workers finish and record handoffs, integrate their branches/worktrees into the target branch before running final QA.

---

## 13. Integrated QA (`TEAM-QA`)

`TEAM-QA` validates the **integrated** branch/state combining Frontend, Backend, and Data changes—never isolated worker branches alone.

```text
TEAM-FE ─────┐
TEAM-BE ─────┼─→ integrated branch/state → TEAM-QA
TEAM-DATA ───┘
```

QA checks:
- Every acceptance criterion in `.team/tasks/T-NNN.md`
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`
- Schema validation and architecture compliance
- Edge cases and regressions

QA never claims a command passed unless it actually ran.

---

## 14. Provider Fallback

If your primary CLI provider (`codex` or `agy`) hits a rate limit or is unavailable, override the provider for any task without changing the role:

```powershell
# Route a backend task (normally Codex) to Antigravity:
npm run zankai:assign -- T-003 backend antigravity standard
```

---

## 15. Model Profiles, Usage Conservation & Approval Levels

### Logical Capability Profiles (`config/ai-team.json`)
- **`FAST`**: Exploration, reading files, status checks, task planning, handoffs, documentation.
- **`STANDARD`**: Normal frontend, backend, and Prisma work, unit/integration tests, standard debugging and QA.
- **`DEEP`**: Architecture (`TEAM-ARCH`), difficult debugging, concurrency, security-sensitive auth, major refactors, complex DB design.

### Usage Conservation
- Recommend at most **two** concurrent write-heavy tasks by default.
- Do not use six agents or `DEEP` profiles for routine CRUD work.

### Approval Levels
- **`GREEN`**: Normal scoped implementation, tests, local refactors, type/a11y fixes — agent proceeds.
- **`YELLOW`**: New major dependency, API contract change, schema expansion beyond task scope — agent proposes and informs Team Lead first.
- **`RED`**: Destructive DB migration (`DROP TABLE`, `DROP COLUMN`), deleting major functionality, auth architecture replacement, production deploy, force push — **requires explicit Team Lead approval**.

---

## 16. npm Utilities

All scripts use Node (`>=20`) via `npm` and **never** automatically launch AI CLIs:

```powershell
# Initialize .team/PROJECT.md, .team/ARCHITECTURE.md, and .team/BOARD.md
npm run zankai:init -- --name "My App" --description "App description"

# Show terminal routing, provider CLI detection, and task summary
npm run zankai:status

# Refresh and print .team/BOARD.md (for TEAM-COORD / Team Lead)
npm run zankai:board

# Create a new task file (.team/tasks/T-001.md)
npm run zankai:new -- "Authentication Architecture" --role architect --profile deep

# Inspect full task details, dependencies, shared files, handoffs, and worker prompt
npm run zankai:show -- T-001

# Print task content and short worker prompt
npm run zankai:task -- T-001

# Assign or override role, provider, profile, and parallelism
npm run zankai:assign -- T-001 architect codex deep --parallelism "SEQUENTIAL / BLOCKED"

# Create or validate a specialist handoff (.team/handoffs/T-001-architect-to-coordinator.md)
npm run zankai:handoff -- T-001
npm run zankai:handoff -- T-001 coordinator --ready

# Run declared npm verification checks and record QA evidence
npm run zankai:qa -- T-001 --pass --reviewer qa --review "Verified integrated auth flow and tests."

# Copy this reusable template into a new or existing project directory
npm run zankai:copy -- C:\Path\To\MyProject
```

---

## 17. How to Copy / Install the Template

### Option A: Using `npm run zankai:copy` (Recommended)
From this repository in PowerShell:

```powershell
npm run zankai:copy -- C:\Path\To\TargetProject
Set-Location C:\Path\To\TargetProject
npm run zankai:init -- --name "TargetProject" --description "My web application"
```

`zankai:copy` copies `.team/roles`, `.team/templates`, `.agents`, `.codex`, `config/ai-team.json`, `prompts`, `scripts`, and `AGENTS.md`, creates clean uninitialized `PROJECT.md`, `ARCHITECTURE.md`, and `BOARD.md` files with empty `tasks/`, `handoffs/`, and `decisions/` folders, and safely merges the `zankai:*` scripts into the target project's `package.json` without overwriting existing dependencies.

### Option B: Using PowerShell / Robocopy Manually
```powershell
$kit = 'C:\Users\User\Documents\Code Projects\dev\zankai-agents'
$project = 'C:\Path\To\TargetProject'
robocopy $kit $project /E /XC /XN /XO /XF package.json
Set-Location $project
npm run zankai:init
```

## GitHub and installation guide

See [the owner and user installation guide](docs/INSTALLATION.md) for GitHub upload, current project setup, and the planned npm CLI release.


## Commit messages

Follow [the Git commit convention](docs/COMMIT_CONVENTION.md) when contributing changes.

