import { createWizardUI } from './zankai-terminal.mjs';
import { collectProjectAnswers } from './zankai-wizard.mjs';
import { resolveCodex, reviewWithCodex } from './zankai-ai.mjs';
const clean=value=>String(value??'').replace(/[\r\n]+/g,' ').trim();
export async function collectInitAnswers(initial,suggestedName,ask,{say=console.log,aiMode,review=reviewWithCodex,available=Boolean(resolveCodex()),ui=createWizardUI({write:say}),signal}={}) {
  const values={...initial};
  const answer=async label=>{const value=clean(await ask(label));return value.toLowerCase()==='/cancel'?null:value;};
  let mode=aiMode;
  while(!mode){
    ui.screen('YOUR PLANNING ASSISTANT', 'Start with your idea. Your assistant will ask one focused question at a time.');
    ui.note('1  Codex AI assistant'+(available?'':' (not detected)'));
    ui.note('2  Manual guided setup');
    ui.note('/cancel  Exit without saving');
    ui.note('AI mode sends your answers to Codex using its existing authentication and account usage. It does not start implementation agents.');
    const selected=await answer(ui.prompt(available?'1':'2','Choose 1 or 2'));
    if(selected===null)return null;
    if(selected==='1'||(!selected&&available))mode='codex';
    else if(selected==='2'||(!selected&&!available))mode='off';
  }
  if(mode==='off')return collectProjectAnswers(values,suggestedName,ask,say);
  if(!available){ui.screen('CODEX NOT AVAILABLE','Install Codex and sign in before selecting AI assistance.');const action=await answer(ui.prompt(null,'Enter for manual setup, or /cancel'));if(action===null)return null;return collectProjectAnswers(values,suggestedName,ask,say);}
  const conversation=[];
  for(const [key,title,example,fallback] of [['name','NAME YOUR PROJECT','A short name, such as Customer Portal.',suggestedName],['description','TELL ME YOUR IDEA','What do you want to build, and what problem should it solve? Example: A salon booking website.',null]]) {
    if(values[key])continue;
    ui.screen(title,example);
    let value=''; while(!value){value=await answer(ui.prompt(fallback,'Your answer'));if(value===null)return null;value ||= fallback;}
    values[key]=value;
  }
  let draft; let assumptions=[];
  for(let turn=0;turn<4;turn++){
    let reply;
    while(!reply){
      ui.screen('YOUR AI PLANNER','Turning your answers into a clear project brief.');
      try {reply=await ui.thinking('Codex is reviewing your idea',()=>review({answers:values,conversation,finalize:turn===3},{signal}));}
      catch(error){
        if(signal?.aborted)throw error;
        ui.screen('AI CONNECTION PAUSED',error.message);
        ui.note('R  Retry    M  Continue manually    C  Cancel');
        const action=await answer(ui.prompt('M','Choose R, M or C'));
        if(action===null||/^(c|cancel)$/i.test(action))return null;
        if(!action||/^(m|manual)$/i.test(action))return collectProjectAnswers(values,suggestedName,ask,say);
      }
    }
    draft={...values,...reply.brief,name:values.name,description:values.description}; assumptions=reply.assumptions;
    if(reply.ready||turn===3)break;
    ui.screen('YOUR AI PLANNER',reply.message);
    ui.note(reply.question);
    ui.note('Enter = leave undecided    /review = finish the brief    /manual = guided setup');
    const response=await answer(ui.prompt(null,'You'));
    if(response===null)return null;
    if(response==='/manual')return collectProjectAnswers(values,suggestedName,ask,say);
    if(response==='/review'){conversation.push({question:reply.question,answer:'Finish now with unresolved items explicitly marked.'});turn=2;continue;}
    conversation.push({question:reply.question,answer:response||'Leave this undecided'});
    if(response)values[reply.field]=response;
  }
  while(true){
    ui.review(draft); for(const assumption of assumptions)ui.note('Suggested / unconfirmed: '+assumption);
    const action=await answer(ui.prompt('Y','Accept, edit (E), or cancel (C)'));
    if(action===null||/^(c|cancel|n|no)$/i.test(action))return null;
    if(/^(e|edit)$/i.test(action))return collectProjectAnswers({...draft,assumptions},suggestedName,ask,say);
    if(!action||/^(y|yes)$/i.test(action))return {...draft,assumptions};
  }
}
