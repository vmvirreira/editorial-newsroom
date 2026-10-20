import {test} from 'node:test';
import assert from 'node:assert/strict';
import {youtubeVideoId,youtubeEmbed,youtubeWatchUrl} from '../src/lib/media/youtube.ts';
import {weatherIconKind} from '../src/lib/edition/weather-icon.ts';

test('YouTube share, watch, Shorts, live and embed links resolve to the same private embed',()=>{
 const id='dQw4w9WgXcQ';
 for(const url of [`https://youtu.be/${id}?si=share`,`https://www.youtube.com/watch?v=${id}&t=23`,`https://m.youtube.com/watch?v=${id}`,`https://youtube.com/shorts/${id}`,`https://youtube.com/live/${id}`,`https://www.youtube-nocookie.com/embed/${id}`]){
  assert.equal(youtubeVideoId(url),id);assert.equal(youtubeWatchUrl(url),`https://www.youtube.com/watch?v=${id}`);assert.equal(youtubeEmbed(url),`https://www.youtube-nocookie.com/embed/${id}`);
 }
});
test('YouTube parser rejects lookalike hosts, playlists, executable URLs, credentials and malformed IDs',()=>{
 for(const url of ['javascript:alert(1)','https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ','https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ','https://youtube.com:444/watch?v=dQw4w9WgXcQ','https://youtube.com/playlist?list=abc','https://youtu.be/dQw4w9WgXcQ/extra','https://youtube.com/watch?v=bad','https://example.com/dQw4w9WgXcQ'])assert.equal(youtubeEmbed(url),null);
});
test('Weather icon prioritizes hazardous mixed conditions and keeps unknown forecasts neutral',()=>{
 for(const [forecast,kind] of [['Sunny','sun'],['Mostly Clear','partly'],['Partly Sunny','partly'],['Overcast','cloud'],['Patchy Fog','fog'],['Rain and Snow','snow'],['Rain showers and thunderstorms','storm'],['Light rain','rain'],['Forecast unavailable','unknown']])assert.equal(weatherIconKind(forecast),kind);
});
