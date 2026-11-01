import {questions as bank} from '../packages/content/farm.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
test('HTTP learning lifecycle, retries, purchase concurrency and restart persistence', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'forest-test-'));
    let proc;
    async function start() { proc = spawn(process.execPath, ['apps/api/src/server.mjs', '--production'], { env: { ...process.env, PORT: '4174', FOREST_DATA_DIR: dir }, stdio: ['ignore', 'pipe', 'pipe'] }); let errors = ''; proc.stderr.on('data', x => errors += x); await new Promise((resolve, reject) => { const timeout = setTimeout(() => reject(Error('Server timed out: ' + errors)), 10000); proc.stdout.on('data', x => { if (String(x).includes('已启动')) {
        clearTimeout(timeout);
        resolve();
    } }); proc.on('exit', code => { clearTimeout(timeout); reject(Error('Server exited ' + code + ': ' + errors)); }); }); }
    async function stop() { if (!proc || proc.exitCode !== null)
        return; const ended = once(proc, 'exit'); proc.kill('SIGTERM'); await ended; }
    async function request(path, body) { const response = await fetch('http://127.0.0.1:4174/api' + path, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const data = await response.json(); return { response, data }; }
    try {
        await start();
        let { data: state } = await request('/state');
        assert.equal(state.children[0].coins, 0);
        const { data: other } = await request('/children', { name: '测试朋友', buddy: 'fox' });
        const { data: s } = await request('/sessions', { childId: 'rosie', module: 'phonics' });
        assert.equal('answer' in s.questions[0], false);
        assert.equal('hint' in s.questions[0], false);
        const fixture=s.questions.map(q=>bank.find(b=>b.id===q.id));
        const a = { questionId: fixture[0].id, answer: fixture[0].answer };
        await Promise.all([request('/sessions/' + s.id + '/attempts', a), request('/sessions/' + s.id + '/attempts', a)]);
        state = (await request('/state')).data;
        assert.equal(state.children[0].coins, 2);
        assert.equal(state.children[0].stars, 1);
        assert.equal(state.children.find(c => c.id === other.id).coins, 0);
        const pending = (await request('/sessions', {childId:'rosie',module:'phonics'})).data;
        assert.equal(pending.questions.length,3); assert.ok(pending.questions.every(q=>q.id!==fixture[0].id));
        const otherSession = (await request('/sessions', {childId:other.id,module:'phonics'})).data;
        assert.equal(otherSession.questions.length,3);
        await request('/sessions/'+otherSession.id+'/attempts',{questionId:otherSession.questions[0].id,answer:'__wrong__'});
        assert.equal((await request('/sessions/'+otherSession.id)).data.index,0);
        const previous = (await request('/sessions/'+s.id+'/attempts',a)).data;
        assert.deepEqual(previous.correctAnswer,fixture[0].type==='fill'&&fixture[0].word?fixture[0].word:fixture[0].answer);
        assert.ok(previous.correct);
        await request('/sessions/' + s.id + '/hint', {});
        await request('/sessions/' + s.id + '/attempts', { questionId: fixture[1].id, answer: fixture[1].answer });
        await request('/sessions/' + s.id + '/attempts', { questionId: fixture[2].id, answer: fixture[2].answer });
        await Promise.all([request('/shop', { childId: 'rosie', itemId: 'cap' }), request('/shop', { childId: 'rosie', itemId: 'cap' })]);
        state = (await request('/state')).data;
        assert.equal(state.children[0].coins, 1);
        assert.equal(state.children[0].stars, 2);
        assert.equal(state.children[0].outfit, 'cap');
        assert.deepEqual(state.children[0].owned, ['none', 'cap']);
        const mastered=(await request('/sessions',{childId:'rosie',module:'phonics'})).data;
        assert.equal(mastered.questions.length,3); assert.ok(mastered.questions.every(q=>!fixture.some(f=>f.id===q.id)));
        const resumed=(await request('/sessions/'+pending.id)).data;
        assert.equal(resumed.index,0);
        assert.equal((await request('/shop', { childId: other.id, itemId: 'cap' })).response.status, 400);
        assert.equal((await request('/drafts', { title: '包', words: ['map'], sentences: ['A cat is in the grass.'] })).response.status, 200);
        assert.equal((await request('/drafts', { title: '包', words: ['地图'], sentences: [] })).response.status, 400);
        const student=(await request('/children',{name:'新题型验证',buddy:'bear'})).data;
        const pack=(await request('/sessions',{childId:student.id,module:'phonics',packId:'pack-1'})).data;
        assert.deepEqual(pack.questions.map(q=>q.type),['choice','fill','spell']);
        for(const q of pack.questions){const expected=bank.find(b=>b.id===q.id);assert.equal((await request('/sessions/'+pack.id+'/attempts',{questionId:q.id,answer:expected.answer})).data.correct,true);}
        assert.equal((await request('/sessions',{childId:student.id,module:'phonics',packId:'pack-1'})).response.status,400);
        await request('/shop',{childId:student.id,itemId:'shirt'});
        const beforeRemove=(await request('/state')).data.children.find(c=>c.id===student.id).coins;
        await request('/shop',{childId:student.id,itemId:'shirt',remove:true});
        const afterRemove=(await request('/state')).data.children.find(c=>c.id===student.id);
        assert.equal(afterRemove.outfit,'none');assert.equal(afterRemove.coins,beforeRemove);
        await request('/words/reset',{childId:student.id});
        assert.equal((await request('/sessions',{childId:student.id,module:'phonics',packId:'pack-1'})).response.status,200);
        const talk=(await request('/sessions',{childId:student.id,module:'conversation'})).data;
        const beforeSkip=(await request('/state')).data;
        assert.equal((await request('/sessions/'+talk.id+'/skip',{questionId:talk.questions[0].id})).data.index,1);
        const afterSkip=(await request('/state')).data;
        assert.equal(afterSkip.attempts.length,beforeSkip.attempts.length);
        assert.equal(afterSkip.children.find(c=>c.id===student.id).coins,beforeSkip.children.find(c=>c.id===student.id).coins);
        const cross = await fetch('http://127.0.0.1:4174/api/state', { headers: { origin: 'https://example.com' } });
        assert.equal(cross.status, 403);
        await stop();
        await start();
        state = (await request('/state')).data;
        assert.equal(state.children[0].coins, 1);
        assert.equal((await request('/sessions/' + s.id)).data.index, 3);
        assert.equal((await request('/drafts')).data.length, 1);
        assert.equal((await request('/sessions',{childId:'rosie',module:'phonics'})).data.questions.length,3);
    }
    finally {
        await stop();
        await rm(dir, { recursive: true, force: true });
    }
});
