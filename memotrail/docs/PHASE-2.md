# MemoTrail: Phase 2 handoff

## What exists

Five routed pages share one responsive shell, tokens, typography, and light/dark themes. The home collage, chronological photo grid/list, sample albums, photo/story preview composer, settings, empty states, and not-found screen are implemented. Components use local shadcn-style Radix primitives, Lucide icons, Tailwind v4, and Motion.

`src/lib/sample-data.ts` is an explicitly labeled presentation fixture. `useMemoryData` is the only page-level source switch. The sample mode preference is initially enabled to demonstrate the design; disabling it shows all first-use states.

## Storage boundaries

| State | Location | Lifetime |
| --- | --- | --- |
| Name, theme, sample mode, motion preference | Zustand `persist`, localStorage | Until changed or site data is cleared |
| Draft text and selected `File` objects | Zustand, memory only | SPA session; cleared on reload/close/reset |
| Sample favorites | Zustand, memory only | SPA session |
| Sample photos and fonts | Static assets + service-worker precache | Browser-controlled app cache |
| Personal memories and albums | Dexie schema prepared, unopened | Not implemented in Phase 1 |

`getDatabase()` lazily defines schema version 1. No UI imports it, opens it, seeds it, or writes personal/sample memories to it. Workbox may create its own browser cache metadata; that is distinct from the `memotrail` database. No network database, account, analytics, upload endpoint, or authentication exists.

## Implementation seams

- `src/types/memory.ts`: persistent `Memory`, `MemoryPhoto`, and `Collection` entities. Sample entities are deliberately separate types.
- `src/services/database.ts`: Dexie schema and lazy factory, indexed for dates, tags, collections, and ordered photos.
- `src/services/memory-repository.ts`: repository contract for local CRUD.
- `src/hooks/use-memory-data.ts`: replace the empty personal branch with live repository reads. Keep samples as a separate presentation source.
- `src/stores/draft.ts`: compose draft state. Add a validated explicit save transaction before exposing a “Save memory” action.
- `src/hooks/use-object-urls.ts`: owns and revokes temporary photo URLs on replacement/unmount.

## Suggested next work

1. Implement and test Dexie transactions for memory + photo saves, updates, deletion, and collection membership. Never install a populate hook with demo content.
2. Add image decoding validation, orientation handling, thumbnail generation, storage quotas, and persistence permission handling before accepting large libraries.
3. Connect the composer to explicit saves with loading, failure, and success feedback. Decide on an explicit recoverable draft policy; current drafts are not durable.
4. Connect favorites, album creation/renaming, dates, search, and On This Day to user records. Derive album covers/counts from those records.
5. Implement user-initiated export/import and tested schema migrations. Browser storage is device/origin-specific and can be cleared; there is no cloud backup.

## PWA and hosting

`vite.config.ts` precaches every route bundle, local font, icon, and sample photo. The service worker uses a user-confirmed update prompt so a new version does not silently discard a draft. The manifest includes normal and maskable PNG icons and standalone launch behavior. Install requires HTTPS or localhost, and offline access requires a completed initial cache installation.

Serve `dist/` with SPA rewrites to `index.html` for direct URLs. Serve `/sw.js` and `/manifest.webmanifest` with revalidation instead of long-lived immutable caching. Hashed `/assets/` can be cached immutably. No runtime calls to photo/font hosts are needed.

## Verification

Run `npm run build`, then `npm run test:e2e`. Tests launch the production preview and use a local Chrome installation. They cover all screens at desktop/mobile sizes and both themes, automated WCAG A/AA checks, small/tablet layouts, search/filter/favorite interactions, album navigation, draft preview and lifetime, personal/empty states, sample database isolation, and offline route reloads. Screenshots are generated under ignored `artifacts/` for visual review.

Native installation flows on actual iOS/Android devices are a separate release check; desktop browser emulation does not verify those operating-system dialogs.
