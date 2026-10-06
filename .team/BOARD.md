# Team Board

> **Single-Writer Rule:** Only `TEAM-COORD` (Coordinator) or the human Team Lead (via `npm run zankai:board` / `npm run zankai:init`) may update `.team/BOARD.md`. Specialist workers (`TEAM-ARCH`, `TEAM-FE`, `TEAM-BE`, `TEAM-DATA`, `TEAM-QA`) must **never** directly modify `.team/BOARD.md`; they report completion and status through `.team/handoffs/`.

<!-- AI_TEAM_BOARD_START -->
BACKLOG: 0 · READY: 1 · IN_PROGRESS: 0 · BLOCKED: 6 · READY_FOR_QA: 0 · QA_FAILED: 0 · DONE: 0

| ID | Title | Status | Role | Terminal | Provider | Profile | Parallelism | Dependencies |
|---|---|---|---|---|---|---|---|---|
| [T-001](tasks/T-001.md) | Define Zankai CLI and runtime contracts | READY | Architect | TEAM-ARCH | Codex | DEEP | SEQUENTIAL / BLOCKED | None |
| [T-002](tasks/T-002.md) | Implement Zankai runtime registry | BLOCKED | Backend | TEAM-BE | Codex | STANDARD | SEQUENTIAL / BLOCKED | T-001 |
| [T-003](tasks/T-003.md) | Implement Zankai project wizard and command entry point | BLOCKED | Backend | TEAM-BE | Codex | STANDARD | SEQUENTIAL / BLOCKED | T-001, T-002 |
| [T-004](tasks/T-004.md) | Implement Zankai terminal status dashboard | BLOCKED | Frontend | TEAM-FE | Antigravity | STANDARD | SEQUENTIAL / BLOCKED | T-001, T-002, T-003, T-006 |
| [T-005](tasks/T-005.md) | Verify integrated Zankai CLI | BLOCKED | QA | TEAM-QA | Codex | STANDARD | SEQUENTIAL / BLOCKED | T-002, T-003, T-004, T-006, T-007 |
| [T-006](tasks/T-006.md) | Implement parallel task coordination and integration checks | BLOCKED | Backend | TEAM-BE | Codex | STANDARD | SEQUENTIAL / BLOCKED | T-001, T-002, T-003 |
| [T-007](tasks/T-007.md) | Prepare installable Zankai npm package | BLOCKED | Backend | TEAM-BE | Codex | STANDARD | SEQUENTIAL / BLOCKED | T-001, T-003, T-004, T-006 |
<!-- AI_TEAM_BOARD_END -->
