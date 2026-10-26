import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transpileModule,ModuleKind,JsxEmit} from 'typescript';
import {createRequire} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {editionState,newsView} from '../src/lib/auto-news/mode.ts';
import {rankAutoStories,sameEvent} from '../src/lib/auto-news/ranking.ts';
import {collectAutoPool} from '../src/lib/auto-news/pool.ts';
const now=Date.parse('2026-10-26T12:00:00Z');
const published=(hours,status='published')=>({status,published_at:new Date(now-hours*3600000).toISOString(),updated_at:new Date(now).toISOString()});
const categories=['politics','business','world','culture','science','technology'];
const sources=categories.flatMap(category=>[0,1,2].map(n=>({id:`${category}-${n}`,name:`Publisher ${n}`,hosts:[`publisher${n}.example`],category,url:`https://publisher${n}.example/feed`,note:'Reporting'})));
const story=(category,n,title,hours=1)=>({source_id:`${category}-${n}`,source_name:`Publisher ${n}`,source_url:`https://publisher${n}.example/${category}/${title.replaceAll(' ','-')}`,headline:title,source_preview:'A useful feed preview with enough reporting context for readers to decide whether to open the original.',source_published_at:new Date(now-hours*3600000).toISOString(),category_slug:category});
function compiled(path,mocks){return readFile(new URL(path,import.meta.url),'utf8').then(source=>{const output=transpileModule(source,{compilerOptions:{module:ModuleKind.CommonJS,jsx:JsxEmit.ReactJSX}}).outputText;const compiledModule={exports:{}};const require=createRequire(import.meta.url);Function('require','module','exports',output)(name=>name in mocks?mocks[name]:require(name),compiledModule,compiledModule.exports);return compiledModule.exports;});}

test('Smart uses the latest actual publication across editorial positions, with an exact 24-hour boundary',()=>{
 assert.equal(editionState('smart',[published(24)],now).active,'curated');assert.equal(editionState('smart',[published(24.01)],now).active,'auto');
 assert.equal(editionState('smart',[published(100),published(2)],now).active,'curated');assert.equal(editionState('smart',[published(100)],now).active,'auto');
 assert.equal(editionState('smart',[published(-2),published(0,'draft'),published(1,'review')],now).active,'auto');assert.equal(editionState('smart',[],now).active,'auto');
 assert.equal(editionState('curated',[published(100)],now).active,'curated');assert.equal(editionState('auto',[published(0)],now).active,'auto');
});
test('View preferences reject unrecognized values and honor URL overrides before session preferences',async()=>{
 for(const value of [null,undefined,'invalid','AUTO',[],{}])assert.equal(newsView(value),null);
 let cookie='curated';const {requestedNewsView}=await compiled('../src/lib/auto-news/preferences.ts',{'next/headers':{cookies:async()=>({get:()=>({value:cookie})})},'./mode':{newsView}});
 assert.equal(await requestedNewsView('auto'),'auto');assert.equal(await requestedNewsView('invalid'),'curated');cookie='auto';assert.equal(await requestedNewsView(),'auto');cookie='bad';assert.equal(await requestedNewsView(),'smart');
});
test('Selection offers two distinct publishers per category and no more than twelve reports',()=>{
 const candidates=categories.flatMap((category,i)=>[story(category,0,`${category} discovery ${i}`),story(category,1,`${category} analysis ${i}`),story(category,2,`${category} development ${i}`)]);
 const selected=rankAutoStories(candidates,categories,now,sources);assert.equal(selected.length,12);
 for(const category of categories){const reports=selected.filter(item=>item.category_slug===category);assert.equal(reports.length,2);assert.equal(new Set(reports.map(item=>item.source_name)).size,2);}
 assert.equal(new Set(selected.map(item=>item.source_url)).size,12);
});
test('Similar event coverage and syndicated headlines are grouped even across categories',()=>{
 assert.equal(sameEvent('NASA launches Artemis moon mission - AP News','NASA launches new Artemis moon mission - Reuters'),true);assert.equal(sameEvent('Markets rally after inflation report','Museum opens an exhibition of ancient pottery'),false);
 const candidates=[story('science',0,'NASA launches Artemis moon mission'),story('science',1,'NASA launches new Artemis moon mission'),story('technology',0,'NASA launches Artemis moon mission'),story('science',2,'Researchers discover rare deep ocean species'),story('technology',1,'Encryption software protects banking networks')];
 const selected=rankAutoStories(candidates,['science','technology'],now,sources);assert.equal(selected.filter(item=>/Artemis/.test(item.headline)).length,1);assert.equal(selected.filter(item=>item.category_slug==='science').length,2);
});
test('Different desks of the same publisher do not displace another available reporting organization',()=>{
 const catalog=[{...sources[0],id:'one',hosts:['publisher.example'],category:'science'},{...sources[0],id:'two',hosts:['publisher.example'],category:'science'},{...sources[0],id:'three',hosts:['other.example'],category:'science'}];
 const candidates=[['one','Rare ocean species discovery','publisher.example'],['two','New telescope reveals distant galaxies','publisher.example'],['three','Climate study measures coastal change','other.example']].map(([id,title,host])=>({...story('science',0,title),source_id:id,source_url:`https://${host}/${id}`}));
 const selected=rankAutoStories(candidates,['science'],now,catalog);assert.equal(selected.length,2);assert.ok(selected.some(item=>item.source_id==='three'));
});
test('Ranking prefers fresh substantive reports, rejects unsafe URLs, future dates, old material and community submissions',()=>{
 const base=story('science',0,'Researchers study climate and ocean species',1);
 const community={...sources.find(s=>s.id==='science-1'),kind:'community'};const catalog=[...sources.filter(s=>s.id!=='science-1'),community];
 const candidates=[base,{...story('science',1,'Popular discussion about climate study'),source_preview:'A very popular research discussion.'},story('science',2,'Ancient observatory charts distant galaxies',80),story('science',2,'Tomorrow NASA announces new telescope',-1),{...base,source_url:'https://evil.example/article'},{...base,source_id:'unknown'},{...base,source_url:'javascript:alert(1)'}];
 assert.deepEqual(rankAutoStories(candidates,['science'],now,catalog).map(s=>s.headline),[base.headline]);
 const fresher=story('science',0,'New telescope observes distant galaxies',2),older=story('science',0,'New spacecraft studies distant planets',70);assert.equal(rankAutoStories([older,fresher],['science'],now,sources)[0].headline,fresher.headline);
});
test('Retained source pools keep their actual publication timestamps during upstream outages',()=>{
 const cached={...story('science',0,'New telescope observes distant galaxies',100),observed_at:new Date(now-99*3600000).toISOString()};
 const selected=rankAutoStories([cached],['science'],now,sources);assert.equal(selected.length,1);assert.equal(selected[0].source_published_at,cached.source_published_at);
 const fresh=story('technology',0,'Company unveils product',1);assert.equal(rankAutoStories([cached,fresh],['science','technology'],now,sources)[0].headline,fresh.headline);
});
test('One failed source does not block a category; an empty revalidation is rejected rather than replacing a good pool',async()=>{
 const catalog=[...sources.filter(s=>s.category==='science'),{...sources[0],id:'discussion',category:'science',kind:'community'}];const called=[];
 const pool=await collectAutoPool('science',async source=>{called.push(source.id);if(source.id==='science-0')throw Error('outage');return [story('science',Number(source.id.at(-1)),'Research measures new climate patterns')];},now,catalog);
 assert.equal(called.includes('discussion'),false);assert.equal(pool.stories.length,2);assert.equal(pool.checkedAt,new Date(now).toISOString());assert.ok(pool.stories.every(s=>s.observed_at===pool.checkedAt));
 await assert.rejects(collectAutoPool('science',async()=>{throw Error('offline')},now,catalog),/No suitable/);await assert.rejects(collectAutoPool('science',async()=>[story('science',0,'Old report',100)],now,catalog),/No suitable/);
});
test('Auto cards link directly to original reporting and identify source publication instead of curated authorship',async()=>{
 const text=await import('./article-text-renderer.mjs');const {ArticleCard}=await compiled('../src/components/article-card.tsx',{'./publication-time':{PublicationTime:({value,label})=>createElement('time',{dateTime:value},label)},'./article-content':{ArticleExplainers:()=>null},'./article-text':text,'@/components/story-listen':{StoryListen:()=>null},'@/lib/speech/story-speech':{storyNarration:()=>''},'@/lib/media/youtube':{youtubeEmbed:()=>null},'next/link':{default:({children,...props})=>createElement('a',props,children)},'next/image':{default:()=>null}});
 const article={id:'auto-one',title:'A source headline',slug:'',category_slug:'science',category_name:'Science',dek:'A feed preview.',image_url:'',author:'Publisher',source_name:'Publisher',source_url:'https://publisher.example/report',published_at:new Date(now).toISOString(),content_blocks:[],selection:'auto'};
 const html=renderToStaticMarkup(createElement(ArticleCard,{article,viewMode:'auto'}));assert.ok(html.includes('Automatically selected'));assert.ok(html.includes('Source published'));assert.ok(html.includes('https://publisher.example/report'));assert.ok(html.includes('/category/science?view=auto'));assert.ok(!html.includes('href="/article/'));assert.ok(!html.includes('Curated ·'));
});
test('Masthead selector offers all three views and stores a session-only preference on explicit selection',async()=>{
 const clicks=[];const {NewsViewSelector}=await compiled('../src/components/news-view-selector.tsx',{'next/navigation':{usePathname:()=>'/category/science'},'@/lib/auto-news/mode':{NEWS_VIEWS:['smart','curated','auto']},'next/link':{default:({children,onClick,...props})=>{clicks.push(onClick);return createElement('a',props,children)}}});
 const html=renderToStaticMarkup(createElement(NewsViewSelector,{mode:'smart'}));assert.ok(html.includes('News view'));for(const mode of ['smart','curated','auto'])assert.ok(html.includes(`/category/science?view=${mode}`));assert.ok(html.includes('aria-current="page"'));
 const previous=globalThis.document;try{globalThis.document={cookie:''};clicks[2]();assert.equal(document.cookie,'bb-news-view=auto; Path=/; SameSite=Lax');assert.ok(!/max-age|expires/i.test(document.cookie));}finally{if(previous)globalThis.document=previous;else delete globalThis.document;}
});

test('Publisher discovery feeds need a category match rather than relying on the search feed label',()=>{
 const source={id:'ap-science',name:'AP via Google News',category:'science',publisherHost:'apnews.com',hosts:['news.google.com'],url:'https://news.google.com/rss',note:'Discovery'};const base={...story('science',0,'Actor and cartoon voice dies at 46'),source_id:'ap-science',source_url:'https://news.google.com/rss/articles/one',source_preview:'A report about a celebrated actor and animation performer.'};assert.equal(rankAutoStories([base],['science'],now,[source]).length,0);assert.equal(rankAutoStories([{...base,headline:'NASA scientists launch telescope to study distant planets',source_preview:'Scientists describe the new telescope and space mission.'}],['science'],now,[source]).length,1);
});
