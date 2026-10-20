import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {transpileModule,ModuleKind,JsxEmit} from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {validZip, safeForecastUrl, groupForecast, getLocalWeather} from '../src/lib/edition/weather.ts';
import {safeReadingItems, getReadingBreak, READING_FALLBACKS} from '../src/lib/edition/reading.ts';
import {mergeFeedStories} from '../src/lib/curation/feed.ts';
import {CURATION_SOURCES} from '../src/lib/curation/sources.ts';

test('US ZIP validation preserves leading zeros and rejects arbitrary request input',()=>{
 assert.equal(validZip('02108'),true);for(const zip of ['','1234','123456','../../x','10001?x=1',10001,null])assert.equal(validZip(zip),false);
 for(const url of ['https://evil.test/gridpoints/OKX/1,2/forecast','http://api.weather.gov/gridpoints/OKX/1,2/forecast','https://user@api.weather.gov/gridpoints/OKX/1,2/forecast','https://api.weather.gov/alerts','https://api.weather.gov/gridpoints/OKX/1,2/forecast?url=evil'])assert.equal(safeForecastUrl(url),null);
 assert.equal(safeForecastUrl('https://api.weather.gov/gridpoints/OKX/1,2/forecast'),'https://api.weather.gov/gridpoints/OKX/1,2/forecast');
});
test('NWS daily periods keep daytime highs, overnight lows and missing values without inventing weather',()=>{
 const day=(date,isDaytime,temperature,chance)=>({startTime:`2026-10-${date}T${isDaytime?'08':'20'}:00:00-04:00`,isDaytime,temperature,temperatureUnit:'F',shortForecast:isDaytime?'Sunny':'Cloudy',probabilityOfPrecipitation:{value:chance}});
 const result=groupForecast([day(20,false,50,20),day(21,true,68,10),day(21,false,49,40),{...day(22,true,20,0),temperatureUnit:'C'}]);
 assert.deepEqual(result,[{date:'2026-10-20',high:null,low:50,forecast:'Cloudy',precipitation:20},{date:'2026-10-21',high:68,low:49,forecast:'Sunny',precipitation:40}]);
});
test('Weather resolves ZIP, validates the returned forecast host, and returns attributed daily data',async()=>{
 const original=globalThis.fetch;const calls=[];
 try{
 globalThis.fetch=async(url)=>{calls.push(String(url));return {ok:true,json:async()=>String(url).includes('zippopotam')?{places:[{'place name':'Boston','state abbreviation':'MA',latitude:'42.35',longitude:'-71.06'}]}:String(url).includes('/points/')?{properties:{forecast:'https://api.weather.gov/gridpoints/BOX/1,2/forecast',timeZone:'America/New_York'}}:{properties:{updated:'2026-10-20T10:00:00Z',periods:[{startTime:'2026-10-20T08:00:00-04:00',isDaytime:true,temperature:65,temperatureUnit:'F',shortForecast:'Sunny'}]}}};};
 const result=await getLocalWeather('02108');assert.equal(result.zip,'02108');assert.equal(result.place,'Boston, MA');assert.equal(result.days[0].high,65);assert.ok(result.sourceUrl.startsWith('https://forecast.weather.gov/'));assert.equal(calls.length,3);
 let invoked=0;globalThis.fetch=async()=>{invoked++;throw Error()};await assert.rejects(getLocalWeather('bad'));assert.equal(invoked,0);
 globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('zippopotam')?{places:[{'place name':'X','state abbreviation':'XX',latitude:'40',longitude:'-70'}]}:{properties:{forecast:'https://evil.test/forecast'}}});
 await assert.rejects(getLocalWeather('10001'),/unavailable/);
 }finally{globalThis.fetch=original;}
});
test('Reading feed retains attribution, accepts only known kinds and never executes external scripts',async()=>{
 const item={category:'quotes',text:'A thoughtful line.',author:'An author',source:'A source',source_url:'https://example.com/'};
 assert.deepEqual(safeReadingItems([item,{...item,category:'unknown'},{...item,source_url:'javascript:alert(1)'}]),[item]);
 const original=globalThis.fetch;
 try{globalThis.fetch=async()=>{throw Error('Unavailable')};const result=await getReadingBreak();assert.equal(result.fallback,true);assert.deepEqual(result.items,READING_FALLBACKS);}
 finally{globalThis.fetch=original;}
});
test('Expanded curation balances every source and stays within the database batch bound',()=>{
 const batches=Array.from({length:22},(_,source)=>Array.from({length:8},(_,n)=>({source_url:`https://source${source}.test/${n}`,headline:`${source}-${n}`})));
 const merged=mergeFeedStories(batches);assert.equal(merged.length,96);assert.equal(new Set(merged.slice(0,22).map(item=>item.source_url.split('/')[2])).size,22);
 assert.ok(CURATION_SOURCES.length>=20);for(const category of ['politics','business','world','culture','science','technology'])assert.ok(CURATION_SOURCES.filter(s=>s.category===category).length>=3);
});
test('Every story card can render selected explainers or a clearly labeled Wikipedia search',async()=>{
 const source=await readFile(new URL('../src/components/article-content.tsx',import.meta.url),'utf8');
 const output=transpileModule(source,{compilerOptions:{module:ModuleKind.CommonJS,jsx:JsxEmit.ReactJSX}}).outputText;
 const compiledModule={exports:{}};const require=createRequire(import.meta.url);
 const media=await import('../src/lib/media/youtube.ts');
 Function('require','module','exports',output)(name=>name==='@/lib/media/youtube'?media:require(name),compiledModule,compiledModule.exports);
 const fallback=renderToStaticMarkup(createElement(compiledModule.exports.ArticleExplainers,{blocks:[],compact:true,headline:'NASA mission to Mars'}));
 assert.ok(fallback.includes('Explore the background'));assert.ok(fallback.includes('Search Wikipedia for background'));assert.ok(fallback.includes('search=NASA+mission+to+Mars'));
 const selected=renderToStaticMarkup(createElement(compiledModule.exports.ArticleExplainers,{blocks:[{type:'explainer',url:'https://en.wikipedia.org/wiki/NASA',caption:'NASA'}],compact:true,headline:'NASA mission'}));
 assert.ok(selected.includes('/wiki/NASA'));assert.ok(!selected.includes('Search Wikipedia'));
});
