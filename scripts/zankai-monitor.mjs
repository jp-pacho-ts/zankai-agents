import fs from 'node:fs';
import path from 'node:path';
import { stdin, stdout } from 'node:process';
import { spawn } from 'node:child_process';
import { ensureKnownOptions, shortWorkerPrompt } from './team-lib.mjs';
import { resolveCodex } from './zankai-ai.mjs';
import { terminalText } from './zankai-terminal.mjs';
import { projectContext, projectConfig, readState, mutateState, snapshot, startSession, updateSession, inspectTask, scopesOverlap, createWorktree, auditSession, getTask } from './zankai-runtime.mjs';
const root=()=>process.cwd();
const output=value=>console.log(JSON.stringify(value,null,2));
const names=['task','provider','workspace','port','resource','contract','read-only','state','activity'];
const safe=value=>terminalText(value).replace(/[\r\n]+/g,' ');
export function runSession({positional,options}) {
  ensureKnownOptions(options,names);
  const [action,target,...extra]=positional;if(extra.length)throw new Error('Usage: zankai session start AGENT --task T-NNN | beat ID | finish ID');
  if(action==='start'){
    const context=projectContext(root()),state=readState(context);
    const workspace=options.workspace||state.worktrees[options.task?.toUpperCase()]?.path||root();
    return output(startSession(root(),target,{...options,workspace,readOnly:options['read-only']}));
  }
  if(action==='beat'){
    if(options.state&&['finished','failed'].includes(options.state))throw new Error('Use session finish to exit.');
    return output(updateSession(root(),target,{state:options.state,activity:options.activity}));
  }
  if(action==='finish'){
    const state=options.state||'finished';if(!['finished','failed'].includes(state))throw new Error('Finish state must be finished or failed.');
    return output(updateSession(root(),target,{state,activity:options.activity||'Session explicitly released'}));
  }
  if(action==='list'&&!target)return output(readState(projectContext(root())).sessions);
  throw new Error('Usage: zankai session start AGENT --task T-NNN | beat ID | finish ID | list');
}
export function runCheck({positional,options}) {
  ensureKnownOptions(options,['read-only','json']);if(!positional.length)throw new Error('Provide one or more task IDs.');
  const context=projectContext(root()),state=readState(context);
  const results=positional.map(id=>inspectTask(context,id,state,{readOnly:options['read-only']}));
  if(!options['read-only'])for(let i=0;i<results.length;i++)for(let j=i+1;j<results.length;j++){
    if(results[i].task.id===results[j].task.id)results[i].issues.push('Task appears more than once.');
    for(const a of results[i].task.scopes)for(const b of results[j].task.scopes)if(scopesOverlap(a,b)){
      results[i].issues.push('Overlaps '+results[j].task.id+': '+a+' / '+b);
      results[j].issues.push('Overlaps '+results[i].task.id+': '+b+' / '+a);
    }
  }
  const report=results.map(result=>({task:result.task.id,ready:!result.issues.length,issues:[...new Set(result.issues)]}));
  if(options.json)output(report);else for(const item of report)console.log(item.task+': '+(item.ready?'READY':item.issues.map(safe).join('; ')));
  if(report.some(item=>!item.ready))process.exitCode=1;
}
export function runWorktree({positional,options}) {
  ensureKnownOptions(options,[]);const [action,id,...extra]=positional;if(extra.length)throw new Error('Too many worktree arguments.');
  if(action==='create'&&id)return output(createWorktree(root(),id));
  if(action==='list'&&!id)return output(readState(projectContext(root())).worktrees);
  throw new Error('Usage: zankai worktree create T-NNN | list');
}
export function runContract({positional,options}) {
  ensureKnownOptions(options,[]);if(positional.length!==2||positional[0]!=='set'||!/^[A-Za-z0-9._/-]{1,120}$/.test(positional[1]))throw new Error('Usage: zankai contract set REVISION');
  mutateState(projectContext(root()),state=>{
    if(state.sessions.some(s=>!['finished','failed'].includes(s.state)))throw new Error('Release active sessions before changing the contract revision.');
    state.contract=positional[1];
  });console.log('Accepted contract revision: '+positional[1]);
}
export function runAudit({positional,options}) {
  ensureKnownOptions(options,[]);if(positional.length!==1)throw new Error('Usage: zankai audit SESSION_ID');
  const report=auditSession(root(),positional[0]);
  mutateState(projectContext(root()),state=>{state.integration ||= {};state.integration[report.task]={...report,checkedAt:new Date().toISOString()};});
  output(report);if(report.violations.length)process.exitCode=1;
}
export async function runAgent({positional,options},{providerLauncher=resolveCodex,spawnProvider=spawn,heartbeatMs=5000}={}) {
  ensureKnownOptions(options,['task','workspace','port','resource','contract','read-only']);
  if(positional.length!==1||!options.task)throw new Error('Usage: zankai run AGENT --task T-NNN [--workspace PATH]');
  const context=projectContext(root()),config=projectConfig(context),task=getTask(context,options.task);
  const provider=task.meta.provider||config.roles[task.meta.role]?.primary;
  if(provider!=='codex')throw new Error('Automatic process monitoring currently supports Codex. For Antigravity, use session start, beat and finish from your reporting integration.');
  const executable=providerLauncher();if(!executable)throw new Error('Codex CLI was not detected.');
  const workspace=options.workspace||readState(context).worktrees[task.id]?.path||root();
  const session=startSession(root(),positional[0],{...options,provider,workspace,readOnly:options['read-only']});
  const prompt=shortWorkerPrompt(task,{role:task.meta.role})+'\n\nSession: '+session.id+'\nWorkspace: '+session.workspace+'\nContract revision: '+(session.contract||'not specified')+'\nStay within these owned paths: '+session.scopes.join(', ');
  console.log('Starting '+session.agent+' / '+session.task+' in '+session.workspace+'\nSession: '+session.id);
  let child,timer;let cancelled=false;let heartbeatError;
  const stop=()=>{
    cancelled=true;
    if(process.platform==='win32'&&child?.pid){const killer=spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});killer.on('error',()=>child.kill());}
    else child?.kill('SIGTERM');
  };
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
  try{
    updateSession(root(),session.id,{state:'running',activity:'Codex process running; model activity is not inferred'});
    child=spawnProvider(executable.command,[...executable.prefix,...(options['read-only']?['--sandbox','read-only']:[]),prompt],{cwd:session.workspace,stdio:'inherit',windowsHide:false});
    timer=setInterval(()=>{try{updateSession(root(),session.id,{state:'running'});}catch(error){if(error.code==='EBUSY')return;heartbeatError=error.message;stop();}},heartbeatMs);
    const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>resolve(code));});
    for(let attempt=0;attempt<5;attempt++){
      try{updateSession(root(),session.id,{state:code===0&&!cancelled?'finished':'failed',activity:heartbeatError||'Provider exited '+(code??'by signal')+(cancelled?' (cancelled)':'')});break;}
      catch(error){if(error.code!=='EBUSY'||attempt===4)throw error;await new Promise(resolve=>setTimeout(resolve,100));}
    }
    if(code!==0||cancelled)process.exitCode=code||1;
  }catch(error){try{updateSession(root(),session.id,{state:'failed',activity:'Provider launch failed'});}catch{}throw error;}
  finally{clearInterval(timer);process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}
}
function table(data,selected=-1,columns=100) {
  const width=Math.max(25,columns-2);const fit=value=>safe(value).slice(0,width);
  const lines=['ZANKAI / AGENT MONITOR','AI agents by jp-pacho-ts','Project: '+data.project,'','AGENT        PROVIDER      HEALTH       STATE      TASK'];
  data.agents.forEach((agent,index)=>{
    const s=agent.session;lines.push((index===selected?'>':' ')+' '+String(agent.agent).padEnd(11)+' '+String(s?.provider||agent.configuredProvider).padEnd(12)+' '+agent.health.padEnd(12)+' '+String(s?.state||'unknown').padEnd(10)+' '+(s?.task||'-'));
  });
  lines.push('','Tasks: '+data.tasks.length+' | Reserved worktrees: '+Object.keys(data.worktrees).length+' | Integration reports: '+Object.keys(data.integration).length);
  lines.push('','Health comes from reported heartbeats; process presence does not prove model progress.');
  const detail=data.agents[selected]?.session;
  if(detail)lines.push('','SELECTED '+detail.agent+' / '+detail.id,'Workspace: '+detail.workspace,'Contract: '+(detail.contract||'not specified')+' | Port: '+(detail.port||'-')+' | Resource: '+(detail.resource||'-'),'Last heartbeat: '+detail.heartbeatAt,'Activity: '+detail.activity,'Reserved scope: '+detail.scopes.join(', '));
  else if(selected>=0)lines.push('','No tracked session. Register a session or use zankai run.');
  return lines.map(fit).join('\n');
}
export async function runStatus({positional,options}) {
  ensureKnownOptions(options,['json','watch']);if(positional.length>1)throw new Error('Usage: zankai status [AGENT] [--json|--watch]');
  if(options.json&&options.watch)throw new Error('Choose --json or --watch.');
  if(options.watch)return runDashboard({positional,options:{}});
  const data=snapshot();if(positional.length){data.agents=data.agents.filter(agent=>agent.agent===positional[0]);if(!data.agents.length)throw new Error('Unknown agent name.');}
  if(options.json)output(data);else console.log(table(data,-1,stdout.columns||100));
}
export async function runDashboard({positional,options}) {
  ensureKnownOptions(options,[]);if(positional.length>1)throw new Error('Usage: zankai dashboard [AGENT]');
  if(!stdin.isTTY||!stdout.isTTY)throw new Error('Dashboard requires an interactive terminal. Use zankai status --json instead.');
  const data=snapshot();let selected=positional[0]?data.agents.findIndex(agent=>agent.agent===positional[0]):0;
  if(selected<0)throw new Error('Unknown agent name.');
  const previousRaw=Boolean(stdin.isRaw);let timer;let lastFrame;let closed=false;
  await new Promise(resolve=>{
    const draw=()=>{
      let view;try{view=table(snapshot(),selected,stdout.columns||100);}catch(error){view='ZANKAI / REGISTRY ERROR\n'+safe(error.message);}
      const rows=Math.max(4,(stdout.rows||30)-3);const frame=view.split('\n').slice(0,rows).join('\n')+'\n\nUp/Down Select   R Refresh   Q Quit';
      if(frame!==lastFrame){stdout.write('\x1b[H\x1b[2J'+frame);lastFrame=frame;}
    };
    const close=()=>{if(closed)return;closed=true;clearInterval(timer);stdin.removeListener('data',key);stdout.removeListener('resize',draw);process.removeListener('SIGTERM',close);process.removeListener('SIGINT',close);stdin.setRawMode(previousRaw);stdin.pause();stdout.write('\x1b[?25h\x1b[?1049l');resolve();};
    const key=buffer=>{const value=buffer.toString();if(value==='q'||value==='Q'||value==='\x03')return close();if(value==='r'||value==='R')lastFrame=null;if(value==='\x1b[B')selected=(selected+1)%data.agents.length;if(value==='\x1b[A')selected=(selected+data.agents.length-1)%data.agents.length;draw();};
    stdin.setRawMode(true);stdin.resume();stdin.on('data',key);stdout.on('resize',draw);process.on('SIGTERM',close);process.on('SIGINT',close);stdout.write('\x1b[?1049h\x1b[?25l');draw();timer=setInterval(draw,1000);
  });
}
