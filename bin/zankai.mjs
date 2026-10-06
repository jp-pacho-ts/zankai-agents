#!/usr/bin/env node
import fs from 'node:fs';
const [command, ...args] = process.argv.slice(2);
const commands = { init:['team-init','runInit'], status:['team-status','runStatus'], board:['team-board','runBoard'], new:['team-task','runNew'], show:['team-show','runShow'], task:['team-task','runTask'], assign:['team-task','runAssign'], handoff:['team-handoff','runHandoff'], qa:['team-qa','runQa'], route:['team-route','runRoute'] };
if (!command || command === '--help' || command === '-h' || args.includes('--help')) {
  console.log('Zankai Agents\n\nUsage: zankai <command> [options]\n\nCommands: init, status, board, new, show, task, assign, handoff, qa, route\n\nRun zankai init inside your project folder to describe your website or system.\nInit options: --name, --description, --requirements, --users, --features, --stack, --conventions, --constraints, --yes\nStatus shows routing and tasks; live session tracking is not yet available.');
} else if (command === '--version' || command === '-v') {
  console.log(JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version);
} else {
  try {
    if (!Object.hasOwn(commands, command)) throw new Error('Unknown command: ' + command + '. Run zankai --help.');
    const {parseArgs} = await import('../scripts/team-lib.mjs');
    const [module, handler] = commands[command];
    const implementation = await import('../scripts/' + module + '.mjs');
    await implementation[handler](parseArgs(args));
  } catch (error) { console.error('Zankai: ' + error.message); process.exitCode = 1; }
}
