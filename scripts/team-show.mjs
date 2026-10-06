#!/usr/bin/env node
import {
  PROFILES,
  PROVIDERS,
  ROLES,
  chooseRoute,
  classifyParallelism,
  ensureKnownOptions,
  fail,
  isDirectExecution,
  loadConfig,
  parseArgs,
  printLaunchPrompt,
  readTask,
  relative,
  taskDependencies,
  taskHandoffs,
  taskSharedFiles,
  unmetDependencies
} from './team-lib.mjs';

export function runShow(args) {
  const { positional, options } = args;
  ensureKnownOptions(options, []);
  if (positional.length !== 1) fail('Usage: npm run zankai:show -- T-001');
  const task = readTask(positional[0]);
  const config = loadConfig();
  const role = ROLES.includes(task.meta.role) ? task.meta.role : 'coordinator';
  const route = chooseRoute(config, role, {
    provider: PROVIDERS.includes(task.meta.provider) ? task.meta.provider : undefined,
    profile: PROFILES.includes(task.meta.profile.toLowerCase()) ? task.meta.profile.toLowerCase() : undefined
  });
  const deps = taskDependencies(task);
  const unmet = unmetDependencies(task);
  const shared = taskSharedFiles(task);
  const handoffs = taskHandoffs(task.id).map(file => relative(file));

  console.log(`Task:         ${task.id} — ${task.meta.title || 'Untitled'}`);
  console.log(`File:         ${relative(task.file)}`);
  console.log(`Status:       ${task.meta.status || 'UNKNOWN'}`);
  console.log(`Dependencies: ${deps.length ? deps.join(', ') : 'None'}${unmet.length ? ` (Unmet: ${unmet.join(', ')})` : ''}`);
  console.log(`Parallelism:  ${classifyParallelism(task)}`);
  console.log(`Shared files: ${shared.length ? shared.join(', ') : 'None'}`);
  console.log(`Handoffs:     ${handoffs.length ? handoffs.join(', ') : 'None recorded'}`);
  console.log('\n--- TASK CONTENT ---');
  console.log(task.content.trimEnd());
  printLaunchPrompt(task, route);
}

if (isDirectExecution(import.meta.url)) {
  try {
    runShow(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(`Team CLI: ${error.message}`);
    process.exitCode = 1;
  }
}
