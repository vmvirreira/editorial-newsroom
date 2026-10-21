import {test} from 'node:test';
import assert from 'node:assert/strict';
import {headlineTopics, wikipediaUrl, lookupWikipedia, suggestWikipedia} from '../src/lib/curation/wikipedia.ts';
import {parseFeed} from '../src/lib/curation/feed.ts';

test('Headline candidates include names and concepts with bounded requests',()=>{
 const topics=headlineTopics('Bank of England holds interest rates as inflation eases');
 assert.ok(topics.includes('Bank of England'));assert.ok(topics.includes('interest rates'));assert.ok(topics.includes('inflation'));assert.ok(topics.length<=6);
 assert.ok(!topics.includes('holds'));
 const mars=headlineTopics('NASA mission to Mars and its moon');assert.ok(mars.includes('Moons of Mars'));assert.ok(!mars.includes('moon'));
});
test('Background URLs reject lookalikes, credentials, executable protocols and non-article URLs',()=>{
 for(const url of ['javascript:alert(1)','https://en.wikipedia.org.evil.test/wiki/Mars','https://user@en.wikipedia.org/wiki/Mars','https://en.wikipedia.org/w/api.php','https://en.wikipedia.org/wiki/','http://en.wikipedia.org/wiki/Mars'])assert.equal(wikipediaUrl(url),null);
 assert.equal(wikipediaUrl('https://en.wikipedia.org/wiki/Mars'),'https://en.wikipedia.org/wiki/Mars');
});
test('Wikipedia uses resolved real article URLs and rejects ambiguous or unrelated search results',async()=>{
 const original=globalThis.fetch;
 try{
 globalThis.fetch=async()=>({ok:true,json:async()=>({query:{pages:[{title:'Mars',fullurl:'https://en.wikipedia.org/wiki/Mars',pageprops:{disambiguation:''}},{title:'Mars (planet)',fullurl:'https://en.wikipedia.org/wiki/Mars_(planet)',index:2}]}})});
 assert.deepEqual(await lookupWikipedia('Mars'),{title:'Mars (planet)',url:'https://en.wikipedia.org/wiki/Mars_(planet)'});
 globalThis.fetch=async()=>({ok:true,json:async()=>({query:{pages:[{title:'Mars bar',fullurl:'https://en.wikipedia.org/wiki/Mars_bar'}]}})});
 assert.equal(await lookupWikipedia('Mars'),null);
 globalThis.fetch=async()=>{throw Error('Source down')};
 const failed=await suggestWikipedia('NASA Mars mission');assert.equal(failed.topics.length,0);assert.equal(failed.unavailable,true);
 }finally{globalThis.fetch=original;}
});
test('Feed previews are bounded plain text with script and markup removed',()=>{
 const source={id:'x',name:'News',category:'science',hosts:['example.com']};
 const xml='<rss><channel><item><title>Useful story</title><link>https://example.com/a</link><pubDate>Tue, 20 Oct 2026 10:00:00 GMT</pubDate><description><![CDATA[<script>evil()</script><p>Facts &amp; context &#8212; '+ 'a'.repeat(1500)+'</p>]]></description></item></channel></rss>';
 const story=parseFeed(xml,source,Date.parse('2026-10-20T12:00:00Z'))[0];
 assert.ok(story.source_preview.startsWith('Facts & context —'));assert.equal(story.source_preview.length,1000);assert.ok(!story.source_preview.includes('evil'));assert.ok(!story.source_preview.includes('<p>'));
});

test('Public explainer renderer groups approved links, escapes captions and skips unsafe URLs', async()=>{
 const {readFile}=await import('node:fs/promises');
 const {createRequire}=await import('node:module');
 const {transpileModule,ModuleKind,JsxEmit}=await import('typescript');
 const {createElement}=await import('react');
 const {renderToStaticMarkup}=await import('react-dom/server');
 const code=await readFile(new URL('../src/components/article-content.tsx',import.meta.url),'utf8');
 const output=transpileModule(code,{compilerOptions:{module:ModuleKind.CommonJS,jsx:JsxEmit.ReactJSX}}).outputText;
 const compiledModule={exports:{}};const require=createRequire(import.meta.url); const media=await import('../src/lib/media/youtube.ts');
 const textRenderer=await import('./article-text-renderer.mjs');
 Function('require','module','exports',output)(name=>name==='@/lib/media/youtube'?media:name==='./article-text'?textRenderer:require(name),compiledModule,compiledModule.exports);
 const blocks=[{type:'explainer',url:'https://en.wikipedia.org/wiki/Mars',caption:'Mars <script>'},{type:'explainer',url:'javascript:alert(1)',caption:'Unsafe'}];
 const html=renderToStaticMarkup(createElement(compiledModule.exports.ArticleExplainers,{blocks}));
 assert.ok(html.includes('Explore the background'));assert.ok(html.includes('https://en.wikipedia.org/wiki/Mars'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('javascript:'));
 const content=renderToStaticMarkup(createElement(compiledModule.exports.ArticleContent,{blocks}));assert.ok(!content.includes('/wiki/Mars'));
});

test('Custom Wikipedia links support pasted article URLs, editable labels, mobile links and section anchors',async()=>{
 const {customWikipediaTopic}=await import('../src/lib/curation/wikipedia-link.ts');
 assert.deepEqual(customWikipediaTopic(' https://en.wikipedia.org/wiki/Ilhan_Omar ',''),{title:'Ilhan Omar',url:'https://en.wikipedia.org/wiki/Ilhan_Omar'});
 assert.deepEqual(customWikipediaTopic('https://en.m.wikipedia.org/wiki/Mars#Geography','About Mars'),{title:'About Mars',url:'https://en.wikipedia.org/wiki/Mars#Geography'});
 for(const url of ['https://en.wikipedia.org.evil.test/wiki/Mars','javascript:alert(1)','https://en.wikipedia.org/w/index.php?search=Mars'])assert.equal(customWikipediaTopic(url,'Label'),null);
});
