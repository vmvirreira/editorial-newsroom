# The Brief and Beyond

An editorial news site built with Next.js 16, the shared Supabase Auth/Postgres backend, and Vercel.

Guests read live published stories. Writers create and edit their own unpublished stories, then submit them for review. Editors edit any story, publish, delete, and arrange stories on the newsroom board. Staff roles are granted by the Supabase project owner; signing in alone grants no publishing rights.

Articles combine main text and ordered text, audio, video, and link blocks. Audio/video players accept direct hosted media URLs; video also supports standard YouTube watch and youtu.be links. Media files must already be hosted at accessible URLs. Image and main text are optional when other content is supplied. Add transcripts or captioned video alongside media for accessibility.

Editors drag cards between Drafts, For review, and Published. Dropping above another card sets its order. Up/Down buttons and status menus provide keyboard and touch alternatives. Changes persist through an atomic database function. Published ordering controls the homepage and category lists; the first featured story takes the lead. Future publish dates are hidden from guests until their scheduled time. Dates in the newsroom form are UTC.

## Shared Supabase setup

Use **vmvirreira’s Project**, reference `tfxgzairleefuhstleeo`, which already backs Dayboard and Gabriel. See [the verified shared-backend context](docs/shared-supabase.md).

The newsroom migrations have been applied to the shared project. For a new database, apply all migration files in chronological order. `supabase/schema.sql` is the idempotent baseline for the original newsroom; curation is added by the subsequent migration. All objects are newsroom-prefixed, and this setup does not change other apps' tables, policies, roles, Auth Site URL, or email templates. It does not import generic legacy tables automatically.

Email authentication is already enabled; Google is currently disabled. Add `https://editorial-newsroom.vercel.app/auth/callback` and any intended local/preview callback URLs to the existing Supabase Auth redirect allow-list. **Keep the shared project's current Auth Site URL.** The newsroom requests its own redirect URL per sign-in. Existing email templates may offer a magic link or a code; both paths are supported.

Sign in at `/admin` using the same email as your other apps. The awaiting-access screen shows your account ID. Grant an app-specific role through the Supabase SQL editor:

```sql
insert into public.newsroom_staff_profiles (user_id, role)
values ('AUTH_USER_ID', 'editor')
on conflict (user_id) do update set role = excluded.role;
```

Use `writer` for contributors. Editors can write as well, so your own account needs only `editor`. Dayboard/Gabriel owners and admins do not automatically receive newsroom permissions. Staff cannot update their own roles. Both server actions and row-level policies enforce these rules.

## Environment and Vercel

Set these variables on the existing `vmv-projects/editorial-newsroom` project in Vercel:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tfxgzairleefuhstleeo.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Shared project’s public publishable key; legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also accepted |
| `NEXT_PUBLIC_SITE_URL` | `https://editorial-newsroom.vercel.app` |

Use a public publishable or anon key; this app does not need a service-role key. Set the values for production, preview, and development as needed. Use a separate preview database if preview writes should be isolated. Redeploy after environment changes. The project uses Next.js auto-detection, root directory `.`, `npm ci`, and `npm run build`, with Node.js 24.

Connect `vmvirreira/editorial-newsroom` to the existing Vercel project with `main` as its production branch. **Standard Protection** is configured in Vercel so production can be public while preview deployments remain protected.

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

Permission tests run the actual SQL schema and migration in a disposable PGlite PostgreSQL database, including writer restrictions, guest reads, scheduled publication, ownership protection, staff-role escalation, editor publication, atomic ordering, invalid media, idempotent setup, and isolation from other apps’ roles, data, and functions. They use a minimal Supabase-compatible `auth.uid()` fixture and do not contact or modify the real project.

## Editor curation

Open `/admin/curation` or choose **Curate news** from the editor desk. Refresh sources checks the fixed, reviewed RSS registry in `src/lib/curation/sources.ts`; it needs no extra environment variables, API keys, AI service, or service-role credential. BBC News, NPR, and The Guardian cover all six sections; PBS News adds politics/world reporting, Al Jazeera adds international reporting, and NASA provides primary science releases. Feed results are cached for 15 minutes, limited to eight recent entries per feed and 96 entries per refresh, and restricted to the last 14 days. Entries are merged round-robin across feeds so a high-volume source does not crowd out the others. There is no scheduled polling.

Filter by category, read the source, dismiss or restore suggestions, and choose **Prepare draft** to create an attributed link story. Draft preparation is atomic and idempotent. Existing source URLs are deduplicated, and refresh never resurrects dismissed stories. Prepared drafts stay private until an editor publishes using the existing newsroom form or board. New content may include original commentary and the existing text/audio/video/link blocks. Full source articles and media are never imported; verify reuse permissions for any additional material. Source name, URL, and source publication time are retained independently of editable story text and shown on published pages.

The curation table and RPC use app-specific editor checks and RLS. Guests and writers cannot access the inbox. Source fetching uses a fixed URL allow-list, HTTPS article host checks, redirect rejection, timeouts, payload limits, and XML entity rejection. Failed feeds do not remove saved suggestions. Tests additionally cover malicious and stale feeds, URL validation, source attribution, draft idempotency, and curation access control.

## Listen to stories

Every public story card has a speaker icon, and each article has a **Listen to this story** button. Playback uses the browser Speech Synthesis API and its default voice for the page language. Readers can pause, resume, or stop; starting another story replaces the previous one, and navigating to another page stops narration. Long stories are split into short utterances. Unsupported browsers show a disabled control. Voice quality and availability depend on the browser/device and may use the platform’s speech service. No external source article is fetched or narrated, no audio file is stored, and no speech API key or paid generation service is required.

On iPhone (including Chrome), narration uses the system speech engine. Voices are warmed before the first tap and a matching installed voice is preferred. The entire queue is submitted within the tap, and the UI waits for a speech-start event before showing playback. A startup timeout offers retry guidance instead of displaying silent playback indefinitely. iPhone Silent Mode and media volume can affect audibility; actual device audio requires testing on an iPhone.

## Source previews and background explainers

Feed descriptions are stored as bounded, plain-text previews in the editor-only curation inbox. Refresh also fills or updates previews on existing suggestions while preserving dismissed/prepared states and article links. A preview seeds an editable short summary; editors review its facts, wording, and reuse permissions before preparing a private draft. This imports feed descriptions, not full linked articles, and does not claim to generate original reporting or AI-written summaries.

Wikipedia suggestions use headline names and keywords, resolve real English Wikipedia article URLs, reject disambiguation pages and unrelated titles, and offer up to four links for explicit selection. They are suggestions, not automatic semantic verification. If no clear page is found, try a more specific topic. The article editor supports the same picker plus manually editable explainer blocks for Wikipedia or other background sources. Selected blocks appear in a prominent “Explore the background” box below the byline. Existing published stories are never enriched automatically.

## The daily edition

Homepage and category story cards show selected background links. When editors have not selected topics yet, a clearly labeled Wikipedia background search is available for the headline; it does not imply an approved article match. The full article uses the same fallback.

The masthead clock updates every second and displays the reader's local date, time, and timezone after hydration. The reading break offers Quote/Joke/Poem tabs using the same attributed textr-backed feed as etherLAND SCREENS, refreshed hourly. Public-domain excerpts and an original newsroom joke keep the feature usable if the feed is unavailable.

US ZIP weather uses Zippopotam.us/GeoNames for location and National Weather Service forecasts for today and up to seven days. Forecasts are cached for 30 minutes, use Fahrenheit, and preserve missing highs/lows instead of inventing them. The visitor's chosen ZIP is remembered only in this browser's local storage; Forget ZIP removes it. Readers do not need accounts, and storage-disabled browsers retain the selection for the current session. Weather and reading requests run independently of the news page, with loading/error/fallback states and source attribution. No additional environment variables are required.
