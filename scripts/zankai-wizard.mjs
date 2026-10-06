import { createWizardUI } from './zankai-terminal.mjs';
const clean = value => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();

export async function collectProjectAnswers(initial, suggestedName, ask, say = console.log) {
  const values = {...initial};
  const ui = createWizardUI({write:say});
  ui.intro();
  const answer = async label => {
    const value = clean(await ask(label));
    if (value.toLowerCase() === '/cancel') return null;
    return value;
  };
  const fields = [
    ['name', 'Name your project', 'A short name you will recognize, for example: Customer Portal.', suggestedName],
    ['description', 'What are we building?', 'Describe its purpose. Example: A portal where customers submit tickets and staff reply.', ''],
    ['users', 'Who will use it?', 'Example: Customers, support staff, and an administrator. Unsure? Leave this for planning.', 'To be clarified during planning'],
    ['features', 'What should the first version do?', 'List 3 to 5 capabilities. Example: Sign in; submit a ticket; view replies; staff dashboard.', 'To be clarified during planning'],
    ['requirements', 'Any rules the system must follow?', 'Optional. Example: Customers see only their own tickets; send email notifications. No technical specification needed.', 'To be clarified during planning'],
    ['stack', 'Choose how to build it', '1) Let the architect recommend a stack\n2) Next.js + TypeScript + Tailwind + shadcn/ui + Prisma + PostgreSQL\n3) React + Vite + TypeScript; backend/database to be decided\n4) Enter your own stack', '1'],
    ['constraints', 'Anything else the team should know?', 'Optional. Example: Mobile-friendly; launch in two weeks; keep hosting costs low.', 'None recorded']
  ];
  const presets = {
    '1': 'To be recommended by the architect; inspect any existing project stack first',
    '2': 'Next.js, TypeScript, React, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, npm',
    '3': 'React, Vite, TypeScript, npm; backend and database to be decided'
  };
  let edit = false;
  while (true) {
    for (const [index, field] of fields.entries()) {
      const [key, title, help, fallback] = field;
      if (!edit && values[key]) continue;
      ui.step(index + 1, fields.length, title, help);
      const suggested = edit ? values[key] : fallback;
      let value;
      while (true) {
        value = await answer(ui.prompt(suggested, key === 'stack' ? 'Choose 1-4' : 'Your answer'));
        if (value === null) return null;
        value ||= suggested;
        if (value) break;
        say('Please describe your idea in one sentence so the team has a starting point.');
      }
      if (key === 'stack') {
        while (!['1','2','3','4'].includes(value) && !(edit && value === suggested)) {
          say('Enter 1, 2, 3, or 4.');
          value = await answer(ui.prompt('1', 'Choose 1-4'));
          if (value === null) return null;
          value ||= '1';
        }
        if (value === '4') {
          value = await answer(ui.prompt('Let the architect decide', 'Your stack'));
          if (value === null) return null;
          value ||= presets['1'];
        } else if (presets[value]) value = presets[value];

      }
      values[key] = value;
    }
    ui.review(values);
    const choice = await answer(ui.prompt('Y', 'Continue'));
    if (choice === null || /^(c|cancel|n|no)$/i.test(choice)) return null;
    if (/^(e|edit)$/i.test(choice)) { edit = true; continue; }
    if (!choice || /^(y|yes)$/i.test(choice)) return values;
    say('Choose Y, E, or C.');
  }
}
