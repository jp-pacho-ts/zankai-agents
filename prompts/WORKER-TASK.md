# Short Worker Task Prompt (`TEAM-ARCH`, `TEAM-FE`, `TEAM-BE`, `TEAM-DATA`, `TEAM-QA`)

Use this compact prompt when dispatching a specialist terminal (or generate it for a specific task with `npm run zankai:task -- T-001`):

```text
You are the <RoleTitle> (<TERMINAL>).

Read:

AGENTS.md
.team/PROJECT.md
.team/ARCHITECTURE.md
.team/roles/<role>.md
.team/tasks/<T-NNN>.md

Execute <T-NNN> only.

Respect its dependencies, owned scope, shared files, and restricted scope.

Do not modify .team/BOARD.md.

Create the required handoff in .team/handoffs/<T-NNN>-<role>-to-coordinator.md when complete.

Do not start another task.
```

## Example (`T-001` in `TEAM-ARCH`)

```text
You are the Architect (TEAM-ARCH).

Read:

AGENTS.md
.team/PROJECT.md
.team/ARCHITECTURE.md
.team/roles/architect.md
.team/tasks/T-001.md

Execute T-001 only.

Respect its dependencies, owned scope, shared files, and restricted scope.

Do not modify .team/BOARD.md.

Create the required handoff in .team/handoffs/T-001-architect-to-coordinator.md when complete.

Do not start another task.
```
