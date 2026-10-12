# MemoTrail: Phase 2 local journal

## Local-first storage

MemoTrail keeps personal content in the browser's `memotrail` IndexedDB database through Dexie.js and `dexie-react-hooks`. It does not send memories, collection details, or photo blobs to a server.

| Table | Primary key | Contents |
| --- | --- | --- |
| `memories` | UUID `id` | Title, description, memory date, mood, favorite state, optional collection/location/coordinates, and timestamps |
| `media` | UUID `id` | Image/video Blob, MIME type, byte size, creation time, and display order |
| `collections` | UUID `id` | Name, description, optional cover-media reference, and timestamps |
| `tags` | UUID `id` | Unique tag names |
| `memoryTags` | `[memoryId, tagId]` | Indexed memory-to-tag links |

Schema version 2 migrates the earlier unused Phase 1 table names and fields. Memory/photo saves, memory deletion, tag-link replacement, and collection deletion use IndexedDB transactions. Deleting a memory removes its media and tag links; removing a collection clears its memory assignments.

## Screens and workflows

- The Add Memory composer validates image formats and sizes, decodes selected files, and downsizes large high-resolution photos where supported. Save writes the memory and all selected Blob media atomically.
- Timeline uses live Dexie queries, groups memories by month and year, searches title/description/location, and filters personal records by date range, mood, collection, and favorite state.
- Memory details support favorite toggling, editing, and confirmed deletion. Collections can be created, renamed, described, and assigned to memories.
- The Home page reads recent and anniversary memories from the selected data source.
- Image object URLs are revoked on replacement/unmount. Missing or invalid Blob media is excluded from queries; image decode failures show a local-media placeholder.
- The browser's persistent-storage API is requested where available. It is best-effort protection, not a backup guarantee.

## Sample data and privacy

Sample memories and sample collections remain separate presentation fixtures. Their favorites are session-only and no sample record is written to IndexedDB. Turning sample mode off displays only device-owned records. Name, theme, and display preferences remain in localStorage; composer drafts are session-only.

This is device- and origin-specific browser storage. Clearing site data, losing the device, or browser quota eviction can remove memories. Export/restore and cloud synchronization are not part of Phase 2.

## PWA behavior

The production service worker caches the app shell and local assets for offline reopening. Install requires HTTPS or localhost, and the initial application load must complete before the app can be reopened offline. No online database or media upload endpoint is configured.

## Verification

Run `npm run build` and `npm run test:e2e` from the app directory. Browser coverage checks responsive screens and accessibility, keeps samples out of personal tables, and exercises personal collection creation, memory save/edit/search/filter/favorite/delete, reload persistence, and offline reopening.
