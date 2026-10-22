import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {DAILY_KINDS,DAILY_FALLBACKS,dayNumber,selectDailyItems,dailyItemSchema,fallbackPools} from '../src/lib/edition/daily-model.ts';
import {getDailyPools,artworkItems,cartoonItem,wikiItem,factItems,shortSummary,suitableReading} from '../src/lib/edition/daily-feeds.ts';

test('All eight daily features have valid credited fallbacks and deterministic rotation',()=>{
 assert.equal(DAILY_FALLBACKS.length,8);for(const item of DAILY_FALLBACKS)assert.equal(dailyItemSchema.safeParse(item).success,true, item.kind);
 const pools=fallbackPools();pools.quotes=[{...pools.quotes[0],id:'a'},{...pools.quotes[0],id:'b'},{...pools.quotes[0],id:'c'}];
 const first=selectDailyItems('2026-10-22',pools);assert.deepEqual(first,selectDailyItems('2026-10-22',pools));assert.notEqual(first[0].item.id,selectDailyItems('2026-10-23',pools)[0].item.id);
 assert.deepEqual(first,selectDailyItems('2026-10-22',{...pools,quotes:[...pools.quotes].reverse()}));
 assert.equal(first.length,8);assert.equal(new Set(first.map(x=>x.item.kind)).size,8);
 assert.throws(()=>dayNumber('2026-02-30'));assert.throws(()=>dayNumber('invalid'));
});
test('Saved choices replace just their kind and malformed overrides cannot break the edition',()=>{
 const pools=fallbackPools();const selected={...pools.fact[0],id:'editor-choice'};
 const items=selectDailyItems('2026-10-22',pools,[null,{...selected,sourceUrl:'javascript:alert(1)'},selected]);
 assert.equal(items.find(x=>x.item.kind==='fact').item.id,'editor-choice');assert.equal(items.filter(x=>x.manual).length,1);
 for(const sourceUrl of ['no','javascript:alert(1)','https://u:p@en.wikipedia.org/wiki/Fact','https://evil.test/']) assert.equal(dailyItemSchema.safeParse({...selected,sourceUrl}).success,false);
 for(const imageUrl of ['no','https://evil.test/tracker.png','http://imgs.xkcd.com/a.png'])assert.equal(dailyItemSchema.safeParse({...DAILY_FALLBACKS[3],imageUrl}).success,false);
});
test('Museum feed accepts only open-access images and preserves their credit',()=>{
 const art={id:1,title:'A painting',type:'Painting',share_license_status:'CC0',url:'https://clevelandart.org/art/1',images:{web:{url:'https://openaccess-cdn.clevelandart.org/1/1_web.jpg'}},creators:[{description:'Artist (1800–1870)'}],wall_description:'<p>A carefully painted landscape.</p>'};
 const items=artworkItems({data:[art,{...art,id:2,share_license_status:'Copyright'},{...art,id:3,images:{web:{url:'https://evil.test/image.jpg'}}}]});
 assert.equal(items.length,1);assert.equal(items[0].license,'CC0');assert.equal(items[0].credit,'Artist (1800–1870)');assert.equal(items[0].text,'A carefully painted landscape.');
});
test('Cartoons require approved image hosting and retain xkcd attribution and license',()=>{
 const data={num:100,title:'A comic',img:'https://imgs.xkcd.com/comics/example.png',alt:'A thoughtful joke.'};const item=cartoonItem(data)[0];assert.equal(item.credit,'Randall Munroe');assert.equal(item.license,'CC BY-NC 2.5');assert.equal(item.sourceUrl,'https://xkcd.com/100/');assert.deepEqual(cartoonItem({...data,img:'https://evil.test/image.png'}),[]);
});
test('Place and explainer summaries are bounded and facts favor educational entries',()=>{
 const data={type:'standard',title:'Example place',extract:'This is an educational description of a place, with enough context to be useful to a reader who has never visited it before.',coordinates:{lat:10,lon:20},content_urls:{desktop:{page:'https://en.wikipedia.org/wiki/Example'}}};
 const item=wikiItem(data,'place')[0];assert.ok(item.mapUrl.startsWith('https://www.openstreetmap.org/'));assert.equal(item.license,'CC BY-SA 4.0');assert.deepEqual(wikiItem({...data,type:'disambiguation'},'place'),[]);
 const page={pageid:42,content_urls:data.content_urls};const facts=factItems({events:[{year:1900,text:'A scientist discovers a new element.',pages:[page]},{year:1901,text:'A war kills many people.',pages:[page]}]},'2026-10-22');assert.equal(facts.length,1);assert.match(facts[0].title,/1900/);
 assert.equal(shortSummary('One sentence. '+'Another sentence. '.repeat(80),45),'One sentence. Another sentence.');
});
test('Every failed feed keeps all eight features usable without another editor task',async()=>{
 const original=globalThis.fetch;try{globalThis.fetch=async()=>{throw Error('offline')};const pools=await getDailyPools('2026-10-22');assert.equal(selectDailyItems('2026-10-22',pools).length,8);for(const kind of DAILY_KINDS)assert.ok(pools[kind].length);}finally{globalThis.fetch=original;}
});
test('Daily pick policies restrict replacement to editors and expose only the current UTC edition',async()=>{
 const db=new PGlite({extensions:{pgcrypto}});const editor='00000000-0000-4000-8000-000000000001',writer='00000000-0000-4000-8000-000000000002';
 const asUser=async(role,id='')=>{await db.exec(`reset role;set role ${role}`);await db.query("select set_config('test.uid',$1,false)",[id]);};
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;insert into auth.users values('${editor}'),('${writer}');create table public.dayboard_fixture(id int);insert into public.dayboard_fixture values(42);`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261014050023_newsroom_writer_editor_setup.sql',import.meta.url),'utf8'));await db.exec(`insert into public.newsroom_staff_profiles(user_id,role)values('${editor}','editor'),('${writer}','writer')`);
  const files=await readdir(new URL('../supabase/migrations/',import.meta.url));const file=files.find(f=>f.endsWith('_newsroom_daily_picks.sql'));assert.ok(file);await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'));
  const grants=files.find(f=>f.endsWith('_newsroom_daily_pick_grants.sql'));assert.ok(grants);await db.exec(await readFile(new URL(`../supabase/migrations/${grants}`,import.meta.url),'utf8'));assert.equal((await db.query("select has_table_privilege('anon','public.newsroom_daily_picks','insert') as allowed")).rows[0].allowed,false);assert.equal((await db.query("select has_table_privilege('authenticated','public.newsroom_daily_picks','truncate') as allowed")).rows[0].allowed,false);
  const item=JSON.stringify(DAILY_FALLBACKS.find(i=>i.kind==='fact'));
  await asUser('anon');await assert.rejects(db.query("insert into public.newsroom_daily_picks values(current_date,'fact',$1,now())",[item]));
  await asUser('authenticated',writer);await assert.rejects(db.query("insert into public.newsroom_daily_picks values(current_date,'fact',$1,now())",[item]));
  await asUser('authenticated',editor);await db.query("insert into public.newsroom_daily_picks values(current_date,'fact',$1,now())",[item]);
  await assert.rejects(db.query("insert into public.newsroom_daily_picks values(current_date+1,'fact',$1,now())",[item]));await assert.rejects(db.query("insert into public.newsroom_daily_picks values(current_date,'place',$1,now())",[item]));
  await assert.rejects(db.query("insert into public.newsroom_daily_picks values(current_date,'place','{}',now())"));
  await asUser('authenticated',writer);assert.equal((await db.query('select * from public.newsroom_daily_picks')).rows.length,1);assert.equal((await db.query('delete from public.newsroom_daily_picks returning *')).rows.length,0);
  await asUser('anon');assert.equal((await db.query('select * from public.newsroom_daily_picks')).rows.length,1);
  await db.exec('reset role');await db.exec('update public.newsroom_daily_picks set edition_date=current_date-1');await asUser('anon');assert.equal((await db.query('select * from public.newsroom_daily_picks')).rows.length,0);
  await asUser('authenticated',editor);assert.equal((await db.query('select * from public.newsroom_daily_picks')).rows.length,1);await db.exec('delete from public.newsroom_daily_picks');await db.exec('reset role');assert.deepEqual((await db.query('select * from public.dayboard_fixture')).rows,[{id:42}]);
 }finally{await db.close();}
});

test('Public daily cards show every feature and all selected text without a click',async()=>{
 const {transpileModule,ModuleKind,JsxEmit}=await import('typescript');const {createRequire}=await import('node:module');const {createElement}=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');const model=await import('../src/lib/edition/daily-model.ts');
 const source=await readFile(new URL('../src/components/daily-edition.tsx',import.meta.url),'utf8');const output=transpileModule(source,{compilerOptions:{module:ModuleKind.CommonJS,jsx:JsxEmit.ReactJSX}}).outputText;const compiledModule={exports:{}};const require=createRequire(import.meta.url);
 Function('require','module','exports',output)(name=>name==='@/lib/edition/daily-model'?model:name==='@/lib/edition/daily'?{}:name==='./story-listen'?{StoryListen:()=>null}:name==='next/image'?{default:props=>createElement('img',{src:props.src,alt:props.alt,width:props.width,height:props.height})}:require(name),compiledModule,compiledModule.exports);
 const html=renderToStaticMarkup(createElement(compiledModule.exports.DailyCards,{date:'2026-10-22',selections:model.DAILY_FALLBACKS.map(item=>({item,manual:false}))}));
 assert.equal((html.match(/<article /g)||[]).length,8);for(const label of Object.values(model.DAILY_LABELS))assert.ok(html.includes(label));assert.ok(html.includes('Explore on map'));assert.ok(html.includes('CC BY-NC 2.5'));assert.ok(html.includes('CC0'));assert.ok(!html.includes('line-clamp'));assert.ok(!html.includes('<details'));assert.ok(!html.includes('Read more'));assert.ok(html.includes('That perches in the soul'));
});

test('Editor action uses server feed candidates, enforces editor access, and resets without feed requests',async()=>{
 const {transpileModule,ModuleKind}=await import('typescript');const {createRequire}=await import('node:module');const model=await import('../src/lib/edition/daily-model.ts');const require=createRequire(import.meta.url);const compiledModule={exports:{}};
 const source=await readFile(new URL('../src/app/admin/daily/actions.ts',import.meta.url),'utf8');const output=transpileModule(source,{compilerOptions:{module:ModuleKind.CommonJS}}).outputText;
 let role='writer',feedCalls=0;const writes=[],refreshed=[];const chain={error:null,eq(){return this;}};const supabase={from(name){assert.equal(name,'newsroom_daily_picks');return{async upsert(row){writes.push(row);return{error:null}},delete(){writes.push('reset');return chain;}}}};
 Function('require','module','exports',output)(name=>name==='@/lib/staff'?{getStaffSession:async()=>({role,user:{id:'editor'},supabase})}:name==='@/lib/edition/daily-feeds'?{getDailyPools:async()=>{feedCalls++;return model.fallbackPools();}}:name==='@/lib/edition/daily-model'?model:name==='next/cache'?{revalidatePath:path=>refreshed.push(path)}:require(name),compiledModule,compiledModule.exports);
 const date=model.editionDate();const id=model.DAILY_FALLBACKS.find(item=>item.kind==='fact').id;
 assert.match((await compiledModule.exports.chooseDailyItem(date,'fact',id)).error,/Editor access/);assert.equal(feedCalls,0);
 role='editor';assert.match((await compiledModule.exports.chooseDailyItem('2000-01-01','fact',id)).error,/changed/);assert.ok((await compiledModule.exports.chooseDailyItem(date,'fact','forged-id')).error);assert.equal(writes.length,0);
 assert.equal((await compiledModule.exports.chooseDailyItem(date,'fact',id)).error,'');assert.equal(writes[0].item.id,id);assert.deepEqual(refreshed,['/','/admin/daily']);
 const before=feedCalls;assert.equal((await compiledModule.exports.chooseDailyItem(date,'fact',null)).error,'');assert.equal(feedCalls,before);assert.equal(writes.at(-1),'reset');
});

test('Automatic readings prefer short pieces and public-domain poets',()=>{
 const item={category:'poems',text:'A short poem',author:'Robert Browning',source:'PoetryDB',source_url:'https://poetrydb.org/'};assert.equal(suitableReading(item),true);assert.equal(suitableReading({...item,author:'Unknown contemporary poet'}),false);assert.equal(suitableReading({...item,text:'x'.repeat(1001)}),false);
});
