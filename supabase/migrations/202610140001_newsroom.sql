begin;
create table if not exists public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('writer', 'editor')),
  created_at timestamptz not null default now()
);
insert into public.staff_profiles(user_id, role)
select user_id, 'editor' from public.admin_profiles on conflict (user_id) do nothing;
alter table public.staff_profiles enable row level security;
create or replace function public.newsroom_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.staff_profiles where user_id = auth.uid();
$$;
revoke all on function public.newsroom_role() from public;
grant execute on function public.newsroom_role() to anon, authenticated;
create policy "Staff can read own role" on public.staff_profiles for select to authenticated using (user_id = auth.uid());
-- Roles are provisioned by the project owner via SQL, never by a self-service signup.
grant select on public.staff_profiles to authenticated;
revoke insert, update, delete on public.staff_profiles from anon, authenticated;
alter table public.articles add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.articles add column if not exists position integer not null default 100000;
alter table public.articles add column if not exists content_blocks jsonb not null default '[]'::jsonb;
alter table public.articles drop constraint if exists articles_status_check;
alter table public.articles add constraint articles_status_check check (status in ('draft', 'review', 'published'));
create or replace function public.valid_article_blocks(blocks jsonb) returns boolean
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
alter table public.articles add constraint articles_content_blocks_check check (public.valid_article_blocks(content_blocks));
drop policy if exists "Anyone can read published articles" on public.articles;
drop policy if exists "Admins can manage articles" on public.articles;
create policy "Newsroom article reads" on public.articles for select using (
  (status = 'published' and published_at <= now()) or public.newsroom_role() = 'editor'
  or (public.newsroom_role() = 'writer' and owner_id = auth.uid())
);
create policy "Newsroom article inserts" on public.articles for insert to authenticated with check (
  public.newsroom_role() = 'editor' or (public.newsroom_role() = 'writer' and owner_id = auth.uid() and status in ('draft', 'review') and not is_featured)
);
create policy "Newsroom article updates" on public.articles for update to authenticated using (
  public.newsroom_role() = 'editor' or (public.newsroom_role() = 'writer' and owner_id = auth.uid() and status in ('draft', 'review'))
) with check (
  public.newsroom_role() = 'editor' or (public.newsroom_role() = 'writer' and owner_id = auth.uid() and status in ('draft', 'review') and not is_featured)
);
create policy "Newsroom article deletes" on public.articles for delete to authenticated using (public.newsroom_role() = 'editor');
create or replace function public.guard_article_ownership() returns trigger
language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' and auth.uid() is not null and new.owner_id is distinct from old.owner_id then
    raise exception 'Article ownership cannot be changed through the newsroom';
  end if;
  return new;
end;
$$;
create trigger articles_guard_ownership before update on public.articles for each row execute function public.guard_article_ownership();
-- Atomic editor-only ordering and workflow transition. All clients share one lock.
create or replace function public.move_newsroom_article(article_id uuid, target_status text, before_id uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare ordered_ids uuid[]; item uuid; n integer := 0;
begin
  if public.newsroom_role() is distinct from 'editor' then raise exception 'Editor access required'; end if;
  if target_status not in ('draft', 'review', 'published') then raise exception 'Invalid status'; end if;
  perform pg_advisory_xact_lock(614102026);
  if not exists (select 1 from public.articles where id = article_id) then raise exception 'Article not found'; end if;
  if before_id = article_id then return; end if;
  if before_id is not null and not exists (select 1 from public.articles where id = before_id and status = target_status) then raise exception 'Destination has changed; refresh the board'; end if;
  select array_agg(id order by position, published_at desc, id) into ordered_ids from public.articles where status = target_status and id <> article_id;
  update public.articles set status = target_status where id = article_id;
  foreach item in array coalesce(ordered_ids, array[]::uuid[]) loop
    if item = before_id then
      update public.articles set position = n where id = article_id; n := n + 1;
    end if;
    update public.articles set position = n where id = item; n := n + 1;
  end loop;
  if before_id is null then update public.articles set position = n where id = article_id; end if;
end;
$$;
revoke all on function public.move_newsroom_article(uuid, text, uuid) from public;
grant execute on function public.move_newsroom_article(uuid, text, uuid) to authenticated;
create index if not exists articles_newsroom_order on public.articles(status, position, published_at desc);
create index if not exists articles_owner on public.articles(owner_id);
commit;
