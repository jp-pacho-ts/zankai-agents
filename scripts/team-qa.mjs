#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  ROOT,
  ensureKnownOptions,
  fail,
  isDirectExecution,
  parseArgs,
  readJson,
  readTask,
  relative,
  setTaskMetadata,
  taskHandoffs,
  taskSection,
  unmetDependencies,
  writeTask
} from './team-lib.mjs';

const SAFE_SCRIPT = /^(?:test|lint|typecheck|check|build)(?::[A-Za-z0-9_-]+)*$/;

function verificationScripts(task) {
  const content = taskSection(task.content, 'Verification') || taskSection(task.content, 'Verification commands');
  const lines = content.split(/\r?\n/)
    .map(line => line.trim().replace(/^[-*]\s+/, '').replace(/^`|`$/g, '').trim())
    .filter(Boolean);
  if (!lines.length || (lines.length === 1 && /^(?:none|no automated checks|not applicable)[.]?$/i.test(lines[0]))) {
    return [];
  }
  const scripts = [];
  for (const line of lines) {
    if (/^todo:/i.test(line)) continue;
    let name;
    if (line === 'npm test') name = 'test';
    else name = line.match(/^npm run ([A-Za-z0-9:_-]+)$/)?.[1];
    if (!name || !SAFE_SCRIPT.test(name)) {
      continue;
    }
    scripts.push(name);
  }
  if (!scripts.length) return [];
  const pkgFile = path.join(ROOT, 'package.json');
  if (!fs.existsSync(pkgFile)) fail('package.json is missing; cannot run npm verification.');
  const pkg = readJson(pkgFile);
  return [...new Set(scripts)].filter(script => Object.hasOwn(pkg.scripts || {}, script));
}

function runScript(script) {
  const windows = process.platform === 'win32';
  const command = windows ? (process.env.ComSpec || 'cmd.exe') : 'npm';
  const args = windows ? ['/d', '/s', '/c', `npm.cmd run ${script}`] : ['run', script];
  const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', timeout: 10 * 60 * 1000, maxBuffer: 2 * 1024 * 1024, windowsHide: true });
  return {
    script,
    result: result.error ? `ERROR (${result.error.code || result.error.message})` : result.status === 0 ? 'PASS (exit 0)' : `FAIL (exit ${result.status ?? 'unknown'})`,
    passed: !result.error && result.status === 0
  };
}

function appendEvidence(task, status, reviewer, review, results) {
  const stamp = new Date().toISOString();
  const lines = [
    `## QA evidence — ${stamp}`,
    '',
    `- **Outcome:** ${status}`,
    `- **Reviewer:** ${reviewer || 'TEAM-QA'}`,
    `- **Integrated acceptance review:** ${review || 'Automated verification check'}`,
    `- **Verification executed:** ${results.length ? results.map(item => `npm run ${item.script}: ${item.result}`).join('; ') : 'No declared npm scripts executed in this invocation'}`,
    ''
  ];
  let content = task.content.trimEnd();
  if (status === 'QA_FAILED') content = setTaskMetadata(content, 'Status', 'QA_FAILED');
  if (status === 'QA_PASS') content = setTaskMetadata(content, 'Status', 'DONE');
  writeTask(task, `${content}\n\n${lines.join('\n')}`);
}

export function runQa(args) {
  const { positional, options } = args;
  ensureKnownOptions(options, ['pass', 'fail', 'reviewer', 'review']);
  if (positional.length !== 1 || (options.pass && options.fail)) {
    fail('Usage: npm run zankai:qa -- T-001 [--pass|--fail --reviewer qa --review "Specific integrated verification evidence"]');
  }
  const task = readTask(positional[0]);
  const unresolved = unmetDependencies(task);
  if (unresolved.length) {
    fail(`${task.id} has unmet dependencies: ${unresolved.join(', ')}. Integrated QA requires dependencies to be DONE.`);
  }
  const handoffs = taskHandoffs(task.id);
  if (!handoffs.length) {
    console.log(`Warning: No handoff file found yet for ${task.id} in .team/handoffs/.`);
  }

  const reviewer = String(options.reviewer || 'qa').trim();
  const review = String(options.review || '').replace(/[\r\n]+/g, ' ').trim();
  if ((options.pass || options.fail) && review.length < 10) {
    fail('--pass and --fail require --review with concrete evidence of integrated verification.');
  }

  if (options.fail) {
    appendEvidence(task, 'QA_FAILED', reviewer, review, []);
    console.log(`${task.id}: QA_FAILED recorded in ${relative(task.file)}.`);
    console.log('Single-Writer Rule: Return to TEAM-COORD to update .team/BOARD.md and dispatch fixes.');
    return;
  }

  const scripts = verificationScripts(task);
  console.log(scripts.length ? `Running ${scripts.length} npm verification script(s) for ${task.id}...` : `No matching npm verification scripts found in package.json for ${task.id}.`);
  const results = scripts.map(script => {
    const result = runScript(script);
    console.log(`  npm run ${script}: ${result.result}`);
    return result;
  });

  if (results.some(item => !item.passed)) {
    appendEvidence(task, 'QA_FAILED', reviewer, review || 'Automated npm check failed', results);
    fail(`${task.id}: QA_FAILED. One or more verification commands failed.`);
  }

  if (options.pass) {
    appendEvidence(task, 'QA_PASS', reviewer, review, results);
    console.log(`${task.id}: QA_PASS recorded in ${relative(task.file)} (Status set to DONE).`);
    console.log('Single-Writer Rule: Return to TEAM-COORD and run npm run zankai:board so TEAM-COORD updates .team/BOARD.md.');
    return;
  }

  appendEvidence(task, 'CHECKS_COMPLETED', reviewer, review || 'Checks completed; awaiting final QA_PASS or QA_FAILED signoff', results);
  console.log(`${task.id}: Verification checks recorded in ${relative(task.file)}.`);
}

if (isDirectExecution(import.meta.url)) {
  try {
    runQa(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(`Team CLI: ${error.message}`);
    process.exitCode = 1;
  }
}
