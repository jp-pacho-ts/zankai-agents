import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { normalizeId, parseTaskMetadata, taskSection, ROLES } from './team-lib.mjs';

const active = session => !['finished','failed'].includes(session.state);
const states = ['idle','working','waiting','running','finished','failed'];
export function git(root,args,required=true) {
  const result=spawnSync('git',['-C',root,...args],{encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:4*1024*1024});
  if(result.status!==0){if(required)throw new Error((result.stderr||'Git repository unavailable.').trim());return null;}
  return result.stdout.trim();
}
export function projectContext(root=process.cwd()) {
  root=fs.realpathSync(root);
  const common=git(root,['rev-parse','--path-format=absolute','--git-common-dir'],false);
  if(common){
    const primary=git(root,['worktree','list','--porcelain']).split('\n').find(line=>line.startsWith('worktree '));
    if(!primary)throw new Error('Cannot locate the primary Git worktree.');
    const canonical=fs.realpathSync(primary.slice(9));
    return {root,canonical,common:fs.realpathSync(common),directory:path.join(common,'zankai'),file:path.join(common,'zankai','runtime.json')};
  }
  return {root,canonical:root,common:null,directory:path.join(root,'.team','runtime'),file:path.join(root,'.team','runtime','state.json')};
}
export function readState(context) {
  if(!fs.existsSync(context.file))return {version:1,contract:null,sessions:[],worktrees:{}};
  let state;try{state=JSON.parse(fs.readFileSync(context.file,'utf8'));}catch{throw new Error('Runtime registry is corrupt. Preserve it and repair it before making changes.');}
  if(state.version!==1 || !Array.isArray(state.sessions) || !state.worktrees || typeof state.worktrees!=='object' || state.sessions.some(s=>!s.id||!s.agent||typeof s.workspace!=='string'||!Array.isArray(s.scopes)||s.scopes.some(scope=>typeof scope!=='string')||!states.includes(s.state)||!Number.isFinite(Date.parse(s.heartbeatAt))))throw new Error('Invalid runtime registry schema.');
  return state;
}
export function mutateState(context,change) {
  fs.mkdirSync(context.directory,{recursive:true});
  const lock=path.join(context.directory,'write.lock');
  try{fs.mkdirSync(lock);}catch(error){if(error.code==='EEXIST'){const busy=new Error('Runtime registry is busy. Retry shortly; do not remove a live writer lock.');busy.code='EBUSY';throw busy;}throw error;}
  let temp;
  try{
    fs.writeFileSync(path.join(lock,'owner.json'),JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));
    const state=readState(context); const result=change(state);
    temp=context.file+'.'+randomUUID()+'.tmp';
    fs.writeFileSync(temp,JSON.stringify(state,null,2)+'\n',{flag:'wx'});
    fs.renameSync(temp,context.file);return result;
  }finally{if(temp&&fs.existsSync(temp))fs.unlinkSync(temp);if(fs.existsSync(path.join(lock,'owner.json')))fs.unlinkSync(path.join(lock,'owner.json'));fs.rmdirSync(lock);}
}
export function projectConfig(context) {
  const file=path.join(context.canonical,'config','ai-team.json');
  if(!fs.existsSync(file))throw new Error('Run zankai init in the primary project workspace first.');
  const config=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!config.roles)throw new Error('Project routing configuration is invalid.');
  return config;
}
export function scopePaths(content,heading) {
  const section=taskSection(content,heading);const result=[];
  for(const line of section.split(/\r?\n/)){
    const trimmed=line.trim();if(!trimmed || /^[-*]?\s*None\.?$/i.test(trimmed))continue;
    const quoted=[...trimmed.matchAll(/`([^`]+)`/g)].map(match=>match[1]);
    const paths=quoted.length?quoted:[trimmed.replace(/^[-*]\s*/,'')];
    for(let value of paths){value=value.replaceAll('\\','/').replace(/^\.\//,'').replace(/\/$/,'/**');
      if(!value||value.startsWith('/')||/^[A-Za-z]:/.test(value)||value.split('/').includes('..')||/[\r\n;\[\]{}]/.test(value)||/\bTODO\b/.test(value))throw new Error('Invalid scope path in '+heading+': '+value);
      result.push(value);
    }
  }
  return [...new Set(result)];
}
export function scopesOverlap(a,b) {
  const prefix=value=>value.toLowerCase().split(/[?*]/,1)[0];
  const x=prefix(a),y=prefix(b);
  if(!/[?*]/.test(a+b))return x===y;
  return x.startsWith(y)||y.startsWith(x);
}
export function getTask(context,id) {
  id=normalizeId(id);const file=path.join(context.canonical,'.team','tasks',id+'.md');
  if(!fs.existsSync(file))throw new Error('Task '+id+' does not exist in the primary workspace.');
  const content=fs.readFileSync(file,'utf8');const meta=parseTaskMetadata(content);
  if(meta.id!==id)throw new Error('Task metadata ID does not match its filename: '+id);
  const dependencies=[...new Set(taskSection(content,'Dependencies').match(/T-\d{3,}/gi)||[])];
  return {id,content,meta,dependencies,scopes:[...scopePaths(content,'Owned scope'),...scopePaths(content,'Shared files')]};
}
export function inspectTask(context,id,state=readState(context),{readOnly=false}={}) {
  const task=getTask(context,id);const issues=[];
  if(!['READY','IN_PROGRESS','READY_FOR_QA'].includes(task.meta.status))issues.push('Task status is '+task.meta.status+'; it is not ready for execution.');
  for(const dependency of task.dependencies){if(getTask(context,dependency).meta.status!=='DONE')issues.push('Unfinished dependency: '+dependency);}
  if(!task.scopes.length&&!readOnly)issues.push('Declare Owned scope before starting a write session.');
  for(const session of state.sessions.filter(active)){
    if(session.task===task.id)issues.push('Already claimed by '+session.agent+' ('+session.id+').');
    if(!readOnly)for(const a of task.scopes)for(const b of session.scopes)if(scopesOverlap(a,b))issues.push('Scope overlap with '+session.agent+': '+a+' / '+b);
  }
  return {task,issues:[...new Set(issues)]};
}
export function startSession(root,agent,{task:id,provider,workspace=root,port,resource,contract,readOnly=false}={}) {
  const context=projectContext(root);const config=projectConfig(context);
  const role=ROLES.find(role=>config.roles[role]?.terminal===agent);
  if(!role)throw new Error('Unknown agent name: '+agent);
  if(!id)throw new Error('Provide --task T-NNN.');
  workspace=fs.realpathSync(workspace);const workspaceContext=projectContext(workspace);
  if(workspaceContext.canonical!==context.canonical)throw new Error('Workspace must belong to this project or one of its Git worktrees.');
  const baseCommit=git(workspace,['rev-parse','HEAD'],false);
  provider ||= config.roles[role].primary;
  if(!['codex','antigravity'].includes(provider))throw new Error('Provider must be codex or antigravity.');
  if(port!==undefined&&(!/^\d+$/.test(String(port))||Number(port)<1||Number(port)>65535))throw new Error('Port must be 1-65535.');
  if(resource!==undefined&&!/^[A-Za-z0-9._:/-]{1,120}$/.test(resource))throw new Error('Resource must be a short identifier, such as database:test-fe.');
  return mutateState(context,state=>{
    const {task,issues}=inspectTask(context,id,state,{readOnly});
    if(task.meta.role!==role)issues.push('Task belongs to '+task.meta.role+', not '+role+'.');
    const live=state.sessions.filter(active);
    if(live.some(s=>s.agent===agent))issues.push(agent+' already has an active session.');
    if(!readOnly&&live.some(s=>!s.readOnly&&s.workspace===workspace))issues.push('Another writer uses this workspace. Create a separate worktree.');
    if(!readOnly&&baseCommit&&live.some(s=>!s.readOnly&&s.baseCommit&&s.baseCommit!==baseCommit))issues.push('Base commit differs from an active writer. Align worktrees before parallel dispatch.');
    if(port&&live.some(s=>s.port===Number(port)))issues.push('Port '+port+' is already reserved.');
    if(resource&&live.some(s=>s.resource===resource))issues.push('Resource '+resource+' is already reserved.');
    if(state.contract&&contract!==state.contract)issues.push('Provide --contract '+state.contract+' to match the accepted contract.');
    if(issues.length)throw new Error(issues.join('\n'));
    const now=new Date().toISOString();
    const session={id:randomUUID(),agent,role,provider,task:task.id,workspace,scopes:readOnly?[]:task.scopes,readOnly:Boolean(readOnly),port:port?Number(port):null,resource:resource||null,contract:contract||null,baseCommit,state:'idle',activity:'Registered; waiting for activity reports',startedAt:now,heartbeatAt:now};
    state.sessions.push(session);return session;
  });
}
export function updateSession(root,id,{state:nextState,activity}={}) {
  if(nextState&&!states.includes(nextState))throw new Error('Invalid session state.');
  if(activity!==undefined&&(typeof activity!=='string'||activity.length>500))throw new Error('Activity must be at most 500 characters.');
  return mutateState(projectContext(root),state=>{
    const session=state.sessions.find(s=>s.id===id);if(!session)throw new Error('Unknown session ID.');
    if(!active(session))throw new Error('This session has already exited.');
    session.heartbeatAt=new Date().toISOString();if(nextState)session.state=nextState;if(activity!==undefined)session.activity=activity;
    if(!active(session))session.endedAt=session.heartbeatAt;return session;
  });
}
export function snapshot(root=process.cwd(),now=Date.now()) {
  const context=projectContext(root),state=readState(context),config=projectConfig(context);
  return {project:context.canonical,contract:state.contract,agents:ROLES.map(role=>{
    const agent=config.roles[role]?.terminal;const sessions=state.sessions.filter(s=>s.agent===agent);const session=sessions.filter(active).at(-1)||sessions.at(-1)||null;
    return {agent,role,configuredProvider:config.roles[role]?.primary,session,health:!session?'untracked':!active(session)?'exited':now-Date.parse(session.heartbeatAt)>45000?'stale':'connected'};
  }),tasks:fs.existsSync(path.join(context.canonical,'.team','tasks'))?fs.readdirSync(path.join(context.canonical,'.team','tasks')).filter(name=>/^T-\d{3,}\.md$/.test(name)).map(name=>({id:name.slice(0,-3),...parseTaskMetadata(fs.readFileSync(path.join(context.canonical,'.team','tasks',name),'utf8'))})):[],worktrees:state.worktrees,integration:state.integration||{}};
}
export function createWorktree(root,id) {
  const context=projectContext(root);if(!context.common)throw new Error('Managed worktrees require a Git repository with a committed base.');
  const task=getTask(context,id);const base=git(context.canonical,['rev-parse','HEAD']);
  if(git(context.canonical,['status','--porcelain']))throw new Error('Commit or otherwise preserve pending changes before preparing a worktree.');
  const parent=path.join(path.dirname(context.canonical),'.zankai-worktrees',path.basename(context.canonical));
  fs.mkdirSync(parent,{recursive:true});const location=path.join(fs.realpathSync(parent),task.id);
  if(fs.existsSync(location))throw new Error('Worktree destination already exists.');
  return mutateState(context,state=>{
    if(state.worktrees[task.id])throw new Error('This task already has a managed worktree.');
    const branch='zankai/'+task.id.toLowerCase();
    git(context.canonical,['worktree','add','-b',branch,location,base]);
    const record={task:task.id,path:location,branch,baseCommit:base};state.worktrees[task.id]=record;return record;
  });
}
export function auditSession(root,id) {
  const context=projectContext(root),state=readState(context);const session=state.sessions.find(s=>s.id===id);
  if(!session)throw new Error('Unknown session ID.');
  if(!session.baseCommit)throw new Error('Scope auditing requires a Git base commit.');
  const changed=git(session.workspace,['diff','--name-only',session.baseCommit,'--']).split('\n').filter(Boolean);
  const untracked=git(session.workspace,['ls-files','--others','--exclude-standard']).split('\n').filter(Boolean);
  const includes=(pattern,file)=>{
    const escaped=pattern.replace(/[.+^$()|\[\]{}\\]/g,'\\$&').replaceAll('**','__ALL__').replaceAll('*','[^/]*').replaceAll('?','[^/]').replaceAll('__ALL__','.*');
    return new RegExp('^'+escaped+'$','i').test(file);
  };
  const files=[...new Set([...changed,...untracked])];
  const violations=files.filter(file=>!session.scopes.some(scope=>includes(scope,file)));
  return {session:id,task:session.task,files,violations,integration:violations.length?'needs-review':'scope-clear',note:'Scope-clear is not merge approval or proof of semantic compatibility. Integrated QA is still required.'};
}
