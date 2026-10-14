-- Newsroom-only setup for the shared vmvirreira Supabase project.
-- Idempotent; does not alter other apps, auth settings, or generic public tables.
begin;
create table if not exists public.newsroom_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  deck text not null default '',
  sort_order integer not null default 100
);

create table if not exists public.newsroom_articles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.newsroom_categories(id) on delete restrict,
  title text not null,
  slug text not null unique,
  dek text not null,
  body text not null,
  author text not null,
  image_url text not null,
  image_alt text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  is_featured boolean not null default false,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.newsroom_staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('writer', 'editor')),
  created_at timestamptz not null default now()
);
alter table public.newsroom_staff_profiles enable row level security;
alter table public.newsroom_articles enable row level security;
create or replace function public.newsroom_current_role() returns text
language sql stable security invoker set search_path = '' as $$
  select role from public.newsroom_staff_profiles where user_id = auth.uid();
$$;
revoke all on function public.newsroom_current_role() from public;
grant execute on function public.newsroom_current_role() to authenticated;
revoke all on public.newsroom_staff_profiles from anon;
drop policy if exists "Staff can read own role" on public.newsroom_staff_profiles;
create policy "Staff can read own role" on public.newsroom_staff_profiles for select to authenticated using (user_id = (select auth.uid()));
-- Roles are provisioned by the project owner via SQL, never by a self-service signup.
grant select on public.newsroom_staff_profiles to authenticated;
revoke insert, update, delete on public.newsroom_staff_profiles from anon, authenticated;
alter table public.newsroom_articles add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.newsroom_articles add column if not exists position integer not null default 100000;
alter table public.newsroom_articles add column if not exists content_blocks jsonb not null default '[]'::jsonb;
alter table public.newsroom_articles drop constraint if exists newsroom_articles_status_check;
alter table public.newsroom_articles add constraint newsroom_articles_status_check check (status in ('draft', 'review', 'published'));
create or replace function public.newsroom_valid_article_blocks(blocks jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare b jsonb;
begin
  if jsonb_typeof(blocks) <> 'array' or jsonb_array_length(blocks) > 100 then return false; end if;
  for b in select value from jsonb_array_elements(blocks) loop
    if jsonb_typeof(b) <> 'object' or coalesce(b->>'type', '') not in ('text', 'audio', 'video', 'link') then return false; end if;
    if b->>'type' = 'text' then
      if coalesce(length(b->>'text'), 0) = 0 or length(b->>'text') > 50000 then return false; end if;
    elsif coalesce(b->>'url', '') !~* '^https?://[^[:space:]]+$' then return false;
    end if;
  end loop;
  return true;
end;
$$;
alter table public.newsroom_articles drop constraint if exists newsroom_articles_content_blocks_check;
alter table public.newsroom_articles add constraint newsroom_articles_content_blocks_check check (public.newsroom_valid_article_blocks(content_blocks));
drop policy if exists "Anyone can read published articles" on public.newsroom_articles;
drop policy if exists "Admins can manage articles" on public.newsroom_articles;
drop policy if exists "Newsroom article reads" on public.newsroom_articles;
drop policy if exists "Newsroom public reads" on public.newsroom_articles;
create policy "Newsroom public reads" on public.newsroom_articles for select to anon, authenticated
using (status = 'published' and published_at <= now());
drop policy if exists "Newsroom staff reads" on public.newsroom_articles;
create policy "Newsroom staff reads" on public.newsroom_articles for select to authenticated using (
  (select public.newsroom_current_role()) = 'editor'
  or ((select public.newsroom_current_role()) = 'writer' and owner_id = (select auth.uid()))
);
drop policy if exists "Newsroom article inserts" on public.newsroom_articles;
create policy "Newsroom article inserts" on public.newsroom_articles for insert to authenticated with check (
  (select public.newsroom_current_role()) = 'editor' or ((select public.newsroom_current_role()) = 'writer' and owner_id = (select auth.uid()) and status in ('draft', 'review') and not is_featured)
);
drop policy if exists "Newsroom article updates" on public.newsroom_articles;
create policy "Newsroom article updates" on public.newsroom_articles for update to authenticated using (
  (select public.newsroom_current_role()) = 'editor' or ((select public.newsroom_current_role()) = 'writer' and owner_id = (select auth.uid()) and status in ('draft', 'review'))
) with check (
  (select public.newsroom_current_role()) = 'editor' or ((select public.newsroom_current_role()) = 'writer' and owner_id = (select auth.uid()) and status in ('draft', 'review') and not is_featured)
);
drop policy if exists "Newsroom article deletes" on public.newsroom_articles;
create policy "Newsroom article deletes" on public.newsroom_articles for delete to authenticated using ((select public.newsroom_current_role()) = 'editor');
create or replace function public.newsroom_guard_article_ownership() returns trigger
language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' and auth.uid() is not null and new.owner_id is distinct from old.owner_id then
    raise exception 'Article ownership cannot be changed through the newsroom';
  end if;
  return new;
end;
$$;
drop trigger if exists newsroom_articles_guard_ownership on public.newsroom_articles;
create trigger newsroom_articles_guard_ownership before update on public.newsroom_articles for each row execute function public.newsroom_guard_article_ownership();
create or replace function public.newsroom_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists newsroom_articles_touch_updated_at on public.newsroom_articles;
create trigger newsroom_articles_touch_updated_at before update on public.newsroom_articles
for each row execute function public.newsroom_touch_updated_at();
alter table public.newsroom_categories enable row level security;
drop policy if exists "Newsroom categories are public" on public.newsroom_categories;
create policy "Newsroom categories are public" on public.newsroom_categories for select using (true);
grant select on public.newsroom_categories to anon, authenticated;
grant select on public.newsroom_articles to anon;
grant select, insert, update, delete on public.newsroom_articles to authenticated;
revoke insert, update, delete on public.newsroom_categories from anon, authenticated;
-- Atomic editor-only ordering and workflow transition. All clients share one lock.
create or replace function public.move_newsroom_article(article_id uuid, target_status text, before_id uuid default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare ordered_ids uuid[]; item uuid; n integer := 0;
begin
  if public.newsroom_current_role() is distinct from 'editor' then raise exception 'Editor access required'; end if;
  if target_status not in ('draft', 'review', 'published') then raise exception 'Invalid status'; end if;
  perform pg_advisory_xact_lock(614102026);
  if not exists (select 1 from public.newsroom_articles where id = article_id) then raise exception 'Article not found'; end if;
  if before_id = article_id then return; end if;
  if before_id is not null and not exists (select 1 from public.newsroom_articles where id = before_id and status = target_status) then raise exception 'Destination has changed; refresh the board'; end if;
  select array_agg(id order by position, published_at desc, id) into ordered_ids from public.newsroom_articles where status = target_status and id <> article_id;
  update public.newsroom_articles set status = target_status where id = article_id;
  foreach item in array coalesce(ordered_ids, array[]::uuid[]) loop
    if item = before_id then
      update public.newsroom_articles set position = n where id = article_id; n := n + 1;
    end if;
    update public.newsroom_articles set position = n where id = item; n := n + 1;
  end loop;
  if before_id is null then update public.newsroom_articles set position = n where id = article_id; end if;
end;
$$;
revoke all on function public.move_newsroom_article(uuid, text, uuid) from public;
grant execute on function public.move_newsroom_article(uuid, text, uuid) to authenticated;
create index if not exists newsroom_articles_newsroom_order on public.newsroom_articles(status, position, published_at desc);
create index if not exists newsroom_articles_category on public.newsroom_articles(category_id);
create index if not exists newsroom_articles_owner on public.newsroom_articles(owner_id);
insert into public.newsroom_categories (name, slug, deck, sort_order)
values
  ('Politics', 'politics', 'Power, policy, elections, and the institutions shaping civic life.', 1),
  ('Business', 'business', 'Markets, companies, labor, and the money moving through daily life.', 2),
  ('World', 'world', 'Essential reporting from across continents and capitals.', 3),
  ('Culture', 'culture', 'Books, film, food, style, ideas, and the rituals of public taste.', 4),
  ('Science', 'science', 'Discovery, health, climate, and the machinery of the natural world.', 5),
  ('Technology', 'technology', 'Platforms, artificial intelligence, gadgets, security, and the web.', 6)
on conflict (slug) do update set
  name = excluded.name,
  deck = excluded.deck,
  sort_order = excluded.sort_order;

notify pgrst, 'reload schema';
commit;
