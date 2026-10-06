#!/usr/bin/env node
import { PROVIDER_NAMES, PROVIDERS, ROLES, ROLE_TERMINALS, STATUSES, ensureKnownOptions, fail, isDirectExecution, listTasks, loadConfig, parseArgs, providerState, taskHandoffs } from './team-lib.mjs';

export function runStatus(args) {
  const { positional, options } = args;
  ensureKnownOptions(options, []);
  if (positional.length) fail('Usage: npm run zankai:status');
  const config = loadConfig();
  const tasks = listTasks();

  console.log('Team Terminals & Routing:');
  for (const role of ROLES) {
    const r = config.roles[role];
    const terminal = r.terminal || ROLE_TERMINALS[role];
    const primary = PROVIDER_NAMES[r.primary] || r.primary;
    const fallback = PROVIDER_NAMES[r.fallback] || r.fallback;
    console.log(`  ${terminal.padEnd(11)} (${role.padEnd(11)}) → Primary: ${primary.padEnd(12)} Fallback: ${fallback.padEnd(12)} Profile: ${r.profile.toUpperCase()}`);
  }

  console.log('\nProvider CLIs:');
  for (const provider of PROVIDERS) {
    const state = providerState(config, provider);
    const label = PROVIDER_NAMES[provider] || provider;
    console.log(`  ${label}: ${state.executable ? `detected (${state.command})` : `not detected (${state.command})`}`);
    const mappings = ['fast', 'standard', 'deep'].map(profile => `${profile.toUpperCase()}=${config.models?.[provider]?.[profile] || 'CLI default'}${config.effort?.[provider]?.[profile] ? ` (${config.effort[provider][profile]} effort)` : ''}`);
    console.log(`    ${mappings.join('  ')}`);
  }

  console.log(`\nTasks (${tasks.length}):`);
  console.log('  ' + STATUSES.map(status => `${status}: ${tasks.filter(task => task.meta.status === status).length}`).join(' · '));
  for (const task of tasks) {
    const m = task.meta;
    const handoffs = taskHandoffs(task.id).length;
    console.log(`  ${task.id} [${m.status || '?'}] ${m.terminal} (${m.role || 'unassigned'} / ${PROVIDER_NAMES[m.provider] || m.provider || 'unassigned'} / ${m.profile || '?'}) · ${m.parallelism} · Handoffs: ${handoffs} — ${m.title || 'Untitled'}`);
  }
}

if (isDirectExecution(import.meta.url)) {
  try {
    runStatus(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(`Team CLI: ${error.message}`);
    process.exitCode = 1;
  }
}
