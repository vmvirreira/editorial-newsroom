# Smart, Curated and Auto news

The masthead offers three views on the homepage and category pages:

- Smart is the default. It uses Curated when the newest actually published article is at most 24 hours old, otherwise Auto. Drafts and future publications are ignored. The decision uses the newest publication timestamp across the entire editorial order, never `updated_at` or position.
- Curated always preserves the editor's published articles and ordering, even when old.
- Auto offers up to two distinct reports per category. Relevance scores choose the reports, then the selected edition is ordered by source publication time, newest first. Its three newest selected reports lead the homepage, the remaining selections appear in Latest, and category sections show their two selected reports in the same order. Play all follows that order. Equal publication times use relevance score, then source URL, as stable tie breakers.

An explicit masthead selection sets a session cookie (`bb-news-view`), with no account required. The validated `view` URL parameter takes precedence, and category links retain it. Smart is evaluated on page navigation; it does not switch a reader's content while they are reading. A new publication makes Smart choose Curated again on the next navigation. Daily features and editor overrides appear in either homepage view.

## Selection

Only configured reporting and primary-source feeds participate. Reddit and Hacker News discussions remain in the editor inbox rather than automatically appearing as news. Feed parser HTTPS/host, payload-size and XML protections still apply.

Candidate pools prefer current material and accept reports from the past 72 hours when collected. Ranking combines age, category keyword relevance, a reporting-source preference, preview availability and coverage across distinct publishers. It groups similar headlines and identical source URLs to reduce syndicated/event duplicates, including across categories. Publisher-specific discovery feeds also require a topic-keyword match in the headline or preview. Each category gets a first selection before any category gets its second, preferably from a different publisher. This is a transparent heuristic, not an assertion that popularity establishes truth or that all duplicate events can be detected.

Auto cards show the publisher, actual source publication time, source feed preview, and a direct original-report link. They are clearly labeled automatically selected. They do not create newsroom articles, alter curated order, copy publisher photographs or generate unreviewed article text. Listen and Play all use the visible selected headlines/previews.

## Cache and failures

Each category's public candidate pool uses the existing Next Data Cache with a 30-minute revalidation period. It contains no cookies, staff information or database clients. Refresh is traffic-driven, and stale data can be served while revalidation runs. Underlying RSS responses use their existing 15-minute cache. A failed or empty revalidation throws, preserving the previous successful category pool. First-load failures affect only that category. The page shows fewer than two stories when there are not enough distinct suitable reports, with an availability message.

Retained pools keep original publication times and their selection-check timestamp; they are never relabeled as newly published. An old check displays a last-available-selection notice. Changing the configured sources or ranking policy should bump the `brief-beyond-auto-source-pools-v1` cache key if old pools should be discarded.

No database migration, AI API key, public write endpoint or change to writer/editor permissions is required.
