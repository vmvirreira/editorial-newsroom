import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFeed, mergeFeedStories } from '../src/lib/curation/feed.ts';
import { CURATION_SOURCES } from '../src/lib/curation/sources.ts';
const now = Date.parse('2026-10-22T12:00:00Z');
const source = id => CURATION_SOURCES.find(s => s.id === id);
test('Atom imports Reddit discussion links and strips preview markup without accepting external links', () => {
 const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>A community lead</title><link rel="self" href="https://evil.example/"/><link rel="alternate" href="https://www.reddit.com/r/worldnews/comments/abc/lead/"/><updated>2026-10-22T10:00:00Z</updated><content type="html">&lt;p&gt;Read the linked reporting.&lt;/p&gt;</content></entry><entry><title>Off-site entry</title><link href="https://evil.example/"/><updated>2026-10-22T10:00:00Z</updated></entry></feed>`;
 const stories = parseFeed(xml, source('reddit-world'), now);
 assert.equal(stories.length, 1); assert.match(stories[0].source_url, /reddit.com\/r\/worldnews\/comments/); assert.equal(stories[0].source_preview, 'Read the linked reporting.');
});
test('Atom published date takes precedence over edited date and supports typed titles', () => {
 const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title type="text">An old article</title><link href="https://www.theverge.com/old"/><published>2025-01-01T00:00:00Z</published><updated>2026-10-22T10:00:00Z</updated></entry></feed>`;
 assert.deepEqual(parseFeed(xml, source('verge-technology'), now), []);
});
test('RDF imports Nature and DW items with dc dates', () => {
 const xml = `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/"><item><title>Research findings</title><link>https://www.nature.com/articles/example</link><dc:date>2026-10-22T09:00:00Z</dc:date></item></rdf:RDF>`;
 assert.equal(parseFeed(xml, source('nature-science'), now)[0].headline, 'Research findings');
});
test('Hacker News stores its allowlisted discussion URL rather than arbitrary external submissions', () => {
 const xml = `<rss><channel><item><title>A useful submission</title><link>https://untrusted.example/article</link><comments>https://news.ycombinator.com/item?id=42</comments><pubDate>Thu, 22 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>`;
 assert.equal(parseFeed(xml, source('hackernews-technology'), now)[0].source_url, 'https://news.ycombinator.com/item?id=42');
});
test('Wire discovery verifies publisher metadata before attributing Google News results', () => {
 const entry = (host, id) => `<item><title>A wire story</title><link>https://news.google.com/rss/articles/${id}</link><source url="https://${host}">Publisher</source><pubDate>Thu, 22 Oct 2026 10:00:00 GMT</pubDate></item>`;
 const xml = `<rss><channel>${entry('apnews.com', 'good')}${entry('apnews.com.evil.example', 'bad')}${entry('reuters.com', 'other')}</channel></rss>`;
 const stories = parseFeed(xml, source('ap-world'), now);
 assert.equal(stories.length, 1); assert.equal(stories[0].source_name, 'Associated Press via Google News');
});
test('Expanded catalog covers each category and refresh stays within the database batch limit', () => {
 assert.equal(new Set(CURATION_SOURCES.map(s => s.id)).size, CURATION_SOURCES.length);
 for (const category of ['politics','business','world','culture','science','technology']) {
  const sources = CURATION_SOURCES.filter(s => s.category === category);
  assert.ok(sources.length >= 7); assert.ok(sources.some(s => s.id === `ap-${category}`)); assert.ok(sources.some(s => s.id === `reuters-${category}`)); assert.ok(sources.some(s => s.kind === 'community'));
 }
 const batches = CURATION_SOURCES.map(s => Array.from({length:8},(_,i) => ({source_url:`https://example.com/${s.id}/${i}`})));
 const merged = mergeFeedStories(batches); assert.equal(merged.length, 96); assert.equal(new Set(merged.slice(0,CURATION_SOURCES.length).map(s => s.source_url)).size, CURATION_SOURCES.length);
});
