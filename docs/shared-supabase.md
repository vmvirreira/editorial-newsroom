# Shared Supabase context

Verified on 2026-10-14 for the newsroom setup.

- The owner identifies the shared backend as **vmvirreira’s Project**.
- Project reference: `tfxgzairleefuhstleeo`.
- API URL: `https://tfxgzairleefuhstleeo.supabase.co`, recovered from Dayboard's deployed public browser configuration at https://dayboard.fun.
- The project's public Auth settings report email enabled and Google disabled.
- Dayboard's deployed client references `dayboard_profiles` and email/password/OTP methods.
- [Gabriel's README](https://github.com/vmvirreira/guardian-gabriel/blob/main/README.md) documents passwordless email login with app-specific circle permissions; its SQL uses `gabriel_*` tables and role-scoped policies.
- [Collagr/Pasteup's README](https://github.com/vmvirreira/pasteup/blob/main/README.md) documents passwordless email profiles, `pasteup_projects`, a private `pasteup-media` bucket, owner-only RLS, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Tiny Tap's Supabase client likewise uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Read-only API probes with zero result rows confirmed that `gabriel_circle_members` is exposed. Before installation, the API did not expose `newsroom_articles` or the original newsroom's generic `articles`, `categories`, and `admin_profiles` tables. This is an API/schema-cache observation, not a privileged database inventory.

The newsroom follows the same design: shared `auth.users` identities, separate app permissions, and prefixed data objects. It uses `newsroom_articles`, `newsroom_categories`, `newsroom_staff_profiles`, `newsroom_*` helper functions, and `move_newsroom_article`. Another app's owner/admin status grants no newsroom role.

Add newsroom callback URLs to the existing Supabase Auth redirect allow-list. Preserve the existing project-wide Site URL and email templates. The login supports the current email link and also email codes where the shared template already includes them. It does not require Google, a new Supabase project, or copying any service-role credential into the browser.

The public browser connection was recovered without printing or committing its key. Vercel denied environment-variable reads and writes with HTTP 403. The Supabase integration is now connected. The isolated newsroom schema and read-policy optimization are applied, and the common Dayboard/Gabriel owner account `victor.m.virreira@gmail.com` has the newsroom editor role. Transactional tests against the real database verified writer restrictions, editor publication/reordering, and guest visibility; all fixture articles were rolled back. Security advisors reported no newsroom security warnings.

The session can inspect connected GitHub code and deployment content; it does not expose a complete account-wide Codex conversation archive. These findings come from the cited repositories, public deployments, Auth settings, and API probes.
