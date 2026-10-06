#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { BOARD_END, BOARD_START, ROOT, UNINITIALIZED, ensureKnownOptions, fail, isDirectExecution, parseArgs, readJson, writeText } from './team-lib.mjs';

const COPY_DIRS = [
  '.agents',
  '.codex',
  'config',
  'prompts',
  'scripts',
  path.join('.team', 'roles'),
  path.join('.team', 'templates')
];

const COPY_FILES = [
  'AGENTS.md',
  path.join('.team', 'ROUTING.md'),
  path.join('.team', 'CONVENTIONS.md')
];

function copyRecursive(src, dest, force = false) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry), force);
    }
    return;
  }
  if (fs.existsSync(dest) && !force) {
    console.log(`Skipped existing ${dest}`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`Copied ${dest}`);
}

export function runCopy(args) {
  const { positional, options } = args;
  ensureKnownOptions(options, ['force']);
  if (positional.length !== 1 || !positional[0].trim()) {
    fail('Usage: npm run zankai:copy -- <target-project-directory> [--force]');
  }
  const targetRoot = path.resolve(ROOT, positional[0].trim());
  if (targetRoot === ROOT) {
    fail('Target directory must be different from the template repository root.');
  }
  fs.mkdirSync(targetRoot, { recursive: true });

  for (const relDir of COPY_DIRS) {
    copyRecursive(path.join(ROOT, relDir), path.join(targetRoot, relDir), Boolean(options.force));
  }
  for (const relFile of COPY_FILES) {
    copyRecursive(path.join(ROOT, relFile), path.join(targetRoot, relFile), Boolean(options.force));
  }

  // Copy README.md (or write README-AI-TEAM.md if target already has its own README.md)
  const srcReadme = path.join(ROOT, 'README.md');
  const destReadme = path.join(targetRoot, 'README.md');
  if (fs.existsSync(srcReadme)) {
    if (!fs.existsSync(destReadme) || options.force) {
      copyRecursive(srcReadme, destReadme, true);
    } else {
      copyRecursive(srcReadme, path.join(targetRoot, 'README-AI-TEAM.md'), true);
    }
  }

  // Initialize fresh uninitialized context files and empty task/handoff/decision folders
  const freshProject = `${UNINITIALIZED}\n# Project Context\n\nRun \`npm run zankai:init\` after copying this template into a project.\n`;
  const freshArch = `${UNINITIALIZED}\n# Architecture\n\nRun \`npm run zankai:init\` after copying this template into a project.\n`;
  const freshBoard = `${UNINITIALIZED}\n# Team Board\n\n> **Single-Writer Rule:** Only \`TEAM-COORD\` updates \`.team/BOARD.md\`.\n\n${BOARD_START}\nBACKLOG: 0 · READY: 0 · IN_PROGRESS: 0 · BLOCKED: 0 · READY_FOR_QA: 0 · QA_FAILED: 0 · DONE: 0\n\n| ID | Title | Status | Role | Terminal | Provider | Profile | Parallelism | Dependencies |\n|---|---|---|---|---|---|---|---|---|\n| — | No tasks yet | — | — | — | — | — | — | — |\n${BOARD_END}\n`;

  const projectPath = path.join(targetRoot, '.team', 'PROJECT.md');
  const archPath = path.join(targetRoot, '.team', 'ARCHITECTURE.md');
  const boardPath = path.join(targetRoot, '.team', 'BOARD.md');
  if (!fs.existsSync(projectPath)) writeText(projectPath, freshProject);
  if (!fs.existsSync(archPath)) writeText(archPath, freshArch);
  if (!fs.existsSync(boardPath)) writeText(boardPath, freshBoard);

  for (const emptyDir of ['tasks', 'handoffs', 'decisions']) {
    const dirPath = path.join(targetRoot, '.team', emptyDir);
    fs.mkdirSync(dirPath, { recursive: true });
    const gitkeep = path.join(dirPath, '.gitkeep');
    if (!fs.existsSync(gitkeep)) fs.writeFileSync(gitkeep, '', 'utf8');
  }

  // Merge or create package.json scripts safely without overwriting existing dependencies
  const templatePkg = readJson(path.join(ROOT, 'package.json'));
  const targetPkgPath = path.join(targetRoot, 'package.json');
  if (!fs.existsSync(targetPkgPath)) {
    const newPkg = {
      name: path.basename(targetRoot).toLowerCase().replace(/[^a-z0-9-_]/g, '-') || 'my-web-project',
      version: '0.1.0',
      private: true,
      type: 'module',
      scripts: { ...templatePkg.scripts }
    };
    writeText(targetPkgPath, `${JSON.stringify(newPkg, null, 2)}\n`);
    console.log(`Created ${targetPkgPath} with zankai:* scripts.`);
  } else {
    const targetPkg = readJson(targetPkgPath);
    targetPkg.scripts ||= {};
    let added = 0;
    for (const [key, val] of Object.entries(templatePkg.scripts || {})) {
      if (!targetPkg.scripts[key]) {
        targetPkg.scripts[key] = val;
        added++;
      }
    }
    writeText(targetPkgPath, `${JSON.stringify(targetPkg, null, 2)}\n`);
    console.log(`Updated ${targetPkgPath} (${added} zankai:* script(s) added; existing scripts and dependencies preserved).`);
  }

  console.log(`\nTemplate copied to ${targetRoot} with clean task/handoff/decision state.`);
  console.log(`Next steps:\n  cd "${targetRoot}"\n  npm run zankai:init`);
}

if (isDirectExecution(import.meta.url)) {
  try {
    runCopy(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(`Team CLI: ${error.message}`);
    process.exitCode = 1;
  }
}
