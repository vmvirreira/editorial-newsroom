import {test} from 'node:test';
import assert from 'node:assert/strict';
import {narrationText,newsBriefing,storyNarration} from '../src/lib/speech/narration.ts';
import {StorySpeech,speechChunks} from '../src/lib/speech/story-speech.ts';

test('Narration speaks link labels and strips HTML, encoded markup, scripts and bare web addresses',()=>{
 assert.equal(narrationText('The report <a href="https://example.org/long?query=1">explains the change</a>.'),'The report explains the change.');
 assert.equal(narrationText('&lt;a href=&quot;https://example.org/&quot;&gt;More background&lt;/a&gt;'),'More background');
 const spoken=narrationText('<script>bad()</script>Read this https://example.org/long/path and www.example.org/more.');
 assert.ok(spoken.includes('Read this'));assert.ok(!/https?|www\.|example|bad\(\)|href/i.test(spoken));
 assert.equal(narrationText('<a href="https://example.org/">https://example.org/</a>'),'');
 const text=storyNarration({title:'A headline',dek:'<a href="https://example.org/">The source reports</a>',body:'Background at https://example.org/details',content_blocks:[{type:'text',text:'More <a href="https://example.org/facts">facts</a>'},{type:'link',url:'https://example.org/extra',caption:'Further context'}]});
 assert.ok(text.includes('The source reports'));assert.ok(text.includes('More facts'));assert.ok(text.includes('Further context'));assert.ok(!/https|href|<a/.test(text));
});
test('Briefing preserves main-then-latest order, uses only titles and visible summaries, and reads each story once',()=>{
 const stories=Array.from({length:5},(_,index)=>({id:String(index),title:`Headline ${index+1}`,dek:`Summary ${index+1}`,body:'Do not narrate full body',content_blocks:[{type:'text',text:'Do not narrate extra text'}]}));
 const result=newsBriefing([...stories,stories[0],stories[3]]);
 assert.equal(result.count,5);assert.equal(result.text,stories.map(s=>`${s.title}\n\n${s.dek}`).join('\n\n'));
 assert.ok(!result.text.includes('Do not narrate'));assert.deepEqual(newsBriefing([]),{text:'',count:0});
});
test('A complete briefing queues every story during the play gesture and pauses, resumes, finishes, and restarts',()=>{
 const calls=[],utterances=[];const engine={speak:u=>{calls.push('speak');utterances.push(u);u.onstart?.();},pause:()=>calls.push('pause'),resume:()=>calls.push('resume'),cancel:()=>calls.push('cancel')};
 const speech=new StorySpeech(()=>({engine,utterance:text=>({text})}),{schedule:()=>1,clear:()=>{}});
 const briefing=newsBriefing(Array.from({length:6},(_,i)=>({id:String(i),title:`Story ${i}`,dek:'A longer displayed news summary. '.repeat(5)})));
 speech.toggle('news-briefing',briefing.text);assert.equal(utterances.length,speechChunks(briefing.text).length);assert.equal(speech.getSnapshot().status,'playing');
 assert.equal(utterances.map(u=>u.text).join(' '),briefing.text.replace(/\s+/g,' '));
 speech.toggle('news-briefing',briefing.text);assert.equal(speech.getSnapshot().status,'paused');assert.equal(calls.at(-1),'pause');
 speech.toggle('news-briefing',briefing.text);assert.equal(calls.at(-1),'resume');
 const queued=utterances.length;for(const utterance of utterances)utterance.onend();assert.equal(speech.getSnapshot().status,'idle');assert.equal(utterances.length,queued);
 speech.toggle('news-briefing',briefing.text);assert.equal(utterances[queued].text,utterances[0].text);speech.stop();assert.equal(speech.getSnapshot().status,'idle');
});
test('Switching from a briefing to an individual story cancels the briefing and ignores its late completion',()=>{
 const calls=[],utterances=[];const engine={speak:u=>{utterances.push(u);u.onstart?.();},pause:()=>{},resume:()=>{},cancel:()=>calls.push('cancel')};
 const speech=new StorySpeech(()=>({engine,utterance:text=>({text})}),{schedule:()=>1,clear:()=>{}});
 speech.toggle('news-briefing','First summary. Next summary.');const old=utterances[0];speech.toggle('individual','Full story');assert.equal(calls.length,1);old.onend();assert.equal(speech.getSnapshot().id,'individual');speech.stop();
});
