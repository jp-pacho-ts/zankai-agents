# Local agent monitoring and parallel work

Version 1.3.0 adds runtime tracking and coordination. Install with npm install -g zankai-agents@1.3.0, then open zankai dashboard inside an initialized project.

## Open the monitor

```powershell
zankai status
zankai status TEAM-BE
zankai status --json
zankai dashboard
# Equivalent live view:
zankai status --watch
# From the toolkit repository:
npm run status
```

The dashboard refreshes local records only. Up/Down selects a named agent; R refreshes; Q or Ctrl+C restores the terminal and exits. It shows connection health, reported work state, task, workspace, heartbeat and activity. No model context/token percentages are invented.

- untracked: no session was registered.
- connected: a recent heartbeat was reported.
- stale: no heartbeat for 45 seconds. The claim remains held until explicit release.
- exited: the session was explicitly finished or failed. This does not mean its task passed QA.

## Prepare independent tasks

Create task files with the existing new/assign commands. Complete objective, requirements, acceptance criteria, dependencies, owned/shared/restricted paths and verification before assigning them. Start FE/BE only after their shared API/types contract is established. Use relative scope patterns such as src/components/** and src/server/**; quote paths in backticks in Markdown. Avoid mixing explanations into unquoted path entries.

```powershell
zankai check T-001 T-002
zankai contract set customer-v1
```

The contract revision is a human-accepted identifier, not automatic proof that implementations conform to it. Once set, session registration requires the matching --contract. Changing it while sessions are active is blocked.

Commit the prepared tasks and shared contracts before creating isolated worktrees. A dirty primary workspace or missing Git base is rejected; Zankai does not commit changes for you.

```powershell
zankai worktree create T-001
zankai worktree create T-002
zankai worktree list
```

Worktrees are placed beside the project under .zankai-worktrees/PROJECT/T-NNN, on zankai/t-nnn branches. No worktree removal or merging is automated. Registered sessions for those tasks use the recorded workspace unless you supply another workspace from the same Git repository.

## Run Codex with automatic heartbeats

```powershell
zankai run TEAM-BE --task T-002 --contract customer-v1 --port 3101
```

This explicitly launches the installed Codex CLI in the task workspace with its worker prompt. It reports process liveness every five seconds and records the exit. A running process does not prove the model is making progress. --read-only also supplies Codex's read-only sandbox. Scopes are advisory; the audit detects out-of-scope changes after execution.

Automatic process monitoring currently supports Codex. Antigravity reporting uses the commands below; no unsupported Antigravity execution interface is assumed.

## Register an externally started agent

```powershell
zankai session start TEAM-FE --task T-001 --provider antigravity --contract customer-v1 --port 3100 --resource database:test-fe
```

Save the returned session ID. Your agent integration, wrapper or you must report activity and release the session:

```powershell
zankai session beat SESSION_ID --state working --activity "Building customer form"
zankai session beat SESSION_ID --state waiting --activity "Waiting for API contract clarification"
zankai session finish SESSION_ID
# Or explicitly record a failed session:
zankai session finish SESSION_ID --state failed
zankai session list
```

Independent reporting does not automatically observe an editor or terminal. Without reports, the session becomes stale. Use --read-only for review sessions that reserve no write paths.

Claims reject duplicate task/agent assignments, unfinished dependencies, overlapping scopes, two writers in one workspace, mismatched accepted contract revisions, different base commits across active writers, and duplicate ports/resources. Overlap detection is deliberately conservative for wildcard paths. --resource reserves an identifier; it does not create or isolate a database. Provision distinct test databases yourself when necessary.

## Review integration

```powershell
zankai audit SESSION_ID
```

The audit compares tracked and untracked changes against the session base commit and reserved scopes. It records an integration report and exits nonzero for violations. scope-clear is not merge approval or proof of semantic compatibility. Review the changes, integrate with explicit approval, then run QA on the combined result.

## Runtime storage and limitations

Git worktrees share a registry under the common Git directory at zankai/runtime.json. Projects without Git use .team/runtime/state.json. Atomic writes and a writer lock prevent simultaneous claims from both succeeding. A corrupt registry fails closed. An abandoned writer lock needs deliberate repair after checking the PID in write.lock/owner.json and confirming no writer is alive; it is never silently deleted.

No task is marked DONE by a process exit, and runtime commands do not update .team/BOARD.md. Task state and live-session state remain separate. Provider logs, automatic merges, scope-enforcing filesystem permissions, and deeper API compatibility checks are outside this first implementation.
