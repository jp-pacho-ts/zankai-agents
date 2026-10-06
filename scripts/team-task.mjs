#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  PARALLELISM_LEVELS,
  PROFILES,
  PROVIDERS,
  ROLES,
  ROOT,
  TASK_DIR,
  assertChoice,
  chooseRoute,
  classifyParallelism,
  ensureKnownOptions,
  fail,
  isDirectExecution,
  listTasks,
  loadConfig,
  parseArgs,
  printLaunchPrompt,
  readTask,
  readText,
  setTaskMetadata,
  taskPath,
  taskSection,
  unmetDependencies,
  updateBoard,
  writeTask
} from './team-lib.mjs';
import { runBoard } from './team-board.mjs';

export { runBoard };

export function runNew(args) {
  const { positional, options } = args;
  ensureKnownOptions(options, ['role', 'provider', 'profile', 'parallelism']);
  if (positional.length !== 1 || !positional[0].trim()) {
    fail('Usage: npm run zankai:new -- "Task title" [--role frontend] [--provider antigravity] [--profile standard] [--parallelism "SAFE PARALLEL"]');
  }
  const title = positional[0].replace(/[\r\n]+/g, ' ').trim();
  if (title.length > 160) fail('Task title must be 160 characters or fewer.');
  const config = loadConfig();
  const role = options.role ? assertChoice(options.role, ROLES, 'role') : 'coordinator';
  const route = chooseRoute(config, role, {
    provider: options.provider,
    profile: options.profile
  });
  const parallelism = options.parallelism
    ? assertChoice(options.parallelism, PARALLELISM_LEVELS, 'parallelism')
    : 'SEQUENTIAL / BLOCKED';

  const templatePath = path.join(ROOT, '.team', 'templates', 'TASK.md');
  if (!fs.existsSync(templatePath)) fail('Missing .team/templates/TASK.md. Copy the full team template.');
  const template = readText(templatePath);
  if (!template.includes('{{TASK_ID}}') || !template.includes('{{TITLE}}')) {
    fail('Task template needs {{TASK_ID}} and {{TITLE}} placeholders.');
  }
  fs.mkdirSync(TASK_DIR, { recursive: true });
  let next = Math.max(0, ...listTasks().map(task => Number(task.id.slice(2)))) + 1;
  let file;
  let id;
  while (true) {
    id = `T-${String(next).padStart(3, '0')}`;
    file = taskPath(id);
    try {
      const fd = fs.openSync(file, 'wx');
      try {
        const content = template
          .replaceAll('{{TASK_ID}}', id)
          .replaceAll('{{TITLE}}', title)
          .replaceAll('{{ROLE}}', route.role)
          .replaceAll('{{TERMINAL}}', route.terminal)
          .replaceAll('{{PRIMARY_PROVIDER}}', route.providerName)
          .replaceAll('{{FALLBACK_PROVIDER}}', route.fallbackName)
          .replaceAll('{{PROFILE}}', route.profile)
          .replaceAll('{{PARALLELISM}}', parallelism);
        fs.writeFileSync(fd, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
      } finally {
        fs.closeSync(fd);
      }
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      next++;
    }
  }
  updateBoard();
  console.log(`Created .team/tasks/${id}.md (BACKLOG) → ${route.terminal} (${route.role} / ${route.providerName} / ${route.profile}).`);
  console.log('Fill the objective, requirements, acceptance criteria, dependencies, owned scope, shared files, restricted scope, and verification before dispatching.');
  console.log(`Then run: npm run zankai:assign -- ${id} ${route.role}`);
}

export function runTask(args) {
  const { positional, options } = args;
  ensureKnownOptions(options, ['role', 'provider', 'profile']);
  if (positional.length !== 1) {
    fail('Usage: npm run zankai:task -- T-001 [--role frontend] [--provider antigravity] [--profile standard]');
  }
  const task = readTask(positional[0]);
  console.log(task.content.trimEnd());
  const config = loadConfig();
  const role = options.role
    ? assertChoice(options.role, ROLES, 'role')
    : (ROLES.includes(task.meta.role) ? task.meta.role : 'coordinator');
  const route = chooseRoute(config, role, {
    provider: options.provider || (role === task.meta.role && PROVIDERS.includes(task.meta.provider) ? task.meta.provider : undefined),
    profile: options.profile || (role === task.meta.role && PROFILES.includes(task.meta.profile.toLowerCase()) ? task.meta.profile.toLowerCase() : undefined)
  });
  printLaunchPrompt(task, route);
}

export function runAssign(args) {
  const { positional, options } = args;
  ensureKnownOptions(options, ['parallelism']);
  if (positional.length < 1 || positional.length > 4) {
    fail('Usage: npm run zankai:assign -- T-001 [role] [provider] [profile] [--parallelism "SAFE PARALLEL"]');
  }
  const task = readTask(positional[0]);
  if (task.meta.status === 'DONE') fail(`${task.id} is DONE. Create a new task for follow-up work.`);
  if (!positional[1] && !ROLES.includes(task.meta.role)) {
    fail(`${task.id} has no Owner role. Pass a role explicitly, e.g.: npm run zankai:assign -- ${task.id} frontend`);
  }
  const role = positional[1] ? assertChoice(positional[1], ROLES, 'role') : task.meta.role;
  const explicitProvider = positional[2] ? assertChoice(positional[2], PROVIDERS, 'provider') : undefined;
  const explicitProfile = positional[3] ? assertChoice(positional[3], PROFILES, 'profile') : undefined;
  const config = loadConfig();
  const preserveExisting = role === task.meta.role && !explicitProvider;
  const route = chooseRoute(config, role, {
    provider: explicitProvider || (preserveExisting && PROVIDERS.includes(task.meta.provider) ? task.meta.provider : undefined),
    profile: explicitProfile || (preserveExisting && PROFILES.includes(task.meta.profile.toLowerCase()) ? task.meta.profile.toLowerCase() : undefined)
  });

  let content = setTaskMetadata(task.content, 'Owner role', route.role);
  content = setTaskMetadata(content, 'Terminal', route.terminal);
  content = setTaskMetadata(content, 'Primary provider', route.providerName);
  content = setTaskMetadata(content, 'Fallback provider', route.fallbackName);
  content = setTaskMetadata(content, 'Capability profile', route.profile);

  const requiredHeadings = ['Objective', 'Requirements', 'Acceptance criteria', 'Dependencies', 'Owned scope', 'Shared files', 'Restricted scope', 'Verification', 'Expected handoff'];
  const todo = requiredHeadings.filter(heading => !taskSection(content, heading) || /\bTODO\b/i.test(taskSection(content, heading)));
  const unresolved = unmetDependencies({ ...task, content });
  const continuing = role === task.meta.role && task.meta.status === 'IN_PROGRESS';
  const qaHandoff = role === 'qa' && task.meta.status === 'READY_FOR_QA';
  const nextStatus = unresolved.length ? 'BLOCKED' : todo.length ? 'BACKLOG' : continuing ? 'IN_PROGRESS' : qaHandoff ? 'READY_FOR_QA' : 'READY';
  const parallelism = options.parallelism
    ? assertChoice(options.parallelism, PARALLELISM_LEVELS, 'parallelism')
    : classifyParallelism({ ...task, content, meta: { ...task.meta, parallelism: task.meta.parallelism } });

  content = setTaskMetadata(content, 'Parallelism', parallelism);
  content = setTaskMetadata(content, 'Status', nextStatus);
  writeTask(task, content);
  updateBoard();

  console.log(`${task.id}: ${nextStatus} (${route.terminal} / ${route.providerName} / ${route.profile}).`);
  if (unresolved.length) console.log(`Unmet dependencies: ${unresolved.join(', ')}. Keep BLOCKED until prerequisites complete.`);
  if (todo.length) console.log(`Planning needed in ${task.id}: ${todo.join(', ')}. Complete these sections before dispatching.`);
  printLaunchPrompt({ ...task, content, meta: { ...task.meta, parallelism } }, route);
}

if (isDirectExecution(import.meta.url)) {
  try {
    const [subcommand, ...rest] = process.argv.slice(2);
    if (subcommand === 'new') {
      runNew(parseArgs(rest));
    } else if (subcommand === 'assign') {
      runAssign(parseArgs(rest));
    } else if (subcommand === 'task') {
      runTask(parseArgs(rest));
    } else {
      runTask(parseArgs(process.argv.slice(2)));
    }
  } catch (error) {
    console.error(`Team CLI: ${error.message}`);
    process.exitCode = 1;
  }
}
