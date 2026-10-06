#!/usr/bin/env node
import {
  PROFILES,
  PROVIDERS,
  ROLES,
   assertChoice,
  chooseRoute,
  ensureKnownOptions,
  fail,
  isDirectExecution,
  loadConfig,
  parseArgs,
  printLaunchPrompt,
  readTask
} from './team-lib.mjs';

export function runRoute(args) {
  const { positional, options } = args;
  ensureKnownOptions(options, ['role', 'provider', 'profile']);
  if (positional.length !== 1) {
    fail('Usage: npm run zankai:route -- T-001 [--role frontend] [--provider codex] [--profile deep]');
  }
  const task = readTask(positional[0]);
  const role = options.role
    ? assertChoice(options.role, ROLES, 'role')
    : (ROLES.includes(task.meta.role) ? task.meta.role : 'coordinator');
  const config = loadConfig();
  const route = chooseRoute(config, role, {
    provider: options.provider || (role === task.meta.role && PROVIDERS.includes(task.meta.provider) ? task.meta.provider : undefined),
    profile: options.profile || (role === task.meta.role && PROFILES.includes(task.meta.profile.toLowerCase()) ? task.meta.profile.toLowerCase() : undefined)
  });
  console.log(`${task.id} — ${task.meta.title || 'Untitled'}`);
  printLaunchPrompt(task, route);
  console.log('\nRouting preview is read-only. Use npm run zankai:assign to record changes.');
}

if (isDirectExecution(import.meta.url)) {
  try {
    runRoute(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(`Team CLI: ${error.message}`);
    process.exitCode = 1;
  }
}
