# Changelog

Human-readable mirror of [`CHANGELOG.json`](CHANGELOG.json), which the app fetches at
runtime (from GitHub) to populate its in-app "what's new" changelog. Keep both files
in sync when releasing a new version — update this file, `CHANGELOG.json`, and the
`CHANGELOG_FALLBACK` constant + `APP_VERSION` in `app.js`, then tag the
commit (`git tag vX.Y.Z`).

## 1.4.0 — 2026-08-17

- Grid cards: the title + priority dot now sit under the poster with no card of
  their own, instead of an overlay caption — long-press a card to toggle watched
  without opening it, and the hover lift animation is gone.
- Fixed long-press-to-toggle-watched not working on iPhone — it was losing the
  gesture to Safari's own long-press-on-image share menu.
- List view: swipe direction flipped to match the grid's gesture language (swipe left
  to mark watched, right to hide), badges now match the grid's styling, and watched
  rows no longer dim.
- Stats: added an Items/Hours toggle, and hidden titles now show as an explicit
  locked slice on the rings instead of silently vanishing from the %.
- Avengers: Doomsday no longer counts toward the watched % or the 100% milestone —
  it's the destination, not a checklist item.
- Fixed a bug where dragging from the bottom of an open dialog scrolled the page
  behind it instead of closing it.
- The detail view's timeline now shows every title matching your current filters,
  not just a handful around the current one.
- Priority badges are now flat (tinted background, no border) instead of outlined;
  removed the app title's glow and red border.
- Redesigned the once-an-hour loading flash around the Doctor Doom mask instead of
  a plain clock icon.
- Two new easter eggs: tap the Infinity War poster to loot each Infinity Stone, or
  hold the Endgame poster for "I am Iron Man" — a repulsor glow and Tony's own
  snap, with a small hint marker so it's discoverable.
- Split the single-file app into index.html/styles.css/movies-data.js/app.js for
  easier maintenance — same static deploy, no build step.

## 1.3.0 — 2026-08-15

- Fixed the iOS 26 "Liquid Glass" status bar still overlaying the Home Screen app
  header — the earlier fix wasn't enough on the newest iOS.
- Detail view: added a trailer button, Rotten Tomatoes-style critic/audience score
  icons, a synopsis for every title, and a prev/next watch-order timeline of
  clickable posters.
- List view: poster art now fades into a color pulled from the poster itself
  instead of a flat background.
- Fixed the watched/hide buttons overlapping with no gap on mobile list rows.
- Removed the redundant hover info panel on grid tiles — the detail view already
  covers it.
- Added VisionQuest, Marvel Zombies season 2, and Your Friendly Neighborhood
  Spider-Man season 2; refreshed The Punisher: One Last Kill now that it's
  released.
- Replaced most poster art with higher-resolution official art, including proper
  portrait covers for TV/mini-series/specials that were using landscape stills.

## 1.2.0 — 2026-08-15

- Tap a poster or list row to open a fullscreen detail view — big art, Doomsday
  meter, RT scores, and full notes.
- Added a fullscreen "Time Watched" view (tap the watched count) — watched vs.
  remaining, broken down by priority and by type.
- You can now hide titles you don't want to see, with a new Hidden filter to
  review or restore them.
- Replaced the Table view with a mobile-friendly List view — swipe right to mark
  watched, swipe left to hide.
- Reworked the visual theme to actually look like Marvel: black/red header, bold
  title treatment, red used consistently for primary actions.
- Fixed the iOS Home Screen app header being hidden under the status bar overlay
  on the newest iOS.

## 1.1.0 — 2026-08-12

- Filters (type, priority, watched status, sort, search) now persist between visits.
- Type filter simplified to Movies / TV Series / Specials, and now supports picking
  several at once.
- On mobile, the filters panel now floats over the poster grid instead of pushing it
  down.
- Unified sizing and behavior across all filter controls.
- Reclaimed wasted space in the search bar and toolbar.
- Fixed an iOS Safari bug where the top bar could be hidden until you scrolled.
- Added this changelog — you'll see what's new here whenever a new version ships.

## 1.0.0 — 2026-08-07

- Initial release: poster grid and table view, search, filters, sort, and per-device
  watched-progress tracking.
