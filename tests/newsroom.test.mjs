import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { articleSchema } from '../src/lib/article-validation.ts';

const editor = '00000000-0000-4000-8000-000000000001';
const writer = '00000000-0000-4000-8000-000000000002';
const outsider = '00000000-0000-4000-8000-000000000004';
const other = '00000000-0000-4000-8000-000000000003';
const draft = '00000000-0000-4000-8000-000000000011';
const published = '00000000-0000-4000-8000-000000000012';
const anotherDraft = '00000000-0000-4000-8000-000000000013';
const scheduled = '00000000-0000-4000-8000-000000000014';

test('Newsroom permissions and atomic ordering in PostgreSQL', async (t) => {
  const db = new PGlite({ extensions: { pgcrypto } });
  const asUser = async (role, id = '') => {
    await db.exec(`reset role; set role ${role};`);
    await db.query("select set_config('test.uid', $1, false)", [id]);
  };
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
      grant usage on schema public, auth to anon, authenticated;
      alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
      insert into auth.users values ('${editor}'), ('${writer}'), ('${other}'), ('${outsider}');
    `);
    await db.exec(`
      create table public.dayboard_profiles(user_id uuid primary key, role text);
      create table public.gabriel_circle_members(user_id uuid primary key, role text);
      create table public.categories(id text primary key);
      create table public.articles(id text primary key);
      create table public.staff_profiles(user_id uuid primary key, role text);
      create table public.admin_profiles(user_id uuid primary key);
      insert into public.dayboard_profiles values ('${outsider}', 'owner');
      insert into public.gabriel_circle_members values ('${outsider}', 'owner');
      insert into public.categories values ('other-app-category');
      insert into public.articles values ('other-app-article');
      insert into public.staff_profiles values ('${outsider}', 'admin');
      insert into public.admin_profiles values ('${outsider}');
      create function public.is_admin() returns boolean language sql as $$ select true $$;
    `);
    const before = await db.query("select pg_get_functiondef('public.is_admin()'::regprocedure) as definition");
    await db.exec(await readFile(new URL('../supabase/migrations/202610140001_newsroom.sql', import.meta.url), 'utf8'));
    await db.exec(`
      insert into public.newsroom_staff_profiles(user_id, role) values ('${editor}', 'editor');
      insert into public.newsroom_staff_profiles(user_id, role) values ('${writer}', 'writer'), ('${other}', 'writer');
      insert into public.newsroom_articles (id, category_id, title, slug, dek, body, author, image_url, image_alt, owner_id, status, published_at)
      select fixtures.id::uuid, c.id, 'Fixture story', fixtures.slug, 'Fixture description', 'Fixture text', 'Writer', '', '', fixtures.owner::uuid, fixtures.status, fixtures.date::timestamptz
      from (values
        ('${draft}', 'draft', '${writer}', 'draft', '2020-01-01'),
        ('${published}', 'published', '${writer}', 'published', '2020-01-01'),
        ('${anotherDraft}', 'other-draft', '${other}', 'draft', '2020-01-01'),
        ('${scheduled}', 'scheduled', '${other}', 'published', '2099-01-01')
      ) as fixtures(id, slug, owner, status, date)
      cross join (select id from public.newsroom_categories limit 1) c;
    `);
    await t.test('newsroom editors have their own app-scoped role', async () => {
      await asUser('authenticated', editor);
      assert.equal((await db.query('select public.newsroom_current_role() as role')).rows[0].role, 'editor');
    });
    await t.test('shared setup is idempotent and leaves other app data and functions untouched', async () => {
      await db.exec('reset role');
      await db.exec(await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8'));
      assert.deepEqual(await db.query("select pg_get_functiondef('public.is_admin()'::regprocedure) as definition"), before);
      assert.deepEqual((await db.query('select id from public.articles')).rows, [{ id: 'other-app-article' }]);
      assert.deepEqual((await db.query('select id from public.categories')).rows, [{ id: 'other-app-category' }]);
      assert.equal((await db.query('select role from public.dayboard_profiles')).rows[0].role, 'owner');
      assert.equal((await db.query('select role from public.gabriel_circle_members')).rows[0].role, 'owner');
    });
    await t.test('another app’s admin does not automatically become a newsroom editor', async () => {
      await asUser('authenticated', outsider);
      assert.equal((await db.query('select public.newsroom_current_role() as role')).rows[0].role, null);
      await assert.rejects(db.exec(`select public.move_newsroom_article('${draft}', 'published', null)`));
    });
    await t.test('guests see only live published articles', async () => {
      await asUser('anon');
      assert.deepEqual((await db.query('select id from public.newsroom_articles')).rows.map(r => r.id), [published]);
      await assert.rejects(db.exec(`select public.move_newsroom_article('${draft}', 'published', null)`));
    });
    await t.test('writers cannot see another writer’s drafts or scheduled stories', async () => {
      await asUser('authenticated', writer);
      assert.equal((await db.query('select count(*)::int as count from public.newsroom_articles')).rows[0].count, 2);
    });
    await t.test('writers can edit and submit their own drafts', async () => {
      const result = await db.query(`update public.newsroom_articles set body = 'Revised text', status = 'review' where id = '${draft}' returning id`);
      assert.equal(result.rows.length, 1);
    });
    await t.test('writers cannot publish or feature their stories', async () => {
      await assert.rejects(db.exec(`update public.newsroom_articles set status = 'published' where id = '${draft}'`));
      await assert.rejects(db.exec(`update public.newsroom_articles set is_featured = true where id = '${draft}'`));
      await assert.rejects(db.exec(`select public.move_newsroom_article('${draft}', 'published', null)`));
    });
    await t.test('writers cannot edit published or other-owned articles, delete, or transfer ownership', async () => {
      for (const id of [published, anotherDraft]) assert.equal((await db.query(`update public.newsroom_articles set body = 'Tampered' where id = '${id}' returning id`)).rows.length, 0);
      assert.equal((await db.query(`delete from public.newsroom_articles where id = '${draft}' returning id`)).rows.length, 0);
      await assert.rejects(db.exec(`update public.newsroom_articles set owner_id = '${other}' where id = '${draft}'`));
    });
    await t.test('staff cannot promote themselves or insert another owner’s story', async () => {
      await assert.rejects(db.exec(`update public.newsroom_staff_profiles set role = 'editor' where user_id = '${writer}'`));
      await assert.rejects(db.exec(`insert into public.newsroom_staff_profiles(user_id,role) values ('${writer}', 'editor')`));
      await assert.rejects(db.exec(`insert into public.newsroom_articles(category_id,title,slug,dek,body,author,image_url,image_alt,owner_id) select category_id,title,'forged',dek,body,author,image_url,image_alt,'${other}'::uuid from public.newsroom_articles where id='${draft}'`));
    });
    await t.test('editors publish and atomically reorder stories', async () => {
      await asUser('authenticated', editor);
      await db.exec(`select public.move_newsroom_article('${draft}', 'published', '${published}')`);
      assert.deepEqual((await db.query("select id from public.newsroom_articles where status='published' order by position, published_at desc, id")).rows.map(r => r.id), [scheduled, draft, published]);
      await db.exec(`select public.move_newsroom_article('${draft}', 'published', null)`);
      assert.deepEqual((await db.query("select id from public.newsroom_articles where status='published' order by position")).rows.map(r => r.id), [scheduled, published, draft]);
    });
    await t.test('invalid moves preserve the board', async () => {
      await assert.rejects(db.exec(`select public.move_newsroom_article('${published}', 'draft', '${draft}')`));
      assert.equal((await db.query(`select status from public.newsroom_articles where id='${published}'`)).rows[0].status, 'published');
      await assert.rejects(db.exec(`select public.move_newsroom_article('${published}', 'invalid', null)`));
    });
    await t.test('database rejects unsafe media protocols and malformed blocks', async () => {
      await assert.rejects(db.exec(`update public.newsroom_articles set content_blocks='[{"type":"link","url":"javascript:alert(1)"}]' where id='${draft}'`));
      await assert.rejects(db.exec(`update public.newsroom_articles set content_blocks='{}' where id='${draft}'`));
      await db.exec(`update public.newsroom_articles set content_blocks='[{"type":"audio","url":"https://example.com/audio.mp3","caption":"Interview"}]' where id='${draft}'`);
    });
  } finally { await db.close(); }
});

test('Article validation accepts mixed media without a mandatory image or body and rejects unsafe links', () => {
  const article = { category_id: editor, title: 'An interview', slug: 'an-interview', dek: 'An interview with our guest.', author: 'A Writer', body: '', image_url: '', image_alt: '', status: 'review', is_featured: false, published_at: new Date().toISOString(), content_blocks: [{ type: 'audio', url: 'https://example.com/interview.mp3', caption: 'Interview' }, { type: 'text', text: 'Transcript.' }] };
  assert.equal(articleSchema.safeParse(article).success, true);
  assert.equal(articleSchema.safeParse({ ...article, content_blocks: [] }).success, false);
  assert.equal(articleSchema.safeParse({ ...article, content_blocks: [{ type: 'link', url: 'javascript:alert(1)', caption: '' }] }).success, false);
});
