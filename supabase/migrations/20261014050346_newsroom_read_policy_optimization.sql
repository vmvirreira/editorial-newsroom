begin;
drop policy if exists "Newsroom public reads" on public.newsroom_articles;
create policy "Newsroom public reads" on public.newsroom_articles for select to anon
using (status = 'published' and published_at <= now());
drop policy if exists "Newsroom staff reads" on public.newsroom_articles;
create policy "Newsroom staff reads" on public.newsroom_articles for select to authenticated using (
  (status = 'published' and published_at <= now())
  or (select public.newsroom_current_role()) = 'editor'
  or ((select public.newsroom_current_role()) = 'writer' and owner_id = (select auth.uid()))
);
commit;
