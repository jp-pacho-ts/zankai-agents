import test from 'node:test';
import assert from 'node:assert/strict';
import {createWizardUI,terminalText} from '../scripts/zankai-terminal.mjs';
test('plain review output wraps long content and removes terminal control sequences',()=>{
 const lines=[];
 const ui=createWizardUI({write:line=>lines.push(line),columns:36,color:false,unicode:false});
 ui.intro();
 ui.review({name:'Portal',description:'a'.repeat(90)+'\x1b[2J',users:'Customers',features:'Tickets',requirements:'Private tickets',stack:'Next.js',constraints:'None'});
 assert.ok(lines.every(line=>line.length<=36));
 assert.ok(lines.every(line=>!line.includes('\x1b')));
 assert.ok(lines.some(line=>line.includes('PORTAL') || line.includes('Portal')));
});
test('styled output remains readable when color is removed',()=>{
 const lines=[]; const ui=createWizardUI({write:line=>lines.push(line),columns:80,color:true,unicode:true});
 ui.intro(); ui.step(2,7,'What are we building?','Example: A customer portal.');
 assert.ok(lines.join('\n').includes('\x1b[36m'));
 assert.ok(terminalText(lines.join('\n')).includes('STEP 2 OF 7'));
});
