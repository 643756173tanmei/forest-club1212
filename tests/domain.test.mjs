import test from 'node:test';
import assert from 'node:assert/strict';
import { grade, publicQuestion, award, buy } from '../apps/api/src/domain.mjs';
import { questions, cosmetics } from '../packages/content/farm.mjs';
test('choice and sentence order grade exact answers', () => { assert.equal(grade(questions[0], 'map').correct, true); assert.equal(grade(questions[0], 'mop').correct, false); const q = questions.find(q => q.id === 's1'); assert.equal(grade(q, q.answer).correct, true); assert.equal(grade(q, [...q.answer].reverse()).correct, false); });
test('public questions do not disclose answers', () => { for (const q of questions)
    assert.equal('answer' in publicQuestion(q), false); });
test('bag question uses the pictured book and answer buttons instead of speech',()=>{
 const q=questions.find(q=>q.id==='c1');assert.equal(q.type,'choice');assert.equal(q.answer,'I put a book in my bag.');assert.equal(grade(q,q.answer).correct,true);assert.equal(grade(q,'I put milk in my bag.').correct,false);assert.equal(q.scene.subject,'book');
});
test('first completion awards once, replay and wrong answer do not add coins', () => { const db = { children: [{ id: 'a', coins: 0, stars: 0 }], completed: {} }; assert.deepEqual(award(db, 'a', 'p1', false, false), { coins: 0, stars: 0 }); assert.deepEqual(award(db, 'a', 'p1', false, true), { coins: 2, stars: 1 }); assert.deepEqual(award(db, 'a', 'p1', false, true), { coins: 0, stars: 0 }); assert.deepEqual(award(db, 'a', 'p2', true, true), { coins: 2, stars: 0 }); assert.equal(db.children[0].coins, 4); });
test('profiles have separate progress and purchases do not double charge', () => { const db = { children: [{ id: 'a', coins: 10, stars: 0, owned: ['none'] }, { id: 'b', coins: 0, stars: 0, owned: ['none'] }], completed: {} }; award(db, 'a', 'p1', false, true); assert.equal(db.children[1].coins, 0); buy(db.children[0], 'cap', cosmetics); assert.equal(db.children[0].coins, 7); buy(db.children[0], 'cap', cosmetics); assert.equal(db.children[0].coins, 7); assert.throws(() => buy(db.children[1], 'cap', cosmetics)); });

test('mastered words disappear across word exercises and reset restores them',async()=>{
 const {selectQuestions}=await import('../apps/api/src/domain.mjs');
 const bank=[{id:'a',module:'vocabulary',answer:'cat'},{id:'b',module:'vocabulary',answer:'cat'},{id:'c',module:'vocabulary',answer:'dog'},{id:'d',module:'phonics',type:'spell',answer:['c','a','t']}];
 const db={completed:{'kid:a':'independent'},attempts:[],sessions:{}};
 assert.deepEqual(selectQuestions(db,'kid','vocabulary',bank),['c']);
 assert.deepEqual(selectQuestions(db,'kid','phonics',bank),[]);
 db.wordResetAt={kid:'2026-10-31T00:00:00.000Z'};
 assert.deepEqual(new Set(selectQuestions(db,'kid','vocabulary',bank).map(id=>bank.find(q=>q.id===id).answer)),new Set(['cat','dog']));
 assert.deepEqual(new Set(selectQuestions(db,'other','vocabulary',bank).map(id=>bank.find(q=>q.id===id).answer)),new Set(['cat','dog']));
});

test('conversation accepts alternate complete phrasing but rejects wrong relations and grammar',()=>{
 const q={id:'where-cat',type:'conversation',answer:['grass'],fullSentence:'^(the |a )?cat is in the grass$'};
 for(const text of ['The cat is in the grass.',"There is a cat in the grass.",'In the grass is a cat.'])assert.equal(grade(q,text).correct,true,text);
 for(const text of ['The cat on the grass.','The cat is on the grass.','The cat in the grass.','grass'])assert.equal(grade(q,text).correct,false,text);
 const mountain={id:'c3',type:'conversation',answer:['rainbow']};
 assert.equal(grade(mountain,'The moon is over the mountain.').correct,true);
 assert.equal(grade(mountain,'The moon is in the mountain.').correct,false);
});
test('fill and question matching grade actual submitted answers',()=>{
 assert.equal(grade({type:'fill',answer:'cat'},' Cat ').correct,true);
 assert.equal(grade({type:'fill',answer:'cat'},'dog').correct,false);
 assert.equal(grade({type:'match',answer:['a','b']},['a','b']).correct,true);
 assert.equal(grade({type:'match',answer:['a','b']},['b','a']).correct,false);
});
test('wardrobe preserves other slots and replaces only the selected category',()=>{
 const child={id:'kid',coins:30,owned:['none'],outfit:'none'};
 const catalog=[{id:'hat',slot:'head',price:5},{id:'shirt',slot:'body',price:5},{id:'boots',slot:'feet',price:5},{id:'bow',slot:'head',price:5}];
 buy(child,'hat',catalog);buy(child,'shirt',catalog);buy(child,'boots',catalog);buy(child,'bow',catalog);
 assert.deepEqual(child.equipment,{head:'bow',body:'shirt',feet:'boots'});
 assert.equal(child.coins,10);
});
