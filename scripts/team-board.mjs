#!/usr/bin/env node
import { ensureKnownOptions, fail, isDirectExecution, parseArgs, updateBoard } from './team-lib.mjs';

export function runBoard(args) {
  const { positional, options } = args;
  ensureKnownOptions(options, []);
  if (positional.length) fail('Usage: npm run zankai:board');
  console.log(updateBoard().trimEnd());
}

if (isDirectExecution(import.meta.url)) {
  try {
    runBoard(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(`Team CLI: ${error.message}`);
    process.exitCode = 1;
  }
}
