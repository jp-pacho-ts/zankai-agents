# Project Context

Run `npm run zankai:init` after copying this template into a project, or have `TEAM-COORD` initialize it during project kickoff (`prompts/PROJECT-KICKOFF.md`).

- **Project Name:** Zankai Agents
- **Description:** Rebuild the existing human-controlled agent team template into a local interactive project setup CLI and named-agent terminal dashboard for Codex and Antigravity.
- **Target Users:** Developers coordinating AI specialists on one Windows machine.
- **Team Lead:** Human Owner
- **Package Manager:** `npm` (do not switch to `pnpm`, `yarn`, or `bun` unless explicitly overridden here)

## Initial Features & Goals

- T-001: Establish CLI, project configuration and runtime contracts.
- T-002: Implement named session registration, heartbeat and exit tracking.
- T-003: Implement interactive project wizard and `npm run zankai` entry point.
- T-004: Implement `npm run status` dashboard, named filtering and JSON output.
- T-005: Verify the integrated result independently.
- T-007: Prepare installable npm CLI with `zankai init` and `zankai status`, then verify the packed artifact before release. Desired package name `zankai` is not verified available or owned. GitHub hosting and npm publication are separate later release steps.
- T-006: Implement parallel task claims, worktree preparation, scope checks, contract change requests and a human-controlled integration queue before T-004 and T-005.
- Target workflow: accepted shared contract -> simultaneous FE/BE tasks in separate worktrees -> reviewed integration -> integrated QA. All provider dispatch remains manual.
- Preserve existing `zankai:*` utilities and manual specialist dispatch. MVP prepares project context; website implementation remains assigned specialist work.

## Standard Stack & Deviations

Default team stack: Next.js, TypeScript, React, shadcn/ui, Tailwind CSS, Prisma, PostgreSQL, and `npm`.

- **Stack Deviations:** The Zankai tooling itself extends the existing Node.js >=20 ESM `.mjs` scripts with npm. The web stack above is a project wizard preset, not a requirement to turn the CLI into a Next.js application. No new major dependencies approved yet.

## Repository Conventions & Constraints

- **Conventions:** None recorded yet.
- **Important Constraints:** Local-only MVP; no npm publishing, hidden agent spawning or automatic fallback. Runtime state must be separate from task/board state. Provider CLI detection does not establish a running session. Preserve existing target-project files. No Git repository was detected on 2026-10-07; implementation is sequential until isolation is available.

## Working Agreement

- **Owner of this file:** Coordinator (`TEAM-COORD`) / Team Lead.
- **Single-writer board rule:** Only `TEAM-COORD` updates `.team/BOARD.md`.
- **Manual dispatch:** `TEAM-COORD` plans and recommends; the human Team Lead manually starts specialist terminals (`TEAM-ARCH`, `TEAM-FE`, `TEAM-BE`, `TEAM-DATA`, `TEAM-QA`).
- **Approval Authority:** The human Team Lead retains final authority over `RED` decisions (architecture replacement, destructive database operations, production deployment, force push, and merging).
