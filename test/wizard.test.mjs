import test from 'node:test';
import assert from 'node:assert/strict';
import {collectProjectAnswers} from '../scripts/zankai-wizard.mjs';
function input(answers) { return async () => { assert.ok(answers.length,'Unexpected extra prompt'); return answers.shift(); }; }
test('guided setup explains choices and validates required idea and stack selection',async()=>{
 const messages=[];
 const result=await collectProjectAnswers({},'Portal',input(['','','Ticket portal','','','','9','2','','y']),message=>messages.push(message));
 assert.equal(result.name,'Portal'); assert.equal(result.description,'Ticket portal');
 assert.match(result.stack,/Next.js/); assert.match(result.requirements,/clarified/);
 assert.ok(messages.some(message=>message.includes('Please describe')));
 assert.ok(messages.some(message=>message.includes('Enter 1, 2, 3, or 4')));
 assert.ok(messages.some(message=>message.includes('REVIEW YOUR PROJECT')));
});
test('review can edit answers before accepting',async()=>{
 const original={name:'Old',description:'Old idea',users:'Users',features:'Features',requirements:'Rules',stack:'Custom stack',constraints:'None'};
 const result=await collectProjectAnswers(original,'Portal',input(['e','New','New idea','','','','','','y']),()=>{});
 assert.equal(result.name,'New'); assert.equal(result.description,'New idea'); assert.equal(result.stack,'Custom stack');
 assert.equal(original.name,'Old');
});
test('cancel during questions or at review returns no setup values',async()=>{
 assert.equal(await collectProjectAnswers({},'Portal',input(['/cancel']),()=>{}),null);
 const original={name:'Portal',description:'Idea',users:'Users',features:'Features',requirements:'Rules',stack:'Custom',constraints:'None'};
 assert.equal(await collectProjectAnswers(original,'Portal',input(['c']),()=>{}),null);
});
