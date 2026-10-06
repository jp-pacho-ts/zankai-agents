# Zankai Agents: GitHub and installation guide

This guide uses PowerShell on Windows. Replace YOUR_USERNAME with your GitHub account name. Commands below are instructions; this guide does not upload or publish anything.

## What is available today

The package now provides a zankai executable. Install a tested local tarball or, after the changes are pushed, install from GitHub. It has not been published to npm. Registry name availability has not been verified.

From the source folder, build the package:

```powershell
npm pack
npm install -g ./zankai-agents-1.0.0.tgz
```

Then open any project directory, including one with no package.json:

```powershell
zankai init
zankai status
```

The initializer asks for name, website/system description, system requirements, users, features, stack deviations and constraints. It creates team context and clean workflow assets while preserving customized files. It does not scaffold a website or launch providers. Status reports routing and task metadata; live agent tracking and the dashboard remain planned.

Once this executable revision is pushed, GitHub installation will be:

```powershell
npm install -g git+https://github.com/jp-pacho-ts/zankai-agents.git
```

## Requirements

- Node.js 20 or later, with npm.
- Git and a GitHub account.
- Your chosen AI provider tools installed and authenticated separately when executing agent tasks. They are not bundled with this toolkit.

Check your tools:

```powershell
node --version
npm --version
git --version
```

## For the owner: put the source on GitHub

1. On GitHub, create a repository named zankai-agents. Choose public or private deliberately. For this first upload, leave README, license and .gitignore initialization unchecked because the source already exists locally. Choose a license before presenting the project as open-source.
2. Open PowerShell in the source folder:

```powershell
Set-Location "C:\Users\User\Documents\Code Projects\dev\zankai-agents"
```

3. Before staging, create or extend .gitignore without overwriting existing rules:

```gitignore
node_modules/
.env
.env.*
!.env.example
*.tgz
npm-debug.log*
.team/runtime/
```

Review .codex and other provider settings, project briefs, task files and handoffs before making the repository public. Keep credentials, machine-specific paths and private project information out of the upload. Do not ignore required role adapters wholesale.

4. If this folder is not already a Git repository, initialize it:

```powershell
git init -b main
```

If it already has Git history, preserve its existing branch and history instead.

5. Stage and inspect the initial upload:

```powershell
git add .
git diff --cached --stat
git diff --cached
```

After reviewing the staged content, commit it:

```powershell
git commit -m "Initial Zankai Agents toolkit"
```

6. Connect the empty GitHub repository and upload:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/zankai-agents.git
git push -u origin main
```

Use your actual branch name if different. If origin already exists, inspect it with git remote -v before changing anything. GitHub may ask you to authenticate through Git Credential Manager or your configured credential method.

## For users: install the current toolkit from GitHub

Once the owner has uploaded the source:

```powershell
git clone https://github.com/YOUR_USERNAME/zankai-agents.git
Set-Location zankai-agents
npm install
npm run zankai:status
```

Private repositories require authorized GitHub access. npm install may generate package-lock.json; it does not start agents or build a website.

## Start a website project with the current commands

From the cloned toolkit directory:

```powershell
npm run zankai:copy -- "C:\Projects\my-app"
Set-Location "C:\Projects\my-app"
npm run zankai:init
npm run zankai:status
```

Use a new folder first. Do not add --force when copying into an existing project unless you intend to replace toolkit files. The initializer asks for the name, description, users, features, stack deviations, conventions and constraints. It prepares team context; it does not scaffold the website.

Open your coordinator provider session in the target project and give it prompts/PROJECT-KICKOFF.md together with your project brief. The existing role prompts describe manual task dispatch and handoffs. Inspect assignments with:

```powershell
npm run zankai:show -- T-001
```

Current zankai:status reports configured routing, provider command detection and task metadata. It does not establish whether agents are actively running. Multiple terminals need explicit task ownership; use separate Git worktrees for concurrent implementation and agree on shared API contracts before FE/BE work.

## Future npm registry release

The executable and bundled assets are implemented. Registry publication still requires release testing, package ownership and explicit publication.

Local project installation from GitHub after this revision is pushed:

```powershell
npm install --save-dev github:YOUR_USERNAME/zankai-agents
npx --no-install zankai init
npx --no-install zankai status
```

For reproducibility, release instructions should pin a tested Git tag or commit. Installing from GitHub requires the package to contain its runnable CLI and required assets.

Proposed registry installation after publication under a name you own:

```powershell
npm install --save-dev zankai
npx --no-install zankai init
npx --no-install zankai status
```

If zankai is unavailable, use an owned scoped package such as @YOUR_NPM_USERNAME/zankai; it can still expose the executable named zankai.

## Owner release preparation

After implementation, inspect and test a local package before publishing:

```powershell
npm pack --dry-run --json
npm pack
```

Verify the tarball contains the CLI and clean templates, but excludes credentials, live task/session records and project history. Test installation from that local tarball. Keep private:true until preparing an intentional npm release; that setting prevents registry publishing. Confirm the package name, license, repository URL and publishing account before a separate publication step.

## Troubleshooting

- Missing npm: install Node.js, then reopen PowerShell.
- Missing zankai:* script: run the command inside the cloned toolkit or initialized target project containing those scripts.
- Missing zankai executable: install the executable revision globally, or use npx --no-install zankai from a project where it is installed. Reopen the terminal if your npm global bin folder was added to PATH.
- Provider not detected: confirm its configured executable is installed and available on PATH. Detection is not authentication or a health check.
- Permission denied cloning/pushing: check repository access and GitHub authentication.
- Folder rename blocked: close applications and terminals using that directory.

## References

- [GitHub: adding locally hosted code](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)
- [npm installation, including GitHub packages](https://docs.npmjs.com/cli/v11/commands/npm-install/)
- [npm package configuration: bin, files and private](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/)
