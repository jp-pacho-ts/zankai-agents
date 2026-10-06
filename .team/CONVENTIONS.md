# Team Conventions & Parallel Safety

## 1. Core Philosophy

> **The Coordinator plans and recommends.**
> **The Team Lead dispatches.**
> **Specialist agents execute.**
> **Handoffs report results.**
> **The Coordinator determines what becomes ready next.**

- The human **Team Lead** is in control of dispatching agents, approving architecture, authorizing `RED` operations, and merging work.
- `TEAM-COORD` must **never** silently launch specialist agents or act as the default programmer.
- Specialist workers execute only their assigned `T-NNN` task and stop when their handoff is recorded.

## 2. Standard Stack & Package Manager

- Default stack: **Next.js, TypeScript, React, shadcn/ui, Tailwind CSS, Prisma, PostgreSQL, and `npm`**.
- Always use `npm`. Never switch to `pnpm`, `yarn`, or `bun` unless the target project explicitly overrides this in `.team/PROJECT.md`.
- Keep the workflow reusable even if a project omits Prisma, PostgreSQL, or shadcn/ui.

## 3. Single Writer for `.team/BOARD.md`

- **Only `TEAM-COORD` (Coordinator)** updates `.team/BOARD.md` (or the Team Lead running `npm run zankai:board`).
- Specialist workers (`TEAM-ARCH`, `TEAM-FE`, `TEAM-BE`, `TEAM-DATA`, `TEAM-QA`) must **not** edit `.team/BOARD.md`.
- Specialists report progress and completion exclusively by writing handoff files in `.team/handoffs/` and updating their assigned task metadata when appropriate.

## 4. File Ownership Defaults

Task-level scope in `.team/tasks/T-NNN.md` always takes precedence, but default ownership is:

| Path / Area | Default Owner |
| --- | --- |
| `.team/BOARD.md` | Coordinator (`TEAM-COORD`) **only** |
| `.team/PROJECT.md` | Coordinator (`TEAM-COORD`) / Team Lead |
| `.team/ARCHITECTURE.md` | Architect (`TEAM-ARCH`) |
| `.team/decisions/**` | Architect (`TEAM-ARCH`) |
| `src/components/**` | Frontend (`TEAM-FE`) |
| `src/app/**` (UI pages/layouts) | Frontend (`TEAM-FE`) |
| `src/server/**`, `src/app/api/**` | Backend (`TEAM-BE`) |
| `prisma/**` | Data (`TEAM-DATA`) |

## 5. Shared Contracts Before Parallel Work

Before `TEAM-FE`, `TEAM-BE`, and `TEAM-DATA` work in parallel on a multi-role feature, `TEAM-ARCH` must define shared contracts in `.team/ARCHITECTURE.md` or `.team/decisions/`:
- API shapes and request/response types
- Domain types and enum values (e.g., `UserRole = ADMIN | USER`)
- Prisma entity names and relations
- Validation schemas (Zod) and auth/authorization rules

## 6. Parallelism Classification

Before recommending parallel execution, `TEAM-COORD` evaluates dependencies, owned scope, shared files, restricted scope, and contracts, classifying tasks into one of three levels:

1. **`SAFE PARALLEL`**:
   - Tasks have no unmet dependencies, stable contracts, and completely non-overlapping `Owned scope` with no shared-file edits (e.g., `TEAM-FE` in `src/components/dashboard/**` and `TEAM-BE` in `src/server/reports/**`).
2. **`PARALLEL WITH ISOLATION`**:
   - Tasks are logically independent but may touch shared project files (`package.json`, `package-lock.json`, `.env.example`, `tsconfig.json`, middleware, or shared types).
   - **Requires separate Git worktrees** so concurrent agents never corrupt a shared working tree.
3. **`SEQUENTIAL / BLOCKED`**:
   - One task depends on the output of another (e.g., `T-022` Backend depends on `T-021` Data's Prisma schema). Keep the dependent task `BLOCKED` until its prerequisite is `DONE` (or its required contract/schema is integrated).

## 7. Git Worktrees for Parallel Isolation

For `PARALLEL WITH ISOLATION` or concurrent write-heavy tasks, use Git worktrees from the project root:

```powershell
git worktree add ..\project-be -b ai/T-014-backend
git worktree add ..\project-fe -b ai/T-015-frontend
git worktree add ..\project-data -b ai/T-016-data
```

Run each terminal (`TEAM-BE`, `TEAM-FE`, `TEAM-DATA`) inside its dedicated worktree directory. Do not automatically create or delete worktrees without Team Lead awareness, and never run destructive Git commands (`reset --hard`, `push --force`, branch deletion) without explicit Team Lead approval.

## 8. Integrated QA Rule (`TEAM-QA`)

- `TEAM-QA` validates the **integrated branch/state** combining work from `TEAM-FE`, `TEAM-BE`, and `TEAM-DATA`—not just isolated worker branches.
- Never claim a command passed unless it was actually executed and exited cleanly. Unrun checks must be recorded as `not run`.

## 9. Small Task Exception

For trivial, isolated single-role fixes (e.g., fixing a button style in `TEAM-FE` or a small helper in `TEAM-BE`), the Team Lead may dispatch the specialist terminal directly without full Coordinator ceremony. Major features, multi-role work, schema changes, and architectural work always start with `TEAM-COORD`.

## 10. Approval Levels (`GREEN` / `YELLOW` / `RED`)

- **`GREEN` (Proceed):** Scoped implementation, unit/integration tests, local refactors within owned scope, type fixes, a11y/loading/error states.
- **`YELLOW` (Propose & Inform Team Lead):** Adding significant dependencies, API contract changes, schema expansion beyond task scope, cross-module refactors, major config edits.
- **`RED` (Explicit Team Lead Approval Required):** Destructive DB operations (`DROP TABLE`, `DROP COLUMN`, destructive type/data migrations), deleting major features, replacing auth architecture, production deployment, force push, destructive Git operations, or major architecture changes.
