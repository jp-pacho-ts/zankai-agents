#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  HANDOFF_DIR,
  PROVIDER_NAMES,
  ROLES,
  ROLE_TERMINALS,
  ROOT,
  assertChoice,
  ensureKnownOptions,
  fail,
  isDirectExecution,
  loadConfig,
  parseArgs,
  readTask,
  readText,
  relative,
  setTaskMetadata,
  unmetDependencies,
  writeTask,
  writeText
} from './team-lib.mjs';

const REQUIRED_SECTIONS = [
  'Completed work',
  'Changed files',
  'Verification performed',
  'Verification results',
  'Assumptions',
  'Known issues',
  'Remaining work',
  'Recommended next role',
  'Branch / worktree',
  'Commit'
];

function section(content, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(`^## ${escaped}\\s*$(.*?)(?=^## |$(?![\\s\\S]))`, 'ims'));
  return match?.[1]?.trim() || '';
}

function handoffPath(id, fromRole, toRole) {
  const preferred = path.join(HANDOFF_DIR, `${id}-${fromRole}-to-${toRole}.md`);
  if (fs.existsSync(preferred)) return preferred;
  if (!fs.existsSync(HANDOFF_DIR)) return preferred;
  const matches = fs.readdirSync(HANDOFF_DIR)
    .filter(name => name.startsWith(`${id}-`) && name.endsWith(`-to-${toRole}.md`))
    .sort();
  return matches.length ? path.join(HANDOFF_DIR, matches.at(-1)) : preferred;
}

function validateHandoff(file, id, toRole) {
  const content = readText(file);
  if (/\bTODO\b|\{\{/.test(content)) {
    fail(`${relative(file)} still has TODO or {{placeholders}}. Complete every handoff section before --ready.`);
  }
  if (!content.includes(`**Task ID:** ${id}`) || !content.includes(`**To role:** ${toRole}`)) {
    fail(`${relative(file)} has a mismatched Task ID or To role.`);
  }
  const empty = REQUIRED_SECTIONS.filter(heading => !section(content, heading));
  if (empty.length) {
    fail(`${relative(file)} has empty sections: ${empty.join(', ')}.`);
  }
}

export function runHandoff(args) {
  const { positional, options } = args;
  ensureKnownOptions(options, ['ready', 'new', 'to', 'status', 'branch', 'commit', 'next']);
  if (positional.length < 1 || positional.length > 2) {
    fail('Usage: npm run zankai:handoff -- T-001 [to-role] [--ready]');
  }
  const task = readTask(positional[0]);
  if (task.meta.status === 'DONE') fail(`${task.id} is DONE. Create a new task for follow-up work.`);
  const toRole = assertChoice(options.to || positional[1] || 'coordinator', ROLES, 'handoff target');
  const config = loadConfig();
  const fromRole = ROLES.includes(task.meta.role) ? task.meta.role : 'coordinator';
  const roleConfig = config.roles[fromRole];
  const provider = PROVIDER_NAMES[task.meta.provider] || PROVIDER_NAMES[roleConfig.primary] || roleConfig.primary;
  const profile = (task.meta.profile || roleConfig.profile || 'standard').toUpperCase();
  const terminal = task.meta.terminal || roleConfig.terminal || ROLE_TERMINALS[fromRole];

  const unresolved = unmetDependencies(task);
  if (unresolved.length) {
    fail(`${task.id} has unmet dependencies: ${unresolved.join(', ')}. Resolve them before handoff.`);
  }

  const file = handoffPath(task.id, fromRole, toRole);
  if (options.ready) {
    if (!fs.existsSync(file)) {
      fail(`No handoff file found at ${relative(file)}. Run npm run zankai:handoff -- ${task.id} ${toRole} first.`);
    }
    validateHandoff(file, task.id, toRole);
    const nextStatus = fromRole === 'qa' ? 'DONE' : 'READY_FOR_QA';
    const updatedTask = setTaskMetadata(task.content, 'Status', nextStatus);
    writeTask(task, updatedTask);
    console.log(`Validated handoff: ${relative(file)}.`);
    console.log(`Updated ${task.id} status to ${nextStatus} in ${relative(task.file)}.`);
    console.log('Single-Writer Rule: .team/BOARD.md was NOT modified by the worker handoff.');
    console.log('Return to TEAM-COORD to inspect the handoff and update .team/BOARD.md.');
    return;
  }

  if (fs.existsSync(file) && !options.new) {
    console.log(`Existing handoff draft: ${relative(file)}.`);
    console.log(`Fill every TODO, then run: npm run zankai:handoff -- ${task.id} ${toRole} --ready`);
    return;
  }

  const templatePath = path.join(ROOT, '.team', 'templates', 'HANDOFF.md');
  if (!fs.existsSync(templatePath)) fail('Missing .team/templates/HANDOFF.md. Copy the full team template.');
  let content = readText(templatePath);
  const tokens = {
    TASK_ID: task.id,
    FROM_ROLE: fromRole,
    TO_ROLE: toRole,
    TERMINAL: terminal,
    PROVIDER: provider,
    PROFILE: profile,
    STATUS: options.status || (fromRole === 'qa' ? 'QA_PASS' : 'READY_FOR_QA'),
    RECOMMENDED_NEXT_ROLE: options.next || (fromRole === 'qa' ? 'coordinator' : 'qa'),
    BRANCH_WORKTREE: options.branch || 'main (or specify worktree/branch)',
    COMMIT: options.commit || 'Not committed yet'
  };
  for (const [token, value] of Object.entries(tokens)) {
    content = content.replaceAll(`{{${token}}}`, value);
  }
  fs.mkdirSync(HANDOFF_DIR, { recursive: true });
  writeText(file, content);
  console.log(`Created handoff draft: ${relative(file)}.`);
  console.log('Single-Writer Rule: .team/BOARD.md was NOT modified.');
  console.log(`Complete all TODO sections in ${relative(file)}, then return to TEAM-COORD.`);
}

if (isDirectExecution(import.meta.url)) {
  try {
    runHandoff(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(`Team CLI: ${error.message}`);
    process.exitCode = 1;
  }
}
