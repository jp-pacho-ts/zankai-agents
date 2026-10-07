import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync,spawn} from 'node:child_process';
import {projectContext,readState,mutateState,createWorktree,startSession,updateSession,snapshot,auditSession,scopesOverlap} from '../scripts/zankai-runtime.mjs';
import {runAgent} from '../scripts/zankai-monitor.mjs';
const repo=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
function git(root,args){const result=spawnSync('git',['-C',root,...args],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);return result.stdout;}
function fixture(){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'zankai-runtime-'));const root=path.join(temp,'project');fs.mkdirSync(root);
 fs.mkdirSync(path.join(root,'config'));fs.copyFileSync(path.join(repo,'config/ai-team.json'),path.join(root,'config/ai-team.json'));
 fs.mkdirSync(path.join(root,'.team/tasks'),{recursive:true});
 for(const [id,role,scope] of [['T-001','frontend','src/ui/**'],['T-002','backend','src/server/**'],['T-003','data','src/ui/button.ts'],['T-004','qa','docs/**']])fs.writeFileSync(path.join(root,'.team/tasks',id+'.md'),'# '+id+'\n\n- **Task ID:** '+id+'\n- **Owner role:** '+role+'\n- **Status:** READY\n\n## Dependencies\n\n- None\n\n## Owned scope\n\n- '+scope+'\n\n## Shared files\n\n- None\n');
 git(root,['init','-b','main']);git(root,['config','user.email','fixture@example.invalid']);git(root,['config','user.name','Fixture']);git(root,['add','.']);git(root,['commit','-m','Fixture base']);
 return {root,temp,cleanup:()=>fs.rmSync(temp,{recursive:true,force:true})};
}
test('independent worktrees share claims; stale sessions keep reservations until explicit release',()=>{
 const f=fixture();try{
  const fe=createWorktree(f.root,'T-001'),be=createWorktree(f.root,'T-002');
  const one=startSession(f.root,'TEAM-FE',{task:'T-001',workspace:fe.path,port:3100,resource:'database:shared'});
  assert.throws(()=>startSession(be.path,'TEAM-DATA',{task:'T-003',workspace:be.path}),/Scope overlap/);
  assert.throws(()=>startSession(be.path,'TEAM-BE',{task:'T-002',workspace:be.path,port:3100}),/already reserved/);
  assert.throws(()=>startSession(be.path,'TEAM-BE',{task:'T-002',workspace:be.path,resource:'database:shared'}),/Resource.*already reserved/);
  const two=startSession(be.path,'TEAM-BE',{task:'T-002',workspace:be.path,port:3101});
  assert.equal(readState(projectContext(fe.path)).sessions.length,2);
  assert.equal(snapshot(f.root,Date.now()+60000).agents.find(s=>s.agent==='TEAM-FE').health,'stale');
  assert.throws(()=>startSession(f.root,'TEAM-FE',{task:'T-001',workspace:fe.path}),/Already claimed/);
  updateSession(be.path,two.id,{state:'finished'});updateSession(fe.path,one.id,{state:'finished'});
  assert.equal(snapshot(f.root).agents.find(s=>s.agent==='TEAM-FE').health,'exited');
 }finally{f.cleanup();}
});
test('contract revision, role, dependency and same-workspace checks reject unsafe dispatch',()=>{
 const f=fixture();try{
  mutateState(projectContext(f.root),state=>{state.contract='customer-v1';});
  assert.throws(()=>startSession(f.root,'TEAM-FE',{task:'T-001'}),/contract/);
  assert.throws(()=>startSession(f.root,'TEAM-BE',{task:'T-001',contract:'customer-v1'}),/belongs/);
  startSession(f.root,'TEAM-FE',{task:'T-001',contract:'customer-v1'});
  assert.throws(()=>startSession(f.root,'TEAM-BE',{task:'T-002',contract:'customer-v1'}),/Another writer/);
  const file=path.join(f.root,'.team/tasks/T-002.md');fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('- None','- T-003'));
  assert.throws(()=>startSession(f.root,'TEAM-BE',{task:'T-002',contract:'customer-v1'}),/Unfinished dependency/);
 }finally{f.cleanup();}
});
test('scope audit finds out-of-scope untracked files and leaves the board unchanged',()=>{
 const f=fixture();try{
  const tree=createWorktree(f.root,'T-001');const s=startSession(f.root,'TEAM-FE',{task:'T-001',workspace:tree.path});
  fs.mkdirSync(path.join(tree.path,'src/ui'),{recursive:true});fs.writeFileSync(path.join(tree.path,'src/ui/button.ts'),'export const label=1;');
  fs.writeFileSync(path.join(tree.path,'outside.txt'),'Needs review');
  const audit=auditSession(f.root,s.id);assert.deepEqual(audit.violations,['outside.txt']);assert.equal(audit.integration,'needs-review');
  assert.equal(fs.existsSync(path.join(f.root,'.team/BOARD.md')),false);
 }finally{f.cleanup();}
});
test('corrupt registry fails closed, and worktrees refuse dirty primary workspaces',()=>{
 const f=fixture();try{
  fs.writeFileSync(path.join(f.root,'pending.txt'),'pending');assert.throws(()=>createWorktree(f.root,'T-001'),/pending changes/);
  const context=projectContext(f.root);fs.mkdirSync(context.directory,{recursive:true});fs.writeFileSync(context.file,'invalid');
  assert.throws(()=>snapshot(f.root),/corrupt/);assert.throws(()=>startSession(f.root,'TEAM-FE',{task:'T-001'}),/corrupt/);
 }finally{f.cleanup();}
});
test('scope intersection is conservative without conflating independent directories',()=>{
 assert.equal(scopesOverlap('src/ui/**','src/server/**'),false);assert.equal(scopesOverlap('src/**','src/ui/button.ts'),true);assert.equal(scopesOverlap('package.json','package.json'),true);
});
test('simultaneous processes cannot both claim the same task',async()=>{
 const f=fixture();try{
  const source='import {startSession} from '+JSON.stringify(pathToFileURL(path.join(repo,'scripts/zankai-runtime.mjs')).href)+'; try {startSession('+JSON.stringify(f.root)+',"TEAM-FE",{task:"T-001"});} catch {process.exitCode=1;}';
  const launch=()=>new Promise(resolve=>{const p=spawn(process.execPath,['--input-type=module','-e',source],{stdio:'ignore'});p.on('exit',resolve);});
  const results=await Promise.all([launch(),launch()]);assert.equal(results.filter(code=>code===0).length,1);assert.equal(readState(projectContext(f.root)).sessions.length,1);
 }finally{f.cleanup();}
});

test('explicit launch records heartbeats and provider exit without changing task state',async()=>{
 const f=fixture();const original=process.cwd();try{
  const fake=path.join(f.temp,'fake-provider.mjs');fs.writeFileSync(fake,'setTimeout(()=>process.exit(0),300);');
  process.chdir(f.root);
  await runAgent({positional:['TEAM-BE'],options:{task:'T-002'}},{providerLauncher:()=>({command:process.execPath,prefix:[fake]}),heartbeatMs:50});
  const session=readState(projectContext(f.root)).sessions[0];
  assert.equal(session.state,'finished');assert.match(session.activity,/exited 0/);
  assert.ok(Date.parse(session.heartbeatAt)>Date.parse(session.startedAt));
  assert.ok(fs.readFileSync(path.join(f.root,'.team/tasks/T-002.md'),'utf8').includes('**Status:** READY'));
 }finally{process.chdir(original);f.cleanup();}
});

test('CLI conflict, JSON status and audit commands work against a real fixture',()=>{
 const f=fixture();try{
  const cli=path.join(repo,'bin/zankai.mjs');const command=args=>spawnSync(process.execPath,[cli,...args],{cwd:f.root,encoding:'utf8'});
  let result=command(['check','T-001','T-002','--json']);assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).length,2);
  result=command(['check','T-001','T-003','--json']);assert.equal(result.status,1);assert.ok(JSON.parse(result.stdout).some(item=>!item.ready));
  result=command(['session','start','TEAM-BE','--task','T-002']);assert.equal(result.status,0,result.stderr);const session=JSON.parse(result.stdout);
  result=command(['session','beat',session.id,'--state','working','--activity','Building API']);assert.equal(result.status,0,result.stderr);
  result=command(['status','TEAM-BE','--json']);assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).agents[0].session.activity,'Building API');
  result=command(['session','finish',session.id]);assert.equal(result.status,0,result.stderr);
  result=command(['audit',session.id]);assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).integration,'scope-clear');
  assert.ok(readState(projectContext(f.root)).integration['T-002']);
  result=command(['dashboard']);assert.equal(result.status,1);assert.match(result.stderr,/interactive terminal/);
 }finally{f.cleanup();}
});

test('different Git bases cannot be dispatched together as parallel writers',()=>{
 const f=fixture();try{
  const fe=createWorktree(f.root,'T-001'),be=createWorktree(f.root,'T-002');
  startSession(f.root,'TEAM-FE',{task:'T-001',workspace:fe.path});
  fs.writeFileSync(path.join(be.path,'new-base.txt'),'new commit');git(be.path,['add','.']);git(be.path,['commit','-m','Different base']);
  assert.throws(()=>startSession(f.root,'TEAM-BE',{task:'T-002',workspace:be.path}),/Base commit differs/);
 }finally{f.cleanup();}
});

test('non-Git projects can report sessions while managed worktrees remain unavailable',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'zankai-nongit-'));try{
  fs.mkdirSync(path.join(temp,'config'));fs.copyFileSync(path.join(repo,'config/ai-team.json'),path.join(temp,'config/ai-team.json'));
  fs.mkdirSync(path.join(temp,'.team/tasks'),{recursive:true});
  fs.writeFileSync(path.join(temp,'.team/tasks/T-001.md'),'# T-001\n- **Task ID:** T-001\n- **Owner role:** backend\n- **Status:** READY\n\n## Dependencies\n- None\n\n## Owned scope\n- src/server/**\n\n## Shared files\n- None\n');
  const session=startSession(temp,'TEAM-BE',{task:'T-001'});
  assert.equal(snapshot(temp).agents.find(agent=>agent.agent==='TEAM-BE').health,'connected');
  assert.throws(()=>createWorktree(temp,'T-001'),/require a Git repository/);
  updateSession(temp,session.id,{state:'finished'});assert.equal(readState(projectContext(temp)).sessions[0].state,'finished');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
