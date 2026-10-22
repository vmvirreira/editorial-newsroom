import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { resolvePublicationTime, formatPublicationTime } from '../src/lib/publication-time.ts';

test('Publication input is explicitly UTC and unchanged minutes retain stored precision', () => {
 const previous='2026-10-21T12:34:56.789Z';
 assert.equal(resolvePublicationTime('2026-10-21T12:34',previous),previous);
 assert.equal(resolvePublicationTime('2026-10-22T09:15',previous),'2026-10-22T09:15:00.000Z');
 assert.equal(resolvePublicationTime('',previous),previous);
 assert.equal(resolvePublicationTime('',undefined,'2026-10-22T10:20:30.000Z'),'2026-10-22T10:20:30.000Z');
 for(const invalid of ['2026-02-30T12:00','2026-10-22T25:00','bad','2026-10-22T12:00-05:00']) assert.throws(()=>resolvePublicationTime(invalid));
 assert.match(formatPublicationTime(previous),/21 Oct 2026.*12:34 UTC/);
});

test('Atomic saves preserve order and publication transitions default to first place', async t => {
 const db=new PGlite({extensions:{pgcrypto}});
 const editor='00000000-0000-4000-8000-000000000001',writer='00000000-0000-4000-8000-000000000002',outsider='00000000-0000-4000-8000-000000000003';
 const asUser=async(role,id='')=>{await db.exec(`reset role;set role ${role}`);await db.query("select set_config('test.uid',$1,false)",[id]);};
 try {
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;insert into auth.users values('${editor}'),('${writer}'),('${outsider}');create table public.dayboard_fixture(id integer);insert into public.dayboard_fixture values(42);`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261014050023_newsroom_writer_editor_setup.sql',import.meta.url),'utf8'));
  await db.exec(`insert into public.newsroom_staff_profiles(user_id,role) values('${editor}','editor'),('${writer}','writer')`);
  const category=(await db.query('select id from public.newsroom_categories limit 1')).rows[0].id;
  const ids=[];
  for(let i=0;i<3;i++)ids.push((await db.query(`insert into public.newsroom_articles(category_id,title,slug,dek,body,author,image_url,image_alt,status,published_at) values($1,$2,$3,'An initial summary','Story text','Editor','','','published',$4) returning id`,[category,`Story ${i}`,`story-${i}`,`2026-10-0${i+1}T12:34:56.789Z`])).rows[0].id);
  const before=(await db.query('select id from public.newsroom_articles order by position,published_at desc,id')).rows.map(r=>r.id);
  const files=await readdir(new URL('../supabase/migrations/',import.meta.url));const migration=files.find(f=>f.endsWith('_newsroom_publication_order.sql'));assert.ok(migration);
  await db.exec(await readFile(new URL(`../supabase/migrations/${migration}`,import.meta.url),'utf8'));
  const order=async()=> (await db.query("select id from public.newsroom_articles where status='published' order by position,id")).rows.map(r=>r.id);
  const fields=(slug,status='published',published_at='2026-10-22T01:02:03.456Z')=>({category_id:category,title:`Title ${slug}`,slug,dek:'An editor-reviewed summary',body:'Useful story text',author:'Editor',image_url:'',image_alt:'',status,is_featured:false,published_at,content_blocks:[]});
  const save=async(id,data)=>(await db.query('select public.save_newsroom_article($1,$2::jsonb) as id',[id,JSON.stringify(data)])).rows[0].id;
  await asUser('authenticated',editor);
  await t.test('Normalization retains the existing visible sequence',async()=>assert.deepEqual(await order(),before));
  await t.test('Changing content or publication time keeps the same slot',async()=>{
   const id=before[1];const oldPosition=(await db.query('select position from public.newsroom_articles where id=$1',[id])).rows[0].position;
   await save(id,fields('edited-middle','published','2020-01-01T00:00:00Z'));assert.deepEqual(await order(),before);assert.equal((await db.query('select position from public.newsroom_articles where id=$1',[id])).rows[0].position,oldPosition);
  });
  let direct,draft;
  await t.test('A new directly published story is first and stays first after editing',async()=>{direct=await save(null,fields('new-direct'));assert.equal((await order())[0],direct);const previous=await order();await save(direct,fields('new-direct'));assert.deepEqual(await order(),previous);});
  await t.test('A saved draft publishes at the top through the same atomic save',async()=>{draft=await save(null,fields('new-draft','draft'));await save(draft,fields('new-draft'));assert.equal((await order())[0],draft);assert.equal((await order())[1],direct);});
  await t.test('Explicit reorder is retained by subsequent article saves',async()=>{await db.query('select public.move_newsroom_article($1,$2,null)',[draft,'published']);const previous=await order();assert.equal(previous.at(-1),draft);await save(draft,fields('new-draft'));assert.deepEqual(await order(),previous);});
  await t.test('Publishing via the board defaults to the top and uses the actual publication time',async()=>{
   const id=await save(null,fields('board-draft','review','2020-01-01T00:00:00Z'));await db.query('select public.move_newsroom_article($1,$2,null)',[id,'published']);assert.equal((await order())[0],id);const date=(await db.query('select published_at from public.newsroom_articles where id=$1',[id])).rows[0].published_at;assert.ok(date.getTime()>Date.parse('2026-10-21T00:00:00Z'));
  });
  await t.test('An explicit drop target and future scheduling remain respected',async()=>{
   const id=await save(null,fields('future-draft','draft','2099-01-01T00:00:00Z'));const target=(await order())[2];await db.query('select public.move_newsroom_article($1,$2,$3)',[id,'published',target]);const sequence=await order();assert.equal(sequence[sequence.indexOf(target)-1],id);assert.equal((await db.query('select published_at from public.newsroom_articles where id=$1',[id])).rows[0].published_at.toISOString(),'2099-01-01T00:00:00.000Z');await asUser('anon');assert.equal((await db.query('select id from public.newsroom_articles where id=$1',[id])).rows.length,0);await asUser('authenticated',editor);
  });
  await t.test('Failed saves and stale drops leave order intact',async()=>{const previous=await order();await assert.rejects(save(null,fields('new-direct')));await assert.rejects(db.query('select public.move_newsroom_article($1,$2,$3)',[draft,'published','00000000-0000-4000-8000-000000000099']));assert.deepEqual(await order(),previous);});
  await t.test('Writers can save their drafts but cannot publish, arrange, or edit published stories',async()=>{
   await asUser('authenticated',writer);const own=await save(null,fields('writer-draft','draft'));await save(own,fields('writer-draft','review'));await assert.rejects(save(own,fields('writer-draft')));await assert.rejects(save(direct,fields('new-direct')));await assert.rejects(db.query('select public.move_newsroom_article($1,$2,null)',[own,'published']));
   await asUser('authenticated',outsider);await assert.rejects(save(null,fields('outsider-draft','draft')));await asUser('anon');await assert.rejects(save(null,fields('anon-draft','draft')));
   await db.exec('reset role');assert.deepEqual((await db.query('select * from public.dayboard_fixture')).rows,[{id:42}]);assert.equal((await db.query("select prosecdef from pg_proc where proname='save_newsroom_article'")).rows[0].prosecdef,false);
  });
 }finally{await db.close();}
});
