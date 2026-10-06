#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { ROOT, TEAM_DIR, UNINITIALIZED, ensureKnownOptions, fail, isDirectExecution, parseArgs, readJson, readText, relative, updateBoard, writeText } from './team-lib.mjs';

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
  ensureKnownOptions(options, ['name', 'description', 'requirements', 'users', 'features', 'stack', 'conventions', 'constraints', 'yes']);
  if (positional.length) {
    fail('Usage: npm run zankai:init -- [--name "Project name"] [--description "..."] [--requirements "..."] [--users "..."] [--features "..."] [--stack "..."] [--conventions "..."] [--constraints "..."]');
  }
  const pkgPath = path.join(ROOT, 'package.json');
  const pkg = fs.existsSync(pkgPath) ? readJson(pkgPath) : {};
  const suggestedName = pkg.name && pkg.name !== 'zankai-agents' && pkg.name !== 'ai-web-development-team-template' ? pkg.name : path.basename(ROOT);
  const values = {
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
    try {
      const questions = [
        ['name', 'Project name', suggestedName],
        ['description', 'Describe the website or system you want to build', ''],
        ['requirements', 'System requirements (workflows, roles, integrations, security or performance)', 'To be clarified during planning'],
        ['users', 'Target users', 'General web users'],
        ['features', 'Initial features', 'Core application foundation'],
        ['stack', 'Stack deviations from Next.js/TypeScript/React/shadcn/ui/Tailwind/Prisma/PostgreSQL/npm', 'None recorded'],
        ['conventions', 'Repository conventions', 'None recorded'],
        ['constraints', 'Important constraints', 'None recorded']
      ];
      for (const [key, label, fallback] of questions) {
        if (!values[key]) values[key] = projectField(await prompt.question(`${label}${fallback ? ` [${fallback}]` : ''}: `)) || fallback;
      }
    } finally {
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

## Standard Stack & Deviations

Default team stack: Next.js, TypeScript, React, shadcn/ui, Tailwind CSS, Prisma, PostgreSQL, and \`npm\`.

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

Default stack assumption: Next.js, TypeScript, React, shadcn/ui, Tailwind CSS, Prisma, PostgreSQL, and \`npm\`.
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
  console.log('Next step: open TEAM-COORD and run the prompt in prompts/PROJECT-KICKOFF.md.');
}

if (isDirectExecution(import.meta.url)) {
  try {
    await runInit(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(`Team CLI: ${error.message}`);
    process.exitCode = 1;
  }
}
