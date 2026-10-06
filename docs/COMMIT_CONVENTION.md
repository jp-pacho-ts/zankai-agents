# Git commit convention

Use this format for Zankai Agents changes:

```text
type(scope): short description
```

Write the description as an action, in lowercase where natural, without a final period. Aim for a subject of 72 characters or fewer. Use the body to explain why the change was needed and any meaningful compatibility impact.

## Types

| Type | Use |
| --- | --- |
| feat | New behavior or capability |
| fix | Correct broken behavior |
| docs | Documentation only |
| refactor | Code restructuring without a behavior change |
| test | Add or change verification |
| chore | Maintenance and configuration |
| build | Packaging or dependency changes |
| ci | Automation workflow changes |
| perf | Performance improvements |
| revert | Undo an earlier change |

## Scopes

Use a short affected area, such as cli, wizard, status, runtime, coordination, package, templates, or workflow. Omit the scope if the change covers the whole project.

## Examples

```text
feat(wizard): collect project name and stack preferences
fix(cli): initialize the selected project directory
docs(install): explain GitHub installation
chore(cli): rename team commands to zankai
```

For an incompatible change, add ! after the type or scope and explain it in a BREAKING CHANGE footer:

```text
chore(cli)!: rename team commands to zankai

BREAKING CHANGE: replace npm run team:init with npm run zankai:init
and migrate the remaining team:* commands to zankai:*.
```

Reference a task or issue in the body or footer when relevant, for example Refs: T-003. Keep commits focused; do not include unrelated changes or claim checks that were not executed.

## Before committing and pushing

```powershell
git status --short
git diff
git add <specific-files>
git diff --cached --check
git diff --cached --stat
git commit -m "type(scope): describe the change"
git push
```

Inspect staged content and run checks appropriate to the change. Keep credentials, .env files, local runtime records and generated package tarballs out of commits. Use normal pushes; do not force-push shared history.

This convention is documented guidance; no automatic commit-message hook is installed.
