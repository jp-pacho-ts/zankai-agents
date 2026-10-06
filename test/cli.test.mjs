import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseArgs} from '../scripts/team-lib.mjs';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const run = (args,cwd) => spawnSync(process.execPath,args,{cwd,encoding:'utf8',timeout:120000});
test('inline option values retain equals',()=>assert.equal(parseArgs(['--description=a=b']).options.description,'a=b'));
test('installed tarball initializes an empty workspace and preserves custom files',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'zankai-cli-'));
  try {
    assert.ok(process.env.npm_execpath,'Run this test through npm test');
    const pack=run([process.env.npm_execpath,'pack','--json','--pack-destination',temp],root);
    assert.equal(pack.status,0,pack.stderr);
    const info=JSON.parse(pack.stdout)[0];
    for(const file of info.files) assert.ok(!/^\.team\/(tasks|handoffs|runtime)\/|^\.env|^\.codex\//.test(file.path),file.path);
    const install=path.join(temp,'installed');
    const result=run([process.env.npm_execpath,'install','--prefix',install,'--ignore-scripts','--no-audit','--no-fund',path.join(temp,info.filename)],temp);
    assert.equal(result.status,0,result.stderr);
    const cli=path.join(install,'node_modules','zankai-agents','bin','zankai.mjs');
    const workspace=path.join(temp,'Empty project'); fs.mkdirSync(workspace);
    assert.equal(run([cli,'--help'],workspace).status,0);
    const invalid=run([cli,'init','--yes'],workspace);
    assert.equal(invalid.status,1); assert.deepEqual(fs.readdirSync(workspace),[]);
    const initialized=run([cli,'init','--yes','--name','Test App','--description=Portal a=b','--requirements','Login and ticket management'],workspace);
    assert.equal(initialized.status,0,initialized.stderr);
    const brief=fs.readFileSync(path.join(workspace,'.team','PROJECT.md'),'utf8');
    assert.ok(brief.includes('Portal a=b')); assert.ok(brief.includes('Login and ticket management'));
    assert.ok(fs.existsSync(path.join(workspace,'AGENTS.md')));
    assert.ok(fs.existsSync(path.join(workspace,'.team','roles','backend.md')));
    assert.equal(fs.existsSync(path.join(workspace,'package.json')),false);
    assert.equal(run([cli,'status'],workspace).status,0);
    const kickoff=run([cli,'kickoff'],workspace);
    assert.equal(kickoff.status,0,kickoff.stderr);
    assert.ok(kickoff.stdout.includes('.team/PROJECT.md'));
    assert.ok(!kickoff.stdout.includes('<Project Name>'));
    assert.ok(!kickoff.stdout.includes('.agents/skills/'));
    fs.writeFileSync(path.join(workspace,'.team','PROJECT.md'),'Custom project brief');
    fs.writeFileSync(path.join(workspace,'package.json'),'{"name":"existing","scripts":{"build":"custom"}}');
    assert.equal(run([cli,'init','--yes','--name','Second','--description','Second run'],workspace).status,0);
    assert.equal(fs.readFileSync(path.join(workspace,'.team','PROJECT.md'),'utf8'),'Custom project brief');
    assert.equal(JSON.parse(fs.readFileSync(path.join(workspace,'package.json'),'utf8')).scripts.build,'custom');
    if(process.platform==='win32') {
      const shim=path.join(install,'node_modules','.bin','zankai.cmd');
      const launch=spawnSync(process.env.ComSpec || 'cmd.exe',['/d','/c','zankai.cmd --help'],{cwd:workspace,env:{...process.env,PATH:path.dirname(shim)+path.delimiter+process.env.PATH},encoding:'utf8',timeout:30000});
      assert.equal(launch.status,0,launch.stderr);
    }
    assert.equal(run([cli,'unknown'],workspace).status,1);
  } finally { fs.rmSync(temp,{recursive:true,force:true}); }
});
