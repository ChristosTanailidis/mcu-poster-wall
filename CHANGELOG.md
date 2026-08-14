# Changelog

Human-readable mirror of [`CHANGELOG.json`](CHANGELOG.json), which the app fetches at
runtime (from GitHub) to populate its in-app "what's new" changelog. Keep both files
in sync when releasing a new version — update this file, `CHANGELOG.json`, and the
`CHANGELOG_FALLBACK` constant + `APP_VERSION` in `index.html`, then tag the
commit (`git tag vX.Y.Z`).

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
