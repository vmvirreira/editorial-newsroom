import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { parseFeed, canonicalSourceUrl } from '../src/lib/curation/feed.ts';

const source = { id: 'bbc-world', name: 'BBC News', category: 'world', hosts: ['bbc.com', 'bbc.co.uk'] };
const now = Date.parse('2026-10-20T12:00:00Z');
const item = (url, title = '<![CDATA[A useful headline]]>', date = 'Tue, 20 Oct 2026 10:00:00 GMT') => `<item><title>${title}</title><link>${url.replaceAll('&', '&amp;')}</link><pubDate>${date}</pubDate><description>DO NOT COPY ARTICLE TEXT</description></item>`;
const rss = items => `<rss version="2.0"><channel>${items}</channel></rss>`;
test('RSS imports only recent headlines and source links, canonicalizes and deduplicates', () => {
  const result = parseFeed(rss(item('https://www.bbc.com/news/123?utm_source=rss#top', '<![CDATA[<b>News</b> &amp; context]]>') + item('https://www.bbc.com/news/123') + item('https://evil.example/x') + item('https://www.bbc.com/old', 'Old story', 'Mon, 01 Sep 2025 10:00:00 GMT') + item('https://www.bbc.com/future', 'Future story', 'Tue, 20 Oct 2026 13:00:00 GMT')), source, now);
  assert.equal(result.length, 1);
  assert.equal(result[0].headline, 'News & context');
  assert.equal(result[0].source_url, 'https://www.bbc.com/news/123');
  assert.equal(JSON.stringify(result).includes('DO NOT COPY'), false);
});
test('RSS rejects entities, malformed and oversized payloads', () => {
  for (const xml of ['<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss/>', '<rss><channel></rss>', 'x'.repeat(1_000_001)]) assert.throws(() => parseFeed(xml, source, now));
});
test('XML-escaped tracking parameters are removed from source URLs', () => {
  assert.equal(canonicalSourceUrl('https://bbc.com/news/a?at_medium=RSS&amp;at_campaign=rss', source), 'https://bbc.com/news/a');
});
test('Source URL validation rejects non-HTTPS, credentials, ports and lookalike domains', () => {
  for (const url of ['http://bbc.com/news', 'https://bbc.com.evil.example/x', 'https://u:p@bbc.com/x', 'https://bbc.com:444/x', 'javascript:alert(1)', 'https://evilbbc.com/x']) assert.equal(canonicalSourceUrl(url, source), null);
});
test('RSS orders newest first and caps suggestions per source', () => {
  const result = parseFeed(rss(Array.from({ length: 12 }, (_, i) => item(`https://bbc.com/news/${i}`, `Story ${i}`, `Tue, 20 Oct 2026 ${String(i).padStart(2, '0')}:00:00 GMT`)).join('')), source, now);
  assert.equal(result.length, 8); assert.equal(result[0].headline, 'Story 11');
});

test('Curation SQL keeps suggestions editor-only and creates one private attributed draft', async () => {
  const db = new PGlite({ extensions: { pgcrypto } });
  const editor = '00000000-0000-4000-8000-000000000001';
  const writer = '00000000-0000-4000-8000-000000000002';
  const asUser = async (role, id = '') => { await db.exec(`reset role; set role ${role}`); await db.query("select set_config('test.uid', $1, false)", [id]); };
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
      grant usage on schema public,auth to anon,authenticated;
      alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;
      insert into auth.users values('${editor}'),('${writer}');
      create table public.dayboard_fixture(id integer); insert into public.dayboard_fixture values(42);`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261014050023_newsroom_writer_editor_setup.sql', import.meta.url), 'utf8'));
    const files = await readdir(new URL('../supabase/migrations/', import.meta.url));
    const migration = files.find(file => file.endsWith('_newsroom_curated_inbox.sql'));
    assert.ok(migration, 'Curation migration is recorded');
    await db.exec(await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), 'utf8'));
    await db.exec(`insert into public.newsroom_staff_profiles(user_id,role) values('${editor}','editor'),('${writer}','writer')`);
    await asUser('authenticated', editor);
    const suggestion = (await db.query(`insert into public.newsroom_suggestions(category_id,source_id,source_name,source_url,headline,source_published_at) select id,'bbc-world','BBC News','https://bbc.com/news/fixture','A verified source headline',now() from public.newsroom_categories where slug='world' returning id`)).rows[0].id;
    await asUser('anon'); await assert.rejects(db.query('select * from public.newsroom_suggestions'));
    await asUser('authenticated', writer); assert.equal((await db.query('select * from public.newsroom_suggestions')).rows.length, 0);
    await assert.rejects(db.query('select public.newsroom_create_curated_draft($1)', [suggestion]));
    await assert.rejects(db.query(`insert into public.newsroom_suggestions(category_id,source_id,source_name,source_url,headline,source_published_at) select id,'fake','Fake','https://bbc.com/forged','Forged story',now() from public.newsroom_categories limit 1`));
    await asUser('authenticated', editor);
    await db.query("update public.newsroom_suggestions set status='dismissed' where id=$1", [suggestion]);
    await assert.rejects(db.query('select public.newsroom_create_curated_draft($1)', [suggestion]));
    await db.query("update public.newsroom_suggestions set status='new' where id=$1", [suggestion]);
    const first = (await db.query('select public.newsroom_create_curated_draft($1) as id', [suggestion])).rows[0].id;
    const second = (await db.query('select public.newsroom_create_curated_draft($1) as id', [suggestion])).rows[0].id;
    assert.equal(first, second);
    const article = (await db.query('select * from public.newsroom_articles where id=$1', [first])).rows[0];
    assert.equal(article.status, 'draft'); assert.equal(article.is_featured, false); assert.equal(article.owner_id, editor);
    assert.equal(article.source_name, 'BBC News'); assert.equal(article.source_url, 'https://bbc.com/news/fixture');
    assert.equal(article.image_url, ''); assert.equal(article.content_blocks[0].type, 'link'); assert.equal(article.content_blocks[0].url, article.source_url);
    const { articleSchema } = await import('../src/lib/article-validation.ts');
    assert.equal(articleSchema.safeParse({ ...article, published_at: article.published_at.toISOString() }).success, true);
    await asUser('anon'); assert.equal((await db.query('select * from public.newsroom_articles')).rows.length, 0);
    await db.exec('reset role'); assert.deepEqual((await db.query('select * from public.dayboard_fixture')).rows, [{ id: 42 }]);
  } finally { await db.close(); }
});
