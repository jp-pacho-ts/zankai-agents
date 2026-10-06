import { stdout } from 'node:process';

export const terminalText = value => String(value ?? '').replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '');
export function wrapText(value, width) {
  const lines = [];
  for (const paragraph of terminalText(value).split(/\r?\n/)) {
    let line = '';
    for (let word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && line.length + word.length + 1 > width) { lines.push(line); line = ''; }
      while (word.length > width) { if (line) { lines.push(line); line = ''; } lines.push(word.slice(0,width)); word = word.slice(width); }
      if (word) line += (line ? ' ' : '') + word;
    }
    lines.push(line);
  }
  return lines;
}

export function createWizardUI({write = console.log, columns = stdout.columns || 80, color = Boolean(stdout.isTTY) && !Object.hasOwn(process.env,'NO_COLOR') && process.env.TERM !== 'dumb', unicode = Boolean(stdout.isTTY), clearScreen = write === console.log && Boolean(stdout.isTTY) && process.env.TERM !== 'dumb'} = {}) {
  const width = Math.max(12, Math.min(76, columns - 2));
  const paint = (code,value) => color ? '\x1b['+code+'m'+value+'\x1b[0m' : value;
  const accent = value => paint('36',value);
  const strong = value => paint('1',value);
  const muted = value => paint('90',value);
  const chars = unicode ? {tl:'\u250c',tr:'\u2510',bl:'\u2514',br:'\u2518',v:'\u2502',h:'\u2500',arrow:'\u203a'} : {tl:'+',tr:'+',bl:'+',br:'+',v:'|',h:'-',arrow:'>'};
  const line = text => wrapText(text,width-4).forEach(part=>write('  '+part));
  const panel = (title,content) => {
    write(accent(chars.tl + chars.h.repeat(width-2) + chars.tr));
    for (const text of [title,'',...content]) for (const part of wrapText(text,width-4)) write(accent(chars.v)+' '+part.padEnd(width-4)+' '+accent(chars.v));
    write(accent(chars.bl + chars.h.repeat(width-2) + chars.br));
  };
  const reset = () => { if(clearScreen)stdout.write('\x1b[2J\x1b[H'); };
  const header = () => { write(''); panel('Z A N K A I',['AI agents by jp-pacho-ts']); write(''); };
  return {
    screen(title,help) { reset(); header(); line(title.toUpperCase()); write(''); line(help); write(''); },
    async thinking(label,work) {
      if(!clearScreen) { line(label+'...'); return work(); }
      const frames=unicode?['\u280b','\u2819','\u2839','\u2838','\u283c','\u2834','\u2826','\u2827','\u2807','\u280f']:['|','/','-','\\'];
      let frame=0;
      stdout.write('\x1b[?25l');
      const draw=()=>stdout.write('\r\x1b[2K  '+accent(frames[frame++%frames.length])+' '+terminalText(label));
      draw(); const timer=setInterval(draw,90);
      try { return await work(); } finally { clearInterval(timer); stdout.write('\r\x1b[2K\x1b[?25h'); }
    },
    intro() {
      reset(); header();
      line('PROJECT SETUP');
      write('');
      line('Let us shape your project in 7 short steps. You can leave technical choices to the architect.');
      write('');
      line('Enter = accept / skip optional questions');
      line('/cancel = exit without writing files');
    },
    step(index,total,title,help) {
      reset(); header();
      write('');
      write('  '+accent((unicode ? '\u25c6' : '*'))+'  '+muted('STEP '+index+' OF '+total));
      write('');
      line(title.toUpperCase());
      write('');
      wrapText(help,width-4).forEach(part=>write('  '+muted(part)));
    },
    prompt(suggestion, label = 'Your answer') {
      const safe = terminalText(suggestion);
      if (safe) { write(''); line('Enter to use: '+safe); }
      return '\n  '+accent(chars.arrow)+' '+strong(label)+': ';
    },
    note: line,
    review(values) {
      reset(); header();
      panel('REVIEW YOUR PROJECT',['Confirm the brief before creating your workspace.']);
      for (const [key,label] of [['name','PROJECT'],['description','PURPOSE'],['users','AUDIENCE'],['features','FIRST VERSION'],['requirements','REQUIREMENTS'],['stack','STACK'],['constraints','CONSTRAINTS']]) {
        write(''); write('  '+muted(label)); line(values[key]);
      }
      write('');
      line('Existing customized files will be preserved.');
      write('');
      line('Y  Create brief    E  Edit answers    C  Cancel');
    },
    done() {
      reset(); header();
      panel('PROJECT CONTEXT READY',['Your brief: .team/PROJECT.md','Your team instructions: AGENTS.md']);
      write('');
      write('  '+strong('NEXT: PLAN YOUR FIRST TASKS'));
      write('');
      line('1. Run zankai kickoff to print your planning prompt.');
      line('2. Open your AI coding tool in this project folder.');
      line('3. Paste the prompt, then dispatch the recommended specialist.');
      write('');
      line('zankai status shows routing and task progress.');
      line('Setup prepares context; it does not start agents or build the application.');
    }
  };
}
