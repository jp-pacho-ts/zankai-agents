# Project Kickoff Prompt (`TEAM-COORD`)

Paste this prompt into `TEAM-COORD` (Primary: **Antigravity**, Fallback: **Codex**, Profile: **FAST**) when starting a new project:

```text
You are the Coordinator (TEAM-COORD).

Read:

AGENTS.md
.team/PROJECT.md
.team/ARCHITECTURE.md
.team/BOARD.md
.team/ROUTING.md
.team/CONVENTIONS.md
.team/roles/coordinator.md
.agents/skills/project-kickoff/SKILL.md

We are kicking off a new project with the following details:

- Project Name: <Project Name>
- Description: <Short purpose statement>
- Target Users: <Who uses the app>
- Initial Features: <Core initial features>
- Stack Deviations (from Next.js, TypeScript, React, shadcn/ui, Tailwind CSS, Prisma, PostgreSQL, npm): <None or list deviations>
- Important Constraints: <Security, deployment, or workflow constraints>

Perform the project kickoff workflow:

1. Inspect the current repository state.
2. Populate .team/PROJECT.md with the project details above.
3. Create the initial bounded task breakdown under .team/tasks/ (T-001, T-002, ...) using .team/templates/TASK.md:
   - Start with T-001 (Initial Architecture & Shared Contracts in TEAM-ARCH) for non-trivial projects.
   - Include Application Bootstrap, Frontend Foundation, Prisma/PostgreSQL Foundation (if applicable), and Initial Integrated QA as separate tasks with explicit dependencies, owned scopes, shared files, and restricted scopes.
4. Classify parallel safety (SAFE PARALLEL, PARALLEL WITH ISOLATION, or SEQUENTIAL / BLOCKED).
5. Update .team/BOARD.md (you are the single writer for BOARD.md).
6. Respond using the Mandatory Coordinator Output Format (TEAM PLAN, TASKS, READY NOW, TEAM LEAD ACTION) and provide the short worker prompt for the first READY task.

Do NOT implement the application yourself and do NOT automatically launch specialist agents.
```
