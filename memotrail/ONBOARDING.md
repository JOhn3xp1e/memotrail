# MemoTrail first-time introduction

Implemented a real five-screen, full-screen introduction for the existing React/TypeScript/Vite PWA. The Home Dashboard and existing feature routes remain in place. No account, cloud storage, notification service, AI or mascot was added.

## First-launch detection and persistence

`FirstLaunchGate` waits for preferences hydration and a local IndexedDB check before choosing between the introduction and the journal. A neutral, branded startup view covers initialization; the introduction does not appear briefly over an existing user's dashboard.

The existing Dexie `settings` table stores one row:

```json
{
  "key": "onboarding",
  "value": "{\"completed\":false,\"step\":2}"
}
```

There is no new database table, schema version, or app-version-specific flag. `step` is zero-based, from 0 through 4. Ordinary preference changes, app updates, and backup replacement leave this device-local row intact. It is intentionally independent of the portable journal/preferences backup.

- If completion is already true, the app opens its existing routes normally.
- If memories, collections, or time capsules are already saved, the user is treated as onboarded and a completion preference is recorded. Journal records are only counted, never edited. If storage is too full to save that housekeeping flag, saved-data detection still admits the existing user and runs again next launch.
- A fresh journal starts at screen 1. Next, Back and progress navigation persist the current step before changing screens. Refreshing an unfinished first introduction resumes that step.
- Completing or skipping writes `completed: true`, then returns to the existing Home route. The user sees an inline retry message if that write fails; failure is not treated as successful completion.
- A stale progress write from another tab cannot replace an already completed flag with an incomplete flag.
- If initialization cannot read the local database, the app shows a retry view instead of assuming the journal is empty or clearing anything.

## Screens and navigation

1. **Every life has a story.** Overlapping Polaroids and the Begin Your Story button.
2. **Keep the little moments.** A photo/story/mood scrapbook composition.
3. **Relive what matters.** Timeline, Memory Jar, On This Day and Memory Rewind.
4. **Some stories are for tomorrow.** A paper letter, envelope and wax seal, reusing the existing capsule illustration.
5. **Your memories stay yours.** On-device privacy, backup explanation and the visible browser-data/uninstall warning, followed by Start Collecting Memories.

The design uses scoped charcoal surfaces, cream serif headings, muted lavender, paper texture, handwritten captions and bundled sample photography. Illustrative photos never become memory records. The illustration code uses CSS and the existing local photo assets, not external APIs or generated remote assets.

Next, Back, Skip and accessible progress buttons work with mouse, touch and keyboard. Arrow keys move chapters; Enter/Space activate normal buttons. Horizontal touch swipes move chapters while vertical gestures remain available for scrolling. Headings receive focus when screens change. Motion transitions and progress animations respect the OS and MemoTrail reduced-motion preferences, including changes while the introduction is open.

The navigation stays visible on short screens; the chapter area scrolls when necessary. Safe-area padding protects the header/footer, and custom controls have touch targets at least 44px. The introduction uses its requested dark visual treatment in both app themes, without changing the user's saved theme. Normal app colors and browser theme metadata are restored on exit.

## Settings replay

Settings includes **View Introduction Again**, linking to `/introduction` with the previous local page as the return destination.

Replay starts at screen 1. Next, Back and progress controls do not rewrite the saved introduction state or other preferences. Completing, clicking Exit introduction, or pressing Escape returns to Settings (or the supplied safe local return page), with Home as the fallback. Refreshing replay retains the replay/return context in browser history and starts again at screen 1. Absolute, external and self-referencing return destinations are rejected.

## Offline, routing and deployment

Onboarding is lazy-loaded, while the PWA production precache includes its JavaScript/CSS, existing illustrations/photos, brand icon and local fonts. Essential text also has local system-font fallbacks. Cached first-time progress and replay both work offline. Temporary Blob URLs and private media caches are not introduced.

`vercel.json` adds the SPA fallback recommended by [Vercel's Vite documentation](https://vercel.com/docs/frameworks/frontend/vite), supporting refresh/direct visits to `/introduction` and the existing client-side routes. The file is placed with the app's `package.json`; Vercel's project root should be this app directory. This task prepares local source/configuration and the production build; no live Vercel deployment was performed or verified here.

## Regression found during verification

The existing cross-tab Home photo test exposed a composer race: Save could run while `preparePhoto` was still decoding a selected image. That could save a memory without its newly selected photo. `add-memory.tsx` now guards submission, preview, reset and new file selection during preparation, shows a preparation state, and appends prepared files to the current draft. A deterministic test pauses image decoding, attempts an early submission, releases decoding, saves, and verifies the photo appears. The Home Dashboard's implementation/design is unchanged.

## Files changed

- `src/services/onboarding.ts`: read-only journal detection, existing-user handling, progress/completion persistence and stale-tab completion protection.
- `src/stores/onboarding.ts`: shared startup state and awaited navigation persistence.
- `src/components/first-launch-gate.tsx`: initialization/loading/error views and route gating.
- `src/pages/introduction.tsx`: five screens, local illustrations, Motion, gestures, keyboard/focus, skip/finish and safe replay return.
- `src/styles/onboarding.css`: responsive editorial scrapbook design and scoped dark palette.
- `src/App.tsx`: standalone lazy introduction route and startup gate surrounding the existing routes.
- `src/pages/settings.tsx`: small replay option; existing settings remain intact.
- `src/index.css`: onboarding stylesheet import.
- `src/pages/add-memory.tsx`: photo-preparation save guard found by the regression run.
- `vercel.json`: Vercel SPA deep-link fallback.
- `tests/onboarding.spec.ts`: dedicated fresh/existing/replay/offline/responsive/accessibility/failure/motion tests using a fresh browser fixture.
- `tests/fixtures.ts`: existing journal tests skip the introduction through its real UI before exercising their original page. JSON/migration setup requests are left untouched; there is no production bypass switch.
- Existing app, backup, capsule, collection-cover, hero, jar, mascot-removal, memory-detail, Phase 8, rewind and timeline specs now use that fixture. `hero.spec.ts` adds the delayed-decoding regression test.

The Dexie schema, memory/capsule repositories, preference schema, backup format, Home page, branding assets and persistent journal records are unchanged.

## Verification

- `npm run build`: passed, including TypeScript and Vite/PWA generation. The introduction chunk is about 8.6 kB (3.4 kB gzip); no new large bitmap assets were added. Workbox generated a 66-entry precache.
- `npm run test:backup`: 12 passed, covering full record/media round trips, missing/corrupt archives, merge conflicts, optional capsule fields, quota and interrupted transaction rollback.
- `npm run lint`: no errors or new warnings; six existing warnings remain.
- `git diff --check`: passed.

Dedicated browser coverage includes a fresh empty journal, existing memories/collections/capsules with unchanged record comparisons, skip and finish persistence, refresh resume, Settings replay with unchanged preferences, safe replay return paths, cached offline first introduction/replay, real Chromium touch dispatch, standalone-mode emulation, and reduced-motion changes while open. Accessibility and viewport tests cover 360, 375, 390, 412 and 430px at 640px and 850px heights, plus 768px tablet and 1440px desktop, and both saved app themes. Completion write failure is injected and retry verified. The complete existing feature suite also runs.

Final full production browser run: **53 passed in 6.3 minutes**, including all 12 onboarding cases, the deterministic delayed-photo test, and the complete existing feature suite. The earlier full run exposed the photo-preparation race; it was corrected and the final full run passed.

Preview artifacts: `artifacts/introduction-mobile.png` and `artifacts/introduction-desktop.png`.

Physical Android installed-PWA behavior is not verified by emulation. No physical Android device or deployment-control endpoint is available here. Before release, check a real installed PWA's gesture/scroll interaction, safe areas, screen reader, offline cold launch and launcher entry, and verify the deployed Vercel direct-route refresh. Do not clear an existing journal to simulate a fresh install; use an isolated browser profile/device test installation.
