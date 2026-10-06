import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = process.cwd();
export const TEAM_DIR = path.join(ROOT, '.team');
export const TASK_DIR = path.join(TEAM_DIR, 'tasks');
export const HANDOFF_DIR = path.join(TEAM_DIR, 'handoffs');
export const DECISION_DIR = path.join(TEAM_DIR, 'decisions');
export const ROLES = ['coordinator', 'architect', 'frontend', 'backend', 'data', 'qa'];
export const PROVIDERS = ['codex', 'antigravity'];
export const PROFILES = ['fast', 'standard', 'deep'];
export const PARALLELISM_LEVELS = ['SAFE PARALLEL', 'PARALLEL WITH ISOLATION', 'SEQUENTIAL / BLOCKED'];
export const STATUSES = ['BACKLOG', 'READY', 'IN_PROGRESS', 'BLOCKED', 'READY_FOR_QA', 'QA_FAILED', 'DONE'];
export const BOARD_START = '<!-- AI_TEAM_BOARD_START -->';
export const BOARD_END = '<!-- AI_TEAM_BOARD_END -->';
export const UNINITIALIZED = '<!-- AI_TEAM_UNINITIALIZED -->';

export const ROLE_TERMINALS = {
  coordinator: 'TEAM-COORD',
  architect: 'TEAM-ARCH',
  frontend: 'TEAM-FE',
  backend: 'TEAM-BE',
  data: 'TEAM-DATA',
  qa: 'TEAM-QA'
};

export const ROLE_TITLES = {
  coordinator: 'Coordinator',
  architect: 'Architect',
  frontend: 'Frontend',
  backend: 'Backend',
  data: 'Data',
  qa: 'QA'
};

export const PROVIDER_NAMES = {
  codex: 'Codex',
  antigravity: 'Antigravity'
};

export function fail(message) {
  throw new Error(message);
}

export function isDirectExecution(metaUrl) {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === path.resolve(fileURLToPath(metaUrl));
}

export function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

export function writeText(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

export function readJson(file) {
  try {
    return JSON.parse(readText(file));
  } catch (error) {
    fail(`Cannot read ${relative(file)}: ${error.message}`);
  }
}

export function relative(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, '/');
}

export function loadConfig() {
  const file = path.join(ROOT, 'config', 'ai-team.json');
  if (!fs.existsSync(file)) fail('Missing config/ai-team.json. Copy the full team template before running commands.');
  const config = readJson(file);
  if (!config.roles || typeof config.roles !== 'object') fail('config/ai-team.json needs a roles object.');
  for (const role of ROLES) {
    const route = config.roles[role];
    if (!route || !PROVIDERS.includes(route.primary) || !PROVIDERS.includes(route.fallback) || route.primary === route.fallback || !PROFILES.includes(route.profile)) {
      fail(`Invalid routing configuration for ${role}.`);
    }
  }
  return config;
}

export function assertChoice(value, choices, name) {
  const normalized = typeof value === 'string' ? value.toLowerCase() : value;
  const match = choices.find(choice => choice.toLowerCase() === normalized);
  if (!match) fail(`Invalid ${name}: ${value}. Choose ${choices.join(', ')}.`);
  return match;
}

export function normalizeId(id) {
  if (!id || !/^T-\d{3,}$/i.test(String(id).trim())) fail('Task ID must look like T-001.');
  return String(id).trim().toUpperCase();
}

export function taskPath(id) {
  return path.join(TASK_DIR, `${normalizeId(id)}.md`);
}

export function readTask(id) {
  const file = taskPath(id);
  if (!fs.existsSync(file)) fail(`Task ${normalizeId(id)} does not exist at ${relative(file)}.`);
  const content = readText(file);
  return { id: normalizeId(id), file, content, meta: parseTaskMetadata(content) };
}

export function listTasks() {
  if (!fs.existsSync(TASK_DIR)) return [];
  return fs.readdirSync(TASK_DIR)
    .filter(name => /^T-\d{3,}\.md$/i.test(name))
    .sort((a, b) => Number(a.slice(2, -3)) - Number(b.slice(2, -3)))
    .map(name => readTask(name.slice(0, -3)));
}

const TASK_LABELS = {
  'Task ID': 'id',
  Title: 'title',
  Status: 'status',
  'Owner role': 'role',
  'Primary role': 'legacyRole',
  Terminal: 'terminal',
  'Primary provider': 'provider',
  'Selected provider': 'legacyProvider',
  'Fallback provider': 'fallbackProvider',
  'Capability profile': 'profile',
  Parallelism: 'parallelism'
};

export function parseTaskMetadata(content) {
  const raw = {};
  for (const [label, key] of Object.entries(TASK_LABELS)) {
    const match = content.match(new RegExp(`^\\s*-\\s*\\*\\*${label}:\\*\\*\\s*(.*?)\\s*$`, 'im'));
    raw[key] = match?.[1]?.trim() ?? '';
  }
  const role = (raw.role || raw.legacyRole || '').toLowerCase();
  const provider = (raw.provider || raw.legacyProvider || '').toLowerCase();
  const fallbackProvider = (raw.fallbackProvider || '').toLowerCase();
  const profile = (raw.profile || '').toLowerCase();
  return {
    id: raw.id,
    title: raw.title,
    status: raw.status,
    role,
    terminal: raw.terminal || ROLE_TERMINALS[role] || 'TEAM-COORD',
    provider,
    fallbackProvider,
    profile: profile ? profile.toUpperCase() : '',
    parallelism: raw.parallelism || 'SEQUENTIAL / BLOCKED'
  };
}

export function setTaskMetadata(content, label, value) {
  const safeValue = String(value).replace(/[\r\n]+/g, ' ').trim();
  const pattern = new RegExp(`^(\\s*-\\s*\\*\\*${label}:\\*\\*\\s*).*?$`, 'im');
  if (pattern.test(content)) return content.replace(pattern, (_, prefix) => `${prefix}${safeValue}`);
  const lines = content.split(/\r?\n/);
  const insertAt = lines.findIndex(line => /^\s*##\s/.test(line));
  lines.splice(insertAt < 0 ? lines.length : insertAt, 0, `- **${label}:** ${safeValue}`);
  return lines.join('\n');
}

export function taskSection(content, heading) {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex(line => line.trim().toLowerCase() === `## ${heading.toLowerCase()}`);
  if (start < 0) return '';
  let end = lines.findIndex((line, index) => index > start && /^##\s/.test(line));
  if (end < 0) end = lines.length;
  return lines.slice(start + 1, end).join('\n').trim();
}

export function setTaskSection(content, heading, value) {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex(line => line.trim().toLowerCase() === `## ${heading.toLowerCase()}`);
  if (start < 0) return `${content.trimEnd()}\n\n## ${heading}\n\n${value}\n`;
  let end = lines.findIndex((line, index) => index > start && /^##\s/.test(line));
  if (end < 0) end = lines.length;
  lines.splice(start + 1, end - start - 1, '', value, '');
  return lines.join('\n');
}

export function writeTask(task, content) {
  writeText(task.file, content);
}

export function findExecutable(command) {
  if (typeof command !== 'string' || !command.trim() || /[\s"';&|<>]/.test(command)) return null;
  const windows = process.platform === 'win32';
  const suffixes = windows ? (path.extname(command) ? [''] : ['.exe', '.cmd', '.bat']) : [''];
  const dirs = /[/\\]/.test(command) ? [''] : (process.env.PATH || '').split(path.delimiter);
  for (const dir of dirs) {
    for (const suffix of suffixes) {
      const candidate = path.resolve(dir || ROOT, `${command}${suffix}`);
      try {
        const stat = fs.statSync(candidate);
        if (stat.isFile()) return candidate;
      } catch { /* continue */ }
    }
  }
  return null;
}

export function providerState(config, provider) {
  const command = config.providers?.[provider]?.command || provider;
  return { command, executable: findExecutable(command) };
}

export function chooseRoute(config, role, overrides = {}) {
  const validRole = assertChoice(role, ROLES, 'role');
  const configured = config.roles[validRole];
  const primaryState = providerState(config, configured.primary);
  const fallbackState = providerState(config, configured.fallback);
  const provider = overrides.provider
    ? assertChoice(overrides.provider, PROVIDERS, 'provider')
    : configured.primary;
  const fallback = provider === configured.primary ? configured.fallback : configured.primary;
  const profile = overrides.profile
    ? assertChoice(overrides.profile, PROFILES, 'profile')
    : configured.profile;
  const state = providerState(config, provider);
  return {
    role: validRole,
    roleTitle: ROLE_TITLES[validRole],
    terminal: configured.terminal || ROLE_TERMINALS[validRole],
    provider,
    providerName: PROVIDER_NAMES[provider] || provider,
    fallback,
    fallbackName: PROVIDER_NAMES[fallback] || fallback,
    profile: profile.toUpperCase(),
    profileKey: profile,
    model: config.models?.[provider]?.[profile] || null,
    effort: config.effort?.[provider]?.[profile] || null,
    command: state.command,
    executable: state.executable,
    available: Boolean(state.executable),
    fallbackAvailable: Boolean(fallbackState.executable),
    primary: configured.primary
  };
}

export function parseArgs(argv) {
  const positional = [];
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { positional.push(arg); continue; }
    const separator = arg.indexOf('=');
    const rawName = separator < 0 ? arg.slice(2) : arg.slice(2, separator);
    const inlineValue = separator < 0 ? undefined : arg.slice(separator + 1);
    if (!/^[a-z][a-z-]*$/.test(rawName)) fail(`Invalid option: ${arg}`);
    if (inlineValue !== undefined) { options[rawName] = inlineValue; continue; }
    if (['yes', 'ready', 'new', 'pass', 'fail', 'force'].includes(rawName)) { options[rawName] = true; continue; }
    const value = argv[++i];
    if (value === undefined || value.startsWith('--')) fail(`Missing value for --${rawName}.`);
    options[rawName] = value;
  }
  return { positional, options };
}

export function ensureKnownOptions(options, allowed) {
  for (const name of Object.keys(options)) {
    if (!allowed.includes(name)) fail(`Unknown option --${name}.`);
  }
}

export function taskDependencies(task) {
  const section = taskSection(task.content, 'Dependencies');
  return [...new Set(section.match(/\bT-\d{3,}\b/gi)?.map(id => id.toUpperCase()) || [])];
}

export function unmetDependencies(task) {
  return taskDependencies(task).filter(id => {
    try { return readTask(id).meta.status !== 'DONE'; }
    catch { return true; }
  });
}

export function taskSharedFiles(task) {
  const section = taskSection(task.content, 'Shared files');
  if (!section || /^(?:[-*]\s*)?none\.?$/im.test(section.trim())) return [];
  return section
    .split(/\r?\n/)
    .map(line => line.replace(/^[-*]\s*/, '').replaceAll('`', '').trim())
    .filter(line => line && !/^none\.?$/i.test(line) && !/^todo:/i.test(line));
}

export function classifyParallelism(task) {
  const unmet = unmetDependencies(task);
  if (unmet.length > 0) return 'SEQUENTIAL / BLOCKED';
  const shared = taskSharedFiles(task);
  if (shared.length > 0) return 'PARALLEL WITH ISOLATION';
  const recorded = task.meta?.parallelism;
  if (PARALLELISM_LEVELS.includes(recorded)) return recorded;
  return 'SAFE PARALLEL';
}

export function updateBoard() {
  const file = path.join(TEAM_DIR, 'BOARD.md');
  const tasks = listTasks();
  const counts = STATUSES.map(status => `${status}: ${tasks.filter(task => task.meta.status === status).length}`).join(' · ');
  const rows = tasks.length ? tasks.map(task => {
    const m = task.meta;
    const deps = taskDependencies(task);
    const clean = value => (value || '—').replaceAll('|', '\\|').replace(/[\r\n]/g, ' ');
    const providerDisplay = PROVIDER_NAMES[m.provider] || m.provider || '—';
    return `| [${task.id}](tasks/${task.id}.md) | ${clean(m.title)} | ${clean(m.status)} | ${clean(ROLE_TITLES[m.role] || m.role)} | ${clean(m.terminal)} | ${clean(providerDisplay)} | ${clean(m.profile)} | ${clean(m.parallelism)} | ${clean(deps.length ? deps.join(', ') : 'None')} |`;
  }).join('\n') : '| — | No tasks yet | — | — | — | — | — | — | — |';
  const managed = `${BOARD_START}\n${counts}\n\n| ID | Title | Status | Role | Terminal | Provider | Profile | Parallelism | Dependencies |\n|---|---|---|---|---|---|---|---|---|\n${rows}\n${BOARD_END}`;
  const header = '# Team Board\n\n> **Single-Writer Rule:** Only `TEAM-COORD` (Coordinator) or the human Team Lead (via `npm run zankai:board` / `npm run zankai:init`) may update `.team/BOARD.md`. Specialist workers (`TEAM-ARCH`, `TEAM-FE`, `TEAM-BE`, `TEAM-DATA`, `TEAM-QA`) must **never** directly modify `.team/BOARD.md`; they report completion and status through `.team/handoffs/`.';
  let content = fs.existsSync(file) ? readText(file) : header;
  if (content.includes(UNINITIALIZED)) content = header;
  if (content.includes(BOARD_START) && content.includes(BOARD_END)) {
    const start = content.indexOf(BOARD_START);
    const end = content.indexOf(BOARD_END, start) + BOARD_END.length;
    content = `${content.slice(0, start)}${managed}${content.slice(end)}`;
  } else {
    content = `${content.trimEnd()}\n\n${managed}\n`;
  }
  writeText(file, content);
  return content;
}

export function shortWorkerPrompt(task, route) {
  const role = route.role;
  const roleTitle = ROLE_TITLES[role] || role;
  return [
    `You are the ${roleTitle}.`,
    '',
    'Read:',
    '',
    'AGENTS.md',
    '.team/PROJECT.md',
    '.team/ARCHITECTURE.md',
    `.team/roles/${role}.md`,
    `.team/tasks/${task.id}.md`,
    '',
    `Execute ${task.id} only.`,
    '',
    'Respect its dependencies, scope, and restrictions.',
    '',
    'Create the required handoff when complete.',
    '',
    'Do not start another task.'
  ].join('\n');
}

export function printLaunchPrompt(task, route) {
  const startCommand = process.platform === 'win32' && route.executable?.toLowerCase().endsWith('.cmd') ? `${route.command}.cmd` : route.command;
  const parallelism = classifyParallelism(task);
  const shared = taskSharedFiles(task);
  console.log(`\nTerminal:    ${route.terminal}`);
  console.log(`Role:        ${route.roleTitle} (${route.role})`);
  console.log(`Provider:    ${route.providerName} (Fallback: ${route.fallbackName})`);
  console.log(`Profile:     ${route.profile}${route.model ? ` (model: ${route.model})` : ' (CLI default model)'}${route.effort ? `, reasoning: ${route.effort}` : ''}`);
  console.log(`Parallelism: ${parallelism}`);
  if (shared.length) {
    console.log(`Shared files: ${shared.join(', ')} (Run in an isolated Git worktree if concurrent!)`);
  }
  if (route.provider === 'codex') {
    const model = route.model ? ` -m ${route.model}` : '';
    const effort = route.effort ? ` -c model_reasoning_effort=${route.effort}` : '';
    console.log(`Start CLI:   ${startCommand}${model}${effort}`);
  } else {
    console.log(`Start CLI:   ${startCommand}`);
  }
  console.log('\nManual Dispatch Only — open the terminal above and paste this short worker prompt:');
  console.log('--- WORKER PROMPT START ---');
  console.log(shortWorkerPrompt(task, route));
  console.log('--- WORKER PROMPT END ---');
}

export function taskHandoffs(id, toRole = null) {
  if (!fs.existsSync(HANDOFF_DIR)) return [];
  const prefix = `${normalizeId(id)}-`;
  return fs.readdirSync(HANDOFF_DIR)
    .filter(name => name.startsWith(prefix) && name.endsWith('.md') && (!toRole || name.endsWith(`-to-${toRole}.md`)))
    .sort()
    .map(name => path.join(HANDOFF_DIR, name));
}
