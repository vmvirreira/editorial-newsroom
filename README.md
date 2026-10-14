# The Civic Ledger

An editorial news site built with Next.js 16, Supabase Auth/Postgres, and Vercel.

Guests read live published stories. Writers create and edit their own unpublished stories, then submit them for review. Editors edit any story, publish, delete, and arrange stories on the newsroom board. Staff roles are granted by the Supabase project owner; signing in alone grants no publishing rights.

Articles combine main text and ordered text, audio, video, and link blocks. Audio/video players accept direct hosted media URLs; video also supports standard YouTube watch and youtu.be links. Media files must already be hosted at accessible URLs. Image and main text are optional when other content is supplied. Add transcripts or captioned video alongside media for accessibility.

Editors drag cards between Drafts, For review, and Published. Dropping above another card sets its order. Up/Down buttons and status menus provide keyboard and touch alternatives. Changes persist through an atomic database function. Published ordering controls the homepage and category lists; the first featured story takes the lead. Future publish dates are hidden from guests until their scheduled time. Dates in the newsroom form are UTC.

## Supabase setup

For a **fresh** database, run `supabase/schema.sql`, then `supabase/migrations/202610140001_newsroom.sql` in the SQL editor, in that order. For a database already using the original site schema, run **only the migration**, once. It preserves articles and maps existing `admin_profiles` members to editors. Existing articles without an owner remain editor-managed.

Enable Google under Authentication → Sign In / Providers. In the Google OAuth client, use the Supabase callback URL shown by Supabase (`https://PROJECT_REF.supabase.co/auth/v1/callback`). In Supabase URL Configuration, set the Site URL to `https://editorial-newsroom.vercel.app` and allow `https://editorial-newsroom.vercel.app/auth/callback` plus any preview URL you intend to use. For local development, allow `http://localhost:3000/auth/callback`.

Sign in at `/admin` once. The awaiting-access screen shows the authenticated account ID. Grant staff access with the project owner's SQL editor:

```sql
insert into public.staff_profiles (user_id, role)
values ('AUTH_USER_ID', 'editor')
on conflict (user_id) do update set role = excluded.role;
```

Use `writer` for article contributors. The editor role includes writing functionality, so your own account needs only `editor`. Role changes take effect on the next request. Staff cannot update their own roles through the application. Writers cannot edit published stories or someone else's draft, publish, delete, or use the ordering function. Both server actions and database row-level policies enforce these rules.

## Environment and Vercel

Set these variables on the existing `vmv-projects/editorial-newsroom` project in Vercel:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | VMVirreira project's API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project's public anon key |
| `NEXT_PUBLIC_SITE_URL` | `https://editorial-newsroom.vercel.app` |

Use the public anon key; this app does not need a service-role key. Set the values for production, preview, and development as needed. Use a separate preview database if preview writes should be isolated. Redeploy after environment changes. The project uses Next.js auto-detection, root directory `.`, `npm ci`, and `npm run build`, with Node.js 24.

Connect `vmvirreira/editorial-newsroom` to the existing Vercel project with `main` as its production branch. To keep public news readable while retaining protected previews, select **Standard Protection** in Vercel's Deployment Protection settings. The existing project was configured to protect Vercel-hosted production domains as well.

With no Supabase variables the site displays demo articles and disables staff access. With a configured database, an empty publication stays empty; database errors are reported rather than replaced by demo news.

## Local setup and verification

```bash
npm ci
cp .env.example .env.local
# Fill .env.local with the same public project variables.
npm run dev
```

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Permission tests run the actual SQL schema and migration in a disposable PGlite PostgreSQL database, including writer restrictions, guest reads, scheduled publication, ownership protection, staff-role escalation, editor publication, atomic ordering, and invalid media. They use a minimal Supabase-compatible `auth.uid()` fixture and do not contact or modify the real project.
