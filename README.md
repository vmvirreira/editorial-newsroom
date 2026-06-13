# The Civic Ledger

An editorial news site built with Next.js, Supabase, Google OAuth, and Vercel.

## Features

- NYT-inspired publication layout with top categories, lead story, latest desk, category pages, and article pages.
- Supabase-backed `categories`, `articles`, and `admin_profiles` tables.
- Public read-only browsing for guests.
- Google OAuth staff login through Supabase Auth.
- Admin-only article creation and deletion through RLS-protected tables.
- Demo content fallback when Supabase env vars are not configured.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Enable Google in Supabase Auth providers.
4. Add these callback URLs in Supabase Auth settings:
   - `http://localhost:3000/auth/callback`
   - `https://your-vercel-domain.vercel.app/auth/callback`
5. Add env vars locally and in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`
6. Sign in once at `/admin`, copy the displayed user id, and insert it as an admin:

```sql
insert into public.admin_profiles (user_id)
values ('your-auth-user-id');
```

## Deploy

The app is Vercel-ready:

```bash
npm run build
npx vercel --prod
```

Set the same Supabase env vars in Vercel before using the admin newsroom.
