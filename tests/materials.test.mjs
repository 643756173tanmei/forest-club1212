import {packWords,practicePacks} from '../packages/content/practicePacks.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {questions,materialSummary}from'../packages/content/farm.mjs';import{grade}from'../apps/api/src/domain.mjs';
test('material questions have unique IDs, usable answers, and provenance',()=>{assert.equal(new Set(questions.map(q=>q.id)).size,questions.length);const added=questions.filter(q=>q.id.startsWith('mat-'));assert.equal(added.length,materialSummary.addedQuestions);for(const q of added){assert.ok(['original','extension'].includes(q.origin));assert.ok(q.source);if(q.type==='choice'){assert.equal(new Set(q.choices).size,3);assert.ok(q.choices.includes(q.answer));}else if(q.type==='order'||q.type==='spell'){assert.deepEqual([...q.tiles].sort(),[...q.answer].sort());}assert.equal(grade(q,q.type==='conversation'?q.explanation:q.answer).correct,true,q.id);}assert.ok(!questions.some(q=>q.audio==='bap'));});
test('Nature Day listening choices distinguish the illustrated answer',()=>{
 const q=questions.find(q=>q.id==='mat-c-0');assert.equal(q.type,'choice');assert.equal(grade(q,'The lion is in the den.').correct,true);assert.equal(grade(q,'The lion is on the den.').correct,false);
 const why=questions.find(q=>q.id==='mat-c-7');assert.equal(why.type,'choice');assert.equal(grade(why,'Because a lizard is on him.').correct,true);assert.equal(grade(why,'lizard').correct,false);
});
test('new worksheets have valid choices, tile sets, and letter locations',()=>{
 for(const q of questions.filter(q=>q.id.startsWith('sheet-')||q.id.startsWith('word-'))){
  if(q.type==='choice'){assert.equal(new Set(q.choices).size,3,q.id);assert.ok(q.choices.includes(q.answer),q.id);}
  if(q.type==='order'||q.type==='spell')assert.deepEqual([...q.tiles].sort(),[...q.answer].sort(),q.id);
  assert.equal(grade(q,q.answer).correct,true,q.id);
  if(q.skill==='letter-position'){const [, ,letter,...parts]=q.id.split('-');const word=parts.join('-');const at=word.indexOf(letter);assert.ok(at>=0,q.id);assert.equal(q.answer,at===0?'beginning':at===word.length-1?'end':'middle',q.id);}
 }
});
test('all tasks have understandable instructions, valid answers, and supported picture hints',()=>{
 const pictures=new Set(packWords.map(([word])=>word));
 for(const q of questions){
  assert.ok(q.instruction?.trim(),q.id);
  assert.ok(q.audio||q.prompt||q.picture||q.type==='order'||q.type==='match',`missing task: ${q.id}`);
  if(q.type==='fill'&&q.module!=='phonics')assert.ok(pictures.has(q.picture),q.id);
  if(q.module==='phonics'){assert.ok(!q.picture,q.id);assert.ok(q.audio,q.id);assert.ok(!q.instruction.includes('看图'),q.id);}
  if(q.type==='match'){
   assert.equal(new Set(q.options.map(o=>o.id)).size,q.options.length,q.id);
   assert.equal(q.answer.length,q.pairs.length,q.id);
   assert.ok(q.answer.every(id=>q.options.some(o=>o.id===id)),q.id);
   assert.equal(grade(q,q.answer).correct,true,q.id);
  }
  if(q.id.startsWith('mat-qw-'))assert.ok(q.audio&&q.prompt,q.id);
 }
});

test('200 word packs are unique, solvable, and do not contain position quizzes',()=>{
 assert.equal(practicePacks.length,200);assert.equal(new Set(packWords.map(w=>w[0])).size,200);
 assert.ok(!questions.some(q=>q.skill==='letter-position'));
 for(const p of practicePacks){
  const qs=p.questionIds.map(id=>questions.find(q=>q.id===id));assert.ok(qs.every(Boolean),p.id);
  assert.equal(qs.length,3);const gap=qs.find(q=>q.type==='fill');assert.match(gap.answer,/^[a-z]$/);assert.equal(gap.prompt.replace('_',gap.answer),p.word);
  const spell=qs.find(q=>q.type==='spell');assert.equal(spell.answer.join(''),p.word.replace(/ /g,''));assert.ok(spell.tiles.every(t=>t.trim()));
  for(const q of qs)assert.equal(grade(q,q.answer).correct,true,q.id);
 }
 for(const q of questions.filter(q=>q.module==='conversation'&&q.type==='choice'))assert.ok(q.scene?.subject,`missing answer illustration: ${q.id}`);
 const feeding=questions.find(q=>q.id==='c5');assert.equal(feeding.scene.object,'lettuce');
});

test('active question bank does not require recording or spoken sentence grading',()=>{
 assert.ok(!questions.some(q=>q.type==='conversation'));
 const listening=questions.filter(q=>q.module==='conversation'&&q.type==='choice');assert.equal(listening.length,21);
 for(const q of listening){assert.ok(q.audio&&q.scene,q.id);assert.equal(q.choices.length,3,q.id);assert.equal(new Set(q.choices).size,3,q.id);assert.ok(q.choices.includes(q.answer),q.id);assert.equal(grade(q,q.answer).correct,true,q.id);for(const wrong of q.choices.filter(c=>c!==q.answer))assert.equal(grade(q,wrong).correct,false,q.id);}
 assert.equal(questions.filter(q=>q.module==='conversation'&&q.type==='match').length,2);
});
