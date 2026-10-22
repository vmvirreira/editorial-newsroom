create table public.newsroom_daily_picks (
  edition_date date not null,
  kind text not null check (kind in ('quotes','jokes','poems','cartoon','art','place','fact','explainer')),
  item jsonb not null check (jsonb_typeof(item) = 'object' and item ? 'kind' and item->>'kind' = kind and octet_length(item::text) <= 20000),
  updated_at timestamptz not null default now(),
  primary key (edition_date, kind)
);
alter table public.newsroom_daily_picks enable row level security;
grant select on public.newsroom_daily_picks to anon, authenticated;
grant insert,update,delete on public.newsroom_daily_picks to authenticated;
create policy "Today's daily picks are public" on public.newsroom_daily_picks for select to anon,authenticated using (edition_date = (now() at time zone 'UTC')::date);
create policy "Editors can read daily picks" on public.newsroom_daily_picks for select to authenticated using ((select public.newsroom_current_role()) = 'editor');
create policy "Editors can insert daily picks" on public.newsroom_daily_picks for insert to authenticated with check ((select public.newsroom_current_role()) = 'editor' and edition_date = (now() at time zone 'UTC')::date);
create policy "Editors can update daily picks" on public.newsroom_daily_picks for update to authenticated using ((select public.newsroom_current_role()) = 'editor') with check ((select public.newsroom_current_role()) = 'editor' and edition_date = (now() at time zone 'UTC')::date);
create policy "Editors can reset daily picks" on public.newsroom_daily_picks for delete to authenticated using ((select public.newsroom_current_role()) = 'editor');
