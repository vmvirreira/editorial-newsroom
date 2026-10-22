# Beyond the Brief

The homepage shows eight complete daily features: quote, joke, poem, cartoon, art, place, fact, and quick explainer. It streams separately from the news so upstream feed latency does not hold up the headlines. All selected text is visible; only the editor's alternative choices are collapsed.

Automatic selection uses the UTC edition date and a stable, sorted candidate list. Each upstream response is cached for 24 hours. Date-dependent feeds have a dated request key so each new edition gets fresh candidates. A source failure falls back to an attributed item on the shelf. No AI service or paid API key is required.

Sources:

- Quotes, jokes and poems reuse the textr-backed etherLAND SCREENS endpoint. Three cached requests offer a small choice of readings. Long pieces are excluded, and automatic poems are restricted to established public-domain authors.
- Cartoons use four recent xkcd comics. Attribution and the CC BY-NC 2.5 license remain visible. This license permits noncommercial reuse; commercial reuse requires separate permission or a replacement provider.
- Artwork uses the Cleveland Museum of Art Open Access API and accepts only CC0 images. The Metropolitan Museum of Art supplies the attributed CC0 fallback.
- Places and explainers use current Wikipedia summaries from a rotating list of educational topics and destinations. Places include an OpenStreetMap link. Wikipedia excerpts retain contributor credit and their CC BY-SA license.
- Facts use Wikipedia's date-specific On This Day feed, favoring discovery, education, science, invention and cultural milestones. NASA supplies a science fallback.

Editors can visit `/admin/daily` or choose **Daily edition** in the newsroom. Each feature defaults to Automatic. An editor can choose a server-validated candidate for today or restore Automatic; a replacement expires at the next UTC edition. Saved picks are shared across readers. No approval or maintenance task is required to keep the section running.

`newsroom_daily_picks` stores only the edition date, kind, item and update time. Row-level security permits public reads of today's picks and editor-only writes. Anonymous writes and staff truncation are revoked. The table does not change any other project's content or auth settings.
