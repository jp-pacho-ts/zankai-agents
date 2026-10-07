# Team Routing, Terminals, and Model Profiles

`config/ai-team.json` is the machine-readable source of truth for terminal assignments, provider routing, fallback providers, and capability profiles.

## 1. Roles vs. Providers

Roles and providers are separate concepts:
- A **role** (`coordinator`, `architect`, `frontend`, `backend`, `data`, `qa`) defines responsibilities, boundaries, and acceptance criteria in `.team/roles/<role>.md`.
- A **provider** (`Codex` or `Antigravity`) is the CLI tool executing that role.
- Switching from a primary provider to its fallback (because of quota, availability, or Team Lead override) **never** changes the role's responsibilities or task acceptance criteria.

## 2. Default Terminal & Provider Routing

| Terminal | Role | Primary Provider | Fallback Provider | Default Profile | Typical Ownership |
| --- | --- | --- | --- | --- | --- |
| `TEAM-COORD` | `coordinator` | Antigravity | Codex | `FAST` | `.team/BOARD.md`, `.team/PROJECT.md`, `.team/tasks/**` |
| `TEAM-ARCH` | `architect` | Codex | Antigravity | `DEEP` | `.team/ARCHITECTURE.md`, `.team/decisions/**` |
| `TEAM-FE` | `frontend` | Antigravity | Codex | `STANDARD` | `src/components/**`, `src/app/**` (UI) |
| `TEAM-BE` | `backend` | Codex | Antigravity | `STANDARD` | `src/server/**`, `src/app/api/**` |
| `TEAM-DATA` | `data` | Antigravity | Codex | `STANDARD` | `prisma/**` |
| `TEAM-QA` | `qa` | Codex | Antigravity | `STANDARD` | Integrated verification (read-mostly + QA reports) |

Do not alter default ownership unless technically necessary for a task or explicitly requested by the Team Lead.

## 3. Visible CLI Terminals

Your workspace may have up to six visible terminal tabs or panes named after the team roles:

```text
TEAM-COORD   ACTIVE
TEAM-ARCH    IDLE
TEAM-FE      RUNNING T-014
TEAM-BE      RUNNING T-015
TEAM-DATA    BLOCKED
TEAM-QA      WAITING
```

- Not every terminal needs to be open or running simultaneously.
- Six terminal identities do **not** mean six agents constantly run in the background.
- There is **no background AI polling** and **no hidden autonomous spawning**. An explicitly opened Zankai dashboard refreshes local runtime records; an explicitly launched Codex session reports process heartbeats. The Team Lead manually starts a terminal only when `TEAM-COORD` (or the Team Lead) identifies a `READY` task to run.

## 4. Capability Profiles (`FAST`, `STANDARD`, `DEEP`)

Never hardcode specific model names inside `.team/roles/` or adapter files. Use logical capability profiles mapped in `config/ai-team.json`:

- **`FAST`**: Repository exploration, reading files, status checks, task planning, handoffs, documentation, and minor repetitive edits.
- **`STANDARD`**: Normal frontend, backend, and Prisma/PostgreSQL implementation, writing tests, routine debugging, and standard code review / QA.
- **`DEEP`**: Consequential architecture (`TEAM-ARCH`), difficult debugging, concurrency, security-sensitive reasoning, complex authorization, major refactors, and complex database design.

## 5. Usage Conservation Rules

1. Do not use six agents for trivial work (use the Small Task Exception to run `TEAM-FE` or `TEAM-BE` directly for tiny isolated fixes).
2. Do not involve `TEAM-ARCH` for every minor change.
3. Do not invoke `DEEP` reasoning for ordinary CRUD work.
4. Reuse `.team/tasks/T-NNN.md` and `.team/handoffs/` instead of rediscovering context across agents.
5. Prefer targeted file reads over scanning the entire repository.
6. Recommend **at most two concurrent write-heavy implementation tasks** by default unless the Team Lead explicitly requests more.

## 6. Manual Overrides

The Team Lead can override the assigned role, provider, model, or capability profile at any time when creating or updating a task:

```powershell
npm run zankai:assign -- T-001 backend antigravity standard
```
