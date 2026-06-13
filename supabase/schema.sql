create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  deck text not null default '',
  sort_order integer not null default 100
);

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
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

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists articles_touch_updated_at on public.articles;
create trigger articles_touch_updated_at
before update on public.articles
for each row execute function public.touch_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
  );
$$;

alter table public.categories enable row level security;
alter table public.articles enable row level security;
alter table public.admin_profiles enable row level security;

drop policy if exists "Anyone can read categories" on public.categories;
create policy "Anyone can read categories"
on public.categories for select
using (true);

drop policy if exists "Admins can manage categories" on public.categories;
create policy "Admins can manage categories"
on public.categories for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Anyone can read published articles" on public.articles;
create policy "Anyone can read published articles"
on public.articles for select
using (status = 'published' or public.is_admin());

drop policy if exists "Admins can manage articles" on public.articles;
create policy "Admins can manage articles"
on public.articles for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can read admin profiles" on public.admin_profiles;
create policy "Admins can read admin profiles"
on public.admin_profiles for select
using (public.is_admin() or user_id = auth.uid());

insert into public.categories (name, slug, deck, sort_order)
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
