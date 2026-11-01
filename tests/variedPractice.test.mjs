import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {questions,practicePacks} from '../packages/content/farm.mjs';
import {huntScenes} from '../packages/content/huntScenes.mjs';
import {selectQuestions,activityOf,questionWords,masteredWords,grade} from '../apps/api/src/domain.mjs';

test('word modules mix all activities and dedicated practice selects the requested activity',()=>{
 for(const module of ['phonics','vocabulary']){
  const db={sessions:{},attempts:[],completed:{}},activities=new Set();
  for(let n=0;n<2;n++){const ids=selectQuestions(db,'kid',module,questions);assert.equal(ids.length,3);const words=[];for(const id of ids){const q=questions.find(q=>q.id===id);activities.add(activityOf(q));words.push(...questionWords(q));}assert.equal(new Set(words).size,words.length);db.sessions[n]={childId:'kid',module,questionIds:ids};}
  assert.equal(activities.size,6,module);
  for(const activity of activities){const ids=selectQuestions(db,'kid',module,questions,3,activity);assert.ok(ids.length);for(const id of ids)assert.equal(activityOf(questions.find(q=>q.id===id)),activity);}
 }
});

test('correct vocabulary matching masters every linked word across phonics and vocabulary',()=>{
 const q=questions.find(q=>q.activity==='match'&&q.module==='vocabulary');
 const db={sessions:{},attempts:[{childId:'kid',questionId:q.id,correct:true,at:'2026-11-01T05:00:00Z'}],completed:{}};
 assert.deepEqual(masteredWords(db,'kid',questions),new Set(q.words));
 for(const module of ['phonics','vocabulary'])for(const id of selectQuestions(db,'kid',module,questions,30))assert.ok(!questionWords(questions.find(q=>q.id===id)).some(w=>q.words.includes(w)));
 db.wordResetAt={kid:'2026-11-01T06:00:00Z'};assert.equal(masteredWords(db,'kid',questions).size,0);
});

test('new exercises have unique correct choices, real spelling gaps, and usable pictures',()=>{
 assert.equal(practicePacks.length,200);
 for(const q of questions.filter(q=>q.id.startsWith('mix-'))){
  if(q.type==='choice'){assert.equal(new Set(q.choices).size,3,q.id);assert.equal(q.choices.filter(c=>c===q.answer).length,1,q.id);for(const c of q.choices)assert.equal(grade(q,c).correct,c===q.answer,q.id);}
  if(q.type==='fill'){assert.equal(q.prompt.replace(/_+/,q.answer),q.word,q.id);assert.equal(q.answer.length,(q.prompt.match(/_/g)||[]).length,q.id);}
  if(q.activity==='context')assert.equal((q.prompt.match(/___/g)||[]).length,1,q.id);
  if(q.type==='spell'||q.type==='order')assert.deepEqual([...q.tiles].sort(),[...q.answer].sort(),q.id);
  if(q.module==='phonics'){assert.ok(q.audio,q.id);assert.ok(!q.picture,q.id);}
 }
});

test('storybook scenes have shipped artwork and eight distinct, reachable object hotspots',()=>{
 assert.equal(huntScenes.length,3);
 for(const scene of huntScenes){assert.ok(existsSync('apps/web/public'+scene.image));const png=readFileSync('apps/web/public'+scene.image);assert.equal(png.readUInt32BE(16),1536);assert.equal(png.readUInt32BE(20),1024);assert.equal(scene.items.length,8);assert.equal(new Set(scene.items.map(i=>i.word)).size,8);for(const item of scene.items){const [x,y,rx,ry]=item.spot;assert.ok(x-rx>=0&&x+rx<=1536&&y-ry>=0&&y+ry<=1024,item.word);assert.ok(rx>=35&&ry>=30,item.word);assert.ok(!scene.items.some(other=>{if(other===item)return false;const [ox,oy,orx,ory]=other.spot;return ((x-ox)/orx)**2+((y-oy)/ory)**2<1;}),`${scene.id}:${item.word} center is covered by another hotspot`);}}
});
