import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StorySpeech, speechChunks, storyNarration } from '../src/lib/speech/story-speech.ts';

function fixture() {
  const calls = []; const utterances = [];
  const engine = { cancel: () => calls.push('cancel'), pause: () => calls.push('pause'), resume: () => calls.push('resume'), speak: utterance => { utterances.push(utterance); calls.push('speak'); } };
  const speech = new StorySpeech(() => ({ engine, utterance: text => ({ text }) }));
  return { speech, calls, utterances };
}
test('Narration includes published story text and captions without external article URLs', () => {
  const text = storyNarration({ title: 'The headline', dek: 'The introduction', body: 'Original commentary', source_name: 'BBC News', content_blocks: [{type:'text', text:'More context'}, {type:'link',url:'https://example.com/full-article',caption:'Further background'}] });
  assert.ok(text.includes('Original commentary')); assert.ok(text.includes('More context')); assert.ok(text.includes('Original reporting from BBC News.')); assert.ok(text.includes('Further background')); assert.ok(!text.includes('https://'));
});
test('Long narration is bounded and all words remain in order', () => {
  const text = 'A story with useful context. '.repeat(300).trim();
  const chunks = speechChunks(text);
  assert.ok(chunks.length > 1); assert.ok(chunks.every(chunk => chunk.length <= 220)); assert.equal(chunks.join(' '), text);
  assert.deepEqual(speechChunks('  \n '), []); assert.ok(speechChunks('x'.repeat(1000)).every(chunk=>chunk.length<=220));
});
test('Speech pauses, resumes, advances through chunks, and completes', () => {
  const { speech, calls, utterances } = fixture(); let changes = 0;
  const unsubscribe = speech.subscribe(() => changes++);
  speech.toggle('a', 'Story text. '.repeat(40));
  assert.equal(speech.getSnapshot().status, 'playing');
  speech.toggle('a', 'ignored'); assert.equal(speech.getSnapshot().status, 'paused'); assert.equal(calls.at(-1), 'pause');
  speech.toggle('a', 'ignored'); assert.equal(speech.getSnapshot().status, 'playing'); assert.equal(calls.at(-1), 'resume');
  for(let index=0;index<utterances.length;index++) utterances[index].onend();
  assert.equal(speech.getSnapshot().status, 'idle'); assert.ok(changes >= 4); unsubscribe();
});
test('Switching or stopping a story ignores late events from canceled utterances', () => {
  const { speech, utterances } = fixture();
  speech.toggle('a', 'First story'); const old = utterances[0];
  speech.toggle('b', 'Second story'); old.onend(); old.onerror();
  assert.equal(speech.getSnapshot().id, 'b'); assert.equal(speech.getSnapshot().status, 'playing');
  const current = utterances.at(-1); speech.stop(); current.onend(); current.onerror();
  assert.equal(speech.getSnapshot().id, null); assert.equal(speech.getSnapshot().error, '');
});
test('Speech errors leave a useful message and permit retry', () => {
  const { speech, utterances } = fixture(); speech.toggle('a', 'A story'); utterances[0].onerror();
  assert.equal(speech.getSnapshot().status, 'idle'); assert.ok(speech.getSnapshot().error);
  speech.toggle('a', 'A story'); assert.equal(speech.getSnapshot().error, ''); assert.equal(speech.getSnapshot().status, 'playing');
});
