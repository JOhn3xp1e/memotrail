# MemoTrail Help Center

Route: `/help`. Contextual links use `/help?guide=backup` (or another guide ID).
The requested tutorial expands, receives focus, and scrolls into view. Device
selection uses `mode=mobile` or `mode=desktop`; searching uses `q`. These are URL
state, so browser Back works and no journal data is changed.

## Access and interface

- Settings → How to Use MemoTrail → Open Help & Guides.
- Desktop sidebar → Help & Guides, or the small help icon in the top bar.
- The last introduction screen offers Open How to Use MemoTrail; completion is
  saved before leaving onboarding.
- Contextual links in Add Memory, Collections, Time Capsule, and Storage & Backup.
- The five mobile bottom navigation items are unchanged.

The page includes mobile/web tabs, local search, expandable tutorials, a visual
quick start, real annotated screenshots with enlargement/zoom, related guides,
16 FAQs, six troubleshooting topics, and local-storage/privacy guidance. It
uses the existing theme, serif typography, lavender accents, and local scrapbook
photography. No external documentation service or new runtime dependency.

Mobile instructions describe the bottom navigation and sheet-style collection
picker. Desktop instructions describe the sidebar, top search, editor preview,
and popover. The device modes use separate real screenshots, with 24 relevant
guides each and 26 unique guides overall. Memory Vault is documented through
Timeline; there is no invented Vault route. Rewind export is individual PNG
slides; there is no video-export promise. Capsules use the device clock and are
not encrypted. There is no trash/recovery service or automatic cloud sync.

## Complete tutorial library

1. Getting Started with MemoTrail — `getting-started`
2. Understanding the Home Dashboard — `home`
3. Understanding Mobile Navigation — `mobile-navigation`
4. Understanding Desktop Navigation — `desktop-navigation`
5. How to Add a Memory — `add-memory`
6. How to Upload Multiple Photos — `photos`
7. How to View Memory Details — `details`
8. How to Edit a Memory — `edit`
9. How to Delete a Memory — `delete`
10. How to Favorite a Memory — `favorite`
11. How to Create a Collection — `collections`
12. How to Add Memories to Collections — `collection-memory`
13. How to Browse the Timeline — `timeline`
14. How to Use On This Day — `on-this-day`
15. How to Use Memory Jar — `jar`
16. How to Create a Time Capsule — `capsule-create`
17. How to Open an Unlocked Time Capsule — `capsule-open`
18. How to Use Memory Rewind — `rewind`
19. How to Export Rewind Slides — `rewind-export`
20. How to Export a ZIP Backup — `backup`
21. How to Restore a ZIP Backup — `restore`
22. How to Install MemoTrail on Android — `install-android`
23. How to Install MemoTrail on Desktop — `install-desktop`
24. How to Use MemoTrail Offline — `offline`
25. Understanding Local Storage and Privacy — `privacy`
26. Settings and Personalization — `settings`

Each guide has an introduction, difficulty, numbered steps, a screenshot with
numbered control markers and its legend, device-specific advice, tips, common
mistakes, related guides, and a real feature link.

## Real screenshot generation

Run `npm run docs:screenshots` from the app directory. In Windows PowerShell
where execution policy blocks the npm shim, use `npm.cmd run docs:screenshots`.
Chrome must be installed for Playwright's `channel: chrome`.

The command starts an owned local Vite server on `127.0.0.1:4175` if none is
already running. `DOCS_BASE_URL` can select another loopback HTTP server; public
and production URLs are rejected. It launches fresh, nonpersistent Playwright
contexts for 390×844, 360×800, and 1440×900. Contexts are closed after capture and
the owned server is stopped; no real Chrome profile is opened or cleared.

Fixtures use the documented Dexie v4 schema/native IDB version 40, three
synthetic memories including “Weekend by the Sea”, “Favorite Adventures”, local
bundled demo photos, and two sample capsules. The synthetic clock is fixed at
October 14, 2026 so anniversary screenshots are reproducible. No fake journal
records are added by the production help center.

Actual successful output: **66 screenshots**, covering 22 states at three
viewports. Each has raw and annotated WebP versions: **132 image files**.
The 66 annotated files total **1,666,436 bytes (1.59 MiB)**. The original capture
report is in `public/help/capture-report.json`.

States include Home, navigation, filled Add Memory, uploaded photos, opened
collection picker, details, fullscreen gallery, delete confirmation,
Collections, new collection dialog, Timeline, On This Day, Memory Jar reveal,
capsules, capsule creation, opened capsule, Rewind periods/player, Settings,
backup controls, validated restore preview, and onboarding.

Annotations are drawn in a temporary DOM overlay from Playwright locator
bounding boxes. No controls are fabricated. Offscreen targets are omitted,
and a capture with no visible targets fails. The overlay is removed after
capture. Sharp encodes WebP at quality 72; screenshots stay at their real
capture dimensions. Every asset has a typed mapping with dimensions, byte size,
marker labels, and coordinates in `src/data/help-captures.ts`.

To update documentation after UI changes, rerun the command and review both
raw and annotated images, then run `npm run build`. A failed capture exits
nonzero and does not publish an incomplete mapping. The build's `prebuild`
check verifies all 132 files, WebP dimensions, mapping coverage, successful
capture report, and a 4 MiB annotated-image budget. Missing screenshots cannot
silently enter a successful production build. The image component also offers
an accessible retry action if an image fails to load.

## Guided tour

The optional six-step Home tour highlights real welcome/recent-memory elements
and Add, Collections, Timeline, and Settings controls. It chooses the visible
desktop or mobile navigation target, scrolls it into view, and positions a
focus-trapped tooltip with Next, Back, Skip, Finish, arrow-key, and Escape
support. Resize/scroll measurements keep the outline aligned. Missing targets
are skipped; close/unmount removes overlays and listeners. It never clicks
destructive actions or creates a memory. It does not start automatically.

Launch is disabled when the memory editor has an unfinished draft or a backup
operation is active. Users are offered a link back to their draft. Navigation
does not reset the existing ephemeral memory draft; reloading still loses an
unsaved draft, as the existing editor explains.

## Offline and deployment

Tutorial text and icons are bundled. The service worker precaches only
`help/annotated/**/*.webp` alongside app assets; raw documentation captures and
the capture report are not precached. Help works offline once these files have
finished caching. Total production precache is approximately 4.50 MiB including
the rest of the app. Help has no runtime network service and does not write to
IndexedDB. Existing Vercel SPA rewrites and app identity remain unchanged.

Deploy the rebuilt app to publish these changes. An already installed PWA may
offer the normal safe Update and reload flow. Do not clear site data to update
screenshots; that would erase the local journal.

## Files

Created: `src/pages/help.tsx`, `src/data/help.ts`, `src/data/help-captures.ts`,
`src/components/help-screenshot.tsx`, `src/components/contextual-help.tsx`,
`src/components/guided-tour.tsx`, `src/styles/help.css`,
`scripts/docs-screenshots.mjs`, `scripts/help-fixture.mjs`,
`scripts/verify-help-assets.ts`, `tests/help.spec.ts`, `public/help/**`, this file.

Updated: `src/App.tsx`, `src/components/layout/app-shell.tsx`,
`src/components/storage-backup.tsx`, `src/pages/home.tsx`,
`src/pages/add-memory.tsx`, `src/pages/collections.tsx`, `src/pages/capsules.tsx`,
`src/pages/settings.tsx`, `src/pages/introduction.tsx`, `src/index.css`,
`vite.config.ts`, `package.json`.

## Validation and limits

The screenshot command completed with 66 captures and zero failures. Build
verification checks every raw/annotated file. Help browser tests cover every
published guide's decoded screenshot, search, device switching, expansion,
zoom/focus return, retry, related links, real tours and missing targets,
contextual navigation, draft protection, onboarding entry, standalone Android
emulation, both themes at 360/375/390/412/430/768/1440 widths, landscape, Axe
accessibility, and offline use with byte-for-byte journal preservation.

The final build and regression results are reported with delivery. Browser
emulation does not establish behavior on a physical Android device. No live
Vercel deployment or actual OS installation was performed. These remain manual
deployment/device checks; no account, cloud sync, Mimo, or AI was introduced.
