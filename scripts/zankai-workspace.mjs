import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kit = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export function prepareWorkspace(root) {
  const assets = ['templates/AGENTS.md', 'config/ai-team.json', '.team/roles', '.team/templates', '.team/ROUTING.md', '.team/CONVENTIONS.md', 'prompts'];
  for (const asset of assets) {
    if (!fs.existsSync(path.join(kit, asset))) throw new Error('Required bundled asset is missing: ' + asset);
  }
  const copyMissing = (source, target) => {
    const stat = fs.lstatSync(source);
    if (stat.isSymbolicLink()) throw new Error('Template symlinks are not supported: ' + source);
    if (stat.isDirectory()) {
      fs.mkdirSync(target, {recursive:true});
      for (const name of fs.readdirSync(source)) copyMissing(path.join(source,name),path.join(target,name));
    } else if (!fs.existsSync(target)) {
      fs.mkdirSync(path.dirname(target), {recursive:true});
      fs.copyFileSync(source,target,fs.constants.COPYFILE_EXCL);
    }
  };
  for (const asset of assets) copyMissing(path.join(kit,asset),path.join(root,asset === 'templates/AGENTS.md' ? 'AGENTS.md' : asset));
  for (const name of ['tasks','handoffs','decisions']) fs.mkdirSync(path.join(root,'.team',name),{recursive:true});
}
