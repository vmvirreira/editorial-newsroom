begin;
alter table public.newsroom_articles add column source_name text;
alter table public.newsroom_articles add column source_url text;
alter table public.newsroom_articles add column source_published_at timestamptz;
alter table public.newsroom_articles add constraint newsroom_source_url_check check (source_url is null or source_url ~ '^https://[^[:space:]]+$');
create table public.newsroom_suggestions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.newsroom_categories(id) on delete restrict,
  source_id text not null check (length(source_id) between 1 and 100),
  source_name text not null check (length(source_name) between 1 and 200),
  source_url text not null unique check (length(source_url) <= 2048 and source_url ~ '^https://[^[:space:]]+$'),
  headline text not null check (length(headline) between 3 and 300),
  source_published_at timestamptz not null,
  discovered_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'dismissed', 'drafted')),
  article_id uuid unique references public.newsroom_articles(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz
);
create index newsroom_suggestions_category_idx on public.newsroom_suggestions(category_id);
create index newsroom_suggestions_inbox_idx on public.newsroom_suggestions(status, source_published_at desc);
create index newsroom_suggestions_reviewed_by_idx on public.newsroom_suggestions(reviewed_by);
alter table public.newsroom_suggestions enable row level security;
revoke all on public.newsroom_suggestions from anon, authenticated;
grant select, insert, update, delete on public.newsroom_suggestions to authenticated;
create policy "Editors manage curation inbox" on public.newsroom_suggestions for all to authenticated
using ((select public.newsroom_current_role()) = 'editor') with check ((select public.newsroom_current_role()) = 'editor');

create function public.newsroom_create_curated_draft(suggestion_id uuid) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare story public.newsroom_suggestions%rowtype; created_id uuid; story_slug text;
begin
  if public.newsroom_current_role() is distinct from 'editor' then raise exception 'Editor access required' using errcode = '42501'; end if;
  select * into story from public.newsroom_suggestions where id = suggestion_id for update;
  if not found then raise exception 'Suggestion unavailable'; end if;
  if story.article_id is not null then return story.article_id; end if;
  if story.status <> 'new' then raise exception 'Restore this suggestion before preparing a draft'; end if;
  story_slug := coalesce(nullif(trim(both '-' from left(regexp_replace(lower(story.headline), '[^a-z0-9]+', '-', 'g'), 150)), ''), 'curated-story') || '-' || story.id::text;
  insert into public.newsroom_articles(category_id,title,slug,dek,body,author,image_url,image_alt,status,owner_id,content_blocks,source_name,source_url,source_published_at)
  values (story.category_id,story.headline,story_slug,
    'A report from ' || story.source_name || ', selected by The Civic Ledger. Follow the source link to read the original report.',
    'This is a curated link to reporting published by ' || story.source_name || '.',
    'The Civic Ledger curation desk','','','draft',auth.uid(),
    jsonb_build_array(jsonb_build_object('type','link','url',story.source_url,'caption','Read the original report at ' || story.source_name)),
    story.source_name,story.source_url,story.source_published_at)
  returning id into created_id;
  update public.newsroom_suggestions set status='drafted',article_id=created_id,reviewed_by=auth.uid(),reviewed_at=now() where id=story.id;
  return created_id;
end;
$$;
revoke all on function public.newsroom_create_curated_draft(uuid) from public, anon;
grant execute on function public.newsroom_create_curated_draft(uuid) to authenticated;
commit;
