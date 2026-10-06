import fs from 'node:fs';
import path from 'node:path';
import { ROOT, ensureKnownOptions } from './team-lib.mjs';
export function runKickoff({positional,options}) {
  ensureKnownOptions(options,[]);
  if(positional.length) throw new Error('Usage: zankai kickoff');
  if(!fs.existsSync(path.join(ROOT,'.team','PROJECT.md'))) throw new Error('Run zankai init in this project folder first.');
  console.log('Paste the following into your AI coding tool, opened in: ' + ROOT + '\n');
  console.log('You are the Coordinator (TEAM-COORD).\n\nRead AGENTS.md, .team/PROJECT.md, .team/ARCHITECTURE.md, .team/BOARD.md, .team/ROUTING.md, .team/CONVENTIONS.md, and .team/roles/coordinator.md.\n\nUse the existing project brief as the requirements. Inspect existing code and clarify unresolved choices. Create bounded tasks under .team/tasks/ using .team/templates/TASK.md, with ownership, dependencies, acceptance criteria and verification. Establish shared contracts before parallel FE/BE implementation. Update .team/BOARD.md and recommend the first specialist task with a ready-to-paste worker prompt. Do not implement the application or launch specialists during planning.');
}
