import test from 'node:test';
import assert from 'node:assert/strict';
import {collectInitAnswers} from '../scripts/zankai-conversation.mjs';
import {validateReply,reviewWithCodex} from '../scripts/zankai-ai.mjs';
const brief={name:'Portal',description:'Ticket portal',users:'Guests',features:'Submit tickets',requirements:'Private tickets',stack:'Undecided',constraints:'None'};
const response={message:'A portal for customer support.',question:'Can customers submit tickets without accounts?',field:'users',ready:false,brief,assumptions:['Email notifications are optional.']};
const input=answers=>async()=>{assert.ok(answers.length,'Unexpected question');return answers.shift();};
const ui={screen(){},note(){},prompt(){return '> ';},review(){},thinking:async(label,work)=>work()};
test('AI asks one follow-up and only returns a draft after user approval',async()=>{
 const contexts=[];
 const result=await collectInitAnswers({name:'Portal',description:'Ticket portal'},'Portal',input(['Guests can submit tickets','y']),{ui,available:true,aiMode:'codex',review:async context=>{contexts.push(structuredClone(context));return {...response,ready:contexts.length===2};}});
 assert.equal(contexts.length,2);assert.equal(contexts[1].conversation.length,1);
 assert.equal(result.name,'Portal');assert.deepEqual(result.assumptions,response.assumptions);
});
test('user can cancel the AI draft without accepting it',async()=>{
 const result=await collectInitAnswers({name:'Portal',description:'Idea'},'Portal',input(['c']),{ui,available:true,aiMode:'codex',review:async()=>({...response,ready:true})});
 assert.equal(result,null);
});
test('provider errors offer explicit cancellation without silently accepting suggestions',async()=>{
 const result=await collectInitAnswers({name:'Portal',description:'Idea'},'Portal',input(['c']),{ui,available:true,aiMode:'codex',review:async()=>{throw new Error('Unavailable');}});
 assert.equal(result,null);
});
test('AI output is validated and absent provider fails clearly',async()=>{
 assert.throws(()=>validateReply({...response,brief:{}}),/Invalid AI brief/);
 assert.throws(()=>validateReply({...response,ready:'yes'}),/invalid planning/);
 await assert.rejects(reviewWithCodex({}, {provider:null}),/Codex is not available/);
});

test('missing provider lets user cancel before manual setup',async()=>{
 assert.equal(await collectInitAnswers({},'Portal',input(['/cancel']),{ui,available:false,aiMode:'codex'}),null);
});
