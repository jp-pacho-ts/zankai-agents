#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { ROOT, TEAM_DIR, UNINITIALIZED, ensureKnownOptions, fail, isDirectExecution, parseArgs, readJson, readText, relative, updateBoard, writeText } from './team-lib.mjs';

import { createWizardUI } from './zankai-terminal.mjs';
import { collectInitAnswers } from './zankai-conversation.mjs';
import { prepareWorkspace } from './zankai-workspace.mjs';

function projectField(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

function replaceOnlyTemplate(file, content) {
  if (fs.existsSync(file) && !readText(file).includes(UNINITIALIZED)) {
    console.log(`Preserved ${relative(file)} (already initialized or customized).`);
    return false;
  }
  writeText(file, content);
  console.log(`Initialized ${relative(file)}.`);
  return true;
}

export async function runInit(args) {
  const { positional, options } = args;
  ensureKnownOptions(options, ['name', 'description', 'requirements', 'users', 'features', 'stack', 'conventions', 'constraints', 'yes', 'ai']);
  if (positional.length) {
    fail('Usage: npm run zankai:init -- [--name "Project name"] [--description "..."] [--requirements "..."] [--users "..."] [--features "..."] [--stack "..."] [--conventions "..."] [--constraints "..."]');
  }
  if(options.ai && !['codex','off'].includes(options.ai)) fail('Choose --ai codex or --ai off.');
  if(options.ai === 'codex' && (!stdin.isTTY || options.yes)) fail('AI planning requires an interactive terminal. Remove --yes, or use --ai off.');
  const pkgPath = path.join(ROOT, 'package.json');
  const pkg = fs.existsSync(pkgPath) ? readJson(pkgPath) : {};
  const suggestedName = pkg.name && pkg.name !== 'zankai-agents' && pkg.name !== 'ai-web-development-team-template' ? pkg.name : path.basename(ROOT);
  let values = {
    name: projectField(options.name),
    description: projectField(options.description),
    requirements: projectField(options.requirements),
    users: projectField(options.users),
    features: projectField(options.features),
    stack: projectField(options.stack),
    conventions: projectField(options.conventions),
    constraints: projectField(options.constraints)
  };
  if (stdin.isTTY && !options.yes) {
    const prompt = createInterface({ input: stdin, output: stdout });
    const controller = new AbortController();
    const cancel = () => controller.abort();
    prompt.on('SIGINT',cancel);
    const ask = label => new Promise((resolve,reject)=>{
      const abort=()=>reject(new Error('Setup cancelled. No project files were written.'));
      const closed=()=>{controller.abort();abort();};
      controller.signal.addEventListener('abort',abort,{once:true});
      prompt.once('close',closed);
      prompt.question(label).then(resolve,reject).finally(()=>{controller.signal.removeEventListener('abort',abort);prompt.removeListener('close',closed);});
    });
    try {
      values = await collectInitAnswers(values, suggestedName, ask, {aiMode:options.ai,signal:controller.signal});
      if (!values) { console.log('Setup cancelled. No project files were written.'); return; }
    } finally {
      prompt.removeListener('SIGINT',cancel);
      prompt.close();
    }
  }
  if (!values.name || !values.description) {
    fail('Project name and description are required. In a noninteractive shell, pass --name and --description.');
  }
  values.requirements ||= 'To be clarified during planning';
  values.users ||= 'General web users';
  values.features ||= 'Core application foundation';
  values.stack ||= 'None recorded';
  values.conventions ||= 'None recorded';
  values.constraints ||= 'None recorded';

  const project = `# Project Context

- **Project Name:** ${values.name}
- **Description:** ${values.description}
- **Target Users:** ${values.users}
- **Team Lead:** Human Owner
- **Package Manager:** \`npm\`

## Initial Features & Goals

${values.features}

## System Requirements

${values.requirements}

## Suggested Assumptions

${values.assumptions?.length ? values.assumptions.map(item => '- Unconfirmed: ' + projectField(item)).join('\n') : 'None recorded.'}

## Standard Stack & Deviations

Web stack preset: Next.js, TypeScript, React, shadcn/ui, Tailwind CSS, Prisma, PostgreSQL, and \`npm\`. The selected preference below takes precedence.

- **Stack Deviations:** ${values.stack}

## Repository Conventions & Constraints

- **Conventions:** ${values.conventions}
- **Important Constraints:** ${values.constraints}

## Working Agreement

- **Owner of this file:** Coordinator (\`TEAM-COORD\`) / Team Lead.
- **Single-writer board rule:** Only \`TEAM-COORD\` updates \`.team/BOARD.md\`.
- **Manual dispatch:** \`TEAM-COORD\` plans and recommends; the human Team Lead manually starts specialist terminals (\`TEAM-ARCH\`, \`TEAM-FE\`, \`TEAM-BE\`, \`TEAM-DATA\`, \`TEAM-QA\`).
- **Approval Authority:** The human Team Lead retains final authority over \`RED\` decisions (architecture replacement, destructive database operations, production deployment, force push, and merging).
`;

  const architecture = `# Architecture

## Project Overview

${values.description}

## Technology Stack

Web stack preset: Next.js, TypeScript, React, shadcn/ui, Tailwind CSS, Prisma, PostgreSQL, and \`npm\`. Resolve actual choices from the preference below and existing project.
Stack deviations: ${values.stack}

## System Boundaries

- **Application & Domain Boundaries:** Document actual module organization (\`src/app/**\`, \`src/components/**\`, \`src/server/**\`, \`prisma/**\`) after inspecting or bootstrapping the repository.
- **Server / Client Boundaries:** Specify Next.js Server Components vs. Client Components, Server Actions, and Route Handlers.

## Shared Contracts (Required Before Parallel Work)

Before \`TEAM-FE\`, \`TEAM-BE\`, and \`TEAM-DATA\` execute in parallel on a multi-role feature, \`TEAM-ARCH\` establishes shared contracts here or in \`.team/decisions/\`:
- API shapes and request/response types
- Domain types and enum values
- Prisma entity names and relations
- Validation rules (Zod) and authentication/authorization rules

## Architecture Decision Records (ADRs)

Record consequential decisions in \`.team/decisions/ADR-NNN-*.md\` using \`.team/templates/ADR.md\`.
`;

  prepareWorkspace(ROOT);
  fs.mkdirSync(TEAM_DIR, { recursive: true });
  replaceOnlyTemplate(path.join(TEAM_DIR, 'PROJECT.md'), project);
  replaceOnlyTemplate(path.join(TEAM_DIR, 'ARCHITECTURE.md'), architecture);
  updateBoard();
  console.log('Updated .team/BOARD.md task table.');
  createWizardUI().done();
}

if (isDirectExecution(import.meta.url)) {
  try {
    await runInit(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(`Team CLI: ${error.message}`);
    process.exitCode = 1;
  }
}
