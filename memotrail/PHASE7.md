# Phase 7 — backup, restore and offline reliability

MemoTrail keeps journal content on the device. No AI assistant, cloud database, uploads or analytics were added. At the user's subsequent request, Mimo was removed from the app and its production assets were removed from the service worker precache. The dormant sprite source/assets remain in the repository.

## Files and persistence

- `src/services/backup.ts`: ZIP creation, validation, SHA-256 integrity, merge preview, conflict checks, storage preflight and transactional restore.
- `src/services/database.ts`: additive Dexie version 4, introducing a `settings` table. Existing journal tables and records are preserved.
- `src/stores/preferences.ts`: preferences now persist in IndexedDB so replacement can restore them in the same transaction as the journal. Existing localStorage preferences remain readable as a migration fallback; migration does not delete them.
- `src/stores/backup-operation.ts`: global operation state protects backup/restore from an application update and enables a browser navigation warning.
- `src/stores/storage-persistence.ts`: a previously denied persistence request can be retried.
- `src/components/storage-backup.tsx`, `src/styles/backup.css`, `src/pages/settings.tsx`: storage estimates/counts, local reminder controls, ZIP download/selection, verified preview, explicit replacement confirmation, errors and progress.
- `src/components/layout/app-shell.tsx`, `src/App.tsx`, `src/index.css`: local reminder and accessible sidebar labels; the later removal unmounts Mimo and removes its stylesheet import.
- `src/hooks/use-pwa.tsx`, `vite.config.ts`: prompt-based updates, save-before-reload confirmation, backup operation guard and app-shell cache readiness check. Mascot assets are excluded from precaching.
- `tests/backup.test.ts`, `tests/backup.spec.ts`: service and production-browser tests, including capsules with optional recipient/mood explicitly stored as undefined. `tests/mascot-removal.spec.ts` verifies Mimo is absent on desktop/mobile/offline pages. The capsule migration assertion accepts IndexedDB version 40 (Dexie version 4). The existing edit-notice assertion distinguishes its status message from reminder statuses.
- `package.json`, `package-lock.json`, `playwright.config.ts`: fflate runtime dependency; tsx/fake-indexeddb test dependencies; `npm run test:backup`; separate Node service tests from Playwright discovery.

## ZIP format 1

```text
manifest.json
data.json
media/media/0.bin
media/media/1.bin
media/timeCapsuleMedia/0.bin
...
```

`manifest.json` identifies MemoTrail, format version 1, database schema version 4, an ISO export timestamp, and a path, exact byte length and SHA-256 digest for every payload file. The manifest itself is not self-hashed. Checksums detect corruption; they do not authenticate a backup's author.

`data.json` contains all seven journal tables: memories, media, collections, tags, memoryTags, timeCapsules and timeCapsuleMedia. Media records replace Blob values with archive paths and preserve Blob MIME type separately. Memory favorites, dates, mood, coordinates, descriptions and other supported metadata remain intact. Collection covers, membership, tag relationships, capsule dates/status/letters and saved-as-memory links are preserved. The capsule memory link is historical and may point to a memory previously deleted by the user.

Settings include name, theme, sample mode, reduced motion and reminder preference. Last confirmed backup and reminder dismissal dates remain local to the receiving device. Merge into a populated journal keeps its preferences; an empty journal receives the backup preferences. Replace restores backup preferences while retaining the device's last backup date.

Attachments contain **the exact original bytes currently stored in IndexedDB**, without backup-time compression or image conversion. Earlier photo ingestion may already have compressed a source image; bytes discarded during that earlier process cannot be recovered. Temporary Blob URLs, ephemeral drafts, demo state, generated thumbnails and service worker caches are excluded.

ZIPs are unencrypted and include sealed capsule letters. The UI explains that users should keep them private. This implementation holds the archive in memory: supported limits are 512 MiB of extracted payload, 16 MiB per metadata JSON file, fewer than 10,000 files, and 100,000 records per table. These bounds limit decompression/memory abuse; a phone may have less practical memory capacity. ZIP creation uses stored entries to avoid recompressing photos.

The successful-backup timestamp updates after the user confirms the downloaded ZIP was saved. Merely requesting a browser download cannot establish that the file reached durable storage.

## Restore safety and recovery

1. Read and bound the archive, rejecting unexpected paths and duplicate paths before extraction.
2. Require the supported format/schema versions, manifest and structured data.
3. Check every payload's length and SHA-256; reject missing, extra or unreferenced files.
4. Validate typed fields, enum values, IDs, duplicate records, media references, collection covers/membership and tag/capsule relationships.
5. Show counts, attachment size, export date, Merge consequences and Replace consequences before any writes.
6. Merge compares every colliding ID's metadata and attachment bytes. Identical records are skipped. Changed IDs or tag-name uniqueness conflicts block the entire merge. No automatic remapping, silent overwrite or duplicate copy is performed. Conflicts are rechecked inside the write transaction in case the journal changes after preview.
7. Replace requires an explicit checkbox plus the Restore and Replace button. Existing rows are cleared only after validation and storage preflight, inside the same transaction as all inserted records and preferences.
8. Errors escape the transaction so IndexedDB rolls back clears, partial additions and settings. Keep the app open; after a failed or interrupted transaction, reopen and retry. A transaction that committed immediately before closure leaves the complete new journal. No recovery copy is needed for a transaction that rolled back.

The storage estimate is approximate. The preflight conservatively reserves room for the full incoming backup, including temporary transactional replacement needs. Actual quota/write errors also roll back. Near quota, even a duplicate-only Merge may be refused by this conservative preflight. Persistent storage reduces automatic eviction when granted; it does not protect against user-cleared site data or platform uninstall behavior.

## Offline behavior

Workbox precaches the bundled app shell, lazy screens, local fonts and demo photos. Mimo is neither mounted nor precached. Workbox has no runtime cache rules for user media, ZIP files, Blob URLs or remote content. Journal records and attachment binaries remain in IndexedDB; Workbox cache cleanup does not touch that database.

Updates wait for user action. The UI asks the user to save edits before reloading and disables updates during a backup/restore operation. Offline readiness checks that the app shell is actually cached, rather than relying solely on the existence of an active worker. During testing, duplicate Mimo precache entries with conflicting revisions caused offline startup to fail; retaining one includeAssets entry per mascot file corrected this.

## Verification

Commands:

```sh
npm run test:backup
npm run build
npm run test:e2e
npm run lint
```

Service tests use fake-indexeddb with real Blob/SHA-256/ZIP operations. Browser tests use the production build and real Chrome IndexedDB/service worker APIs. Fault injection simulates quota and transaction interruption; it does not exhaust a physical device's disk or simulate a power failure.

The service suite checks byte-for-byte equality across all seven tables, settings restore, repeat merge deduplication, adding related records to an existing journal, changed ID/media conflicts, explicit replacement, corrupt/truncated ZIPs, unsupported versions, missing/damaged media, duplicate records, invalid fields/references, a 12 MiB stored photo, insufficient estimated storage, quota rollback, interrupted transaction rollback/retry, unexpected paths and extraction bounds.

The browser suite checks offline reload, export and restore, matching restored records and media bytes, local photo display, offline reading/editing, desktop and Android Chrome phone/touch emulation, standalone display-mode emulation, preview/conflict/confirmation UX, real IndexedDB abort/retry, archive errors, reminders, persistence retry, accessibility and layout. Existing journal, capsule, collections, timeline, jar and rewind tests also run.

The subsequent `Invalid timeCapsules.recipientName` fix allows explicitly undefined values for known optional fields, while continuing to reject invalid required fields, unknown fields and malformed non-undefined values. IndexedDB retains those undefined properties when a capsule is created without a recipient or mood; JSON correctly omits them. Export validates without changing the stored records. The regression seals a capsule through the real repository, exports it, checks that the original record is untouched, merges against it, and restores it.

Final verification on the corrected production build:

- `npm run test:backup`: **12 passed** after the optional-field fix, including blank recipient/mood, complete record/media equality, corrupt archive rejection, quota failure and interrupted transaction rollback/retry.
- `npm run test:e2e`: **34 passed** in the original Phase 7 full run (4.0 minutes), before the subsequent mascot removal and optional-field fix.
- Targeted production browser rerun after those fixes: **6 passed** (26.3 seconds), including desktop/Android-emulated offline export and restore with blank optional capsule fields, and no Mimo on desktop/mobile/offline pages.
- `npm run build`: **passed** after the subsequent fixes, TypeScript and Vite production build; Workbox generated a 60-entry precache.
- `npm run lint`: **passed with six existing warnings** in shared PWA, object URL, collection, shell and rewind components; no lint errors.
- `git diff --check`: **passed**.

Earlier browser runs caught a precache conflict, an ambiguous existing status-message test, and unlabeled sidebar landmarks. These were corrected before the final full pass. A cross-tab hero test failed once in the earlier full run, then passed in both the targeted rerun and final full run without changes to its implementation.

### Physical Android / installed PWA checks still required

This workspace has no physical Android device or installed-PWA automation endpoint. Chrome mobile/touch and standalone emulation cannot verify Android's real installation, file picker/download behavior or uninstall/storage policies. Before release:

1. Install the production build from HTTPS in Android Chrome; wait for offline readiness, close it and launch from the home screen in airplane mode.
2. Read/edit memories and view stored photos; export a ZIP to Files and restore it with the Android file picker while offline.
3. Restore multiple large real photos/capsules, confirm metadata/media equality, and check a near-full device.
4. Force-close during a restore, reopen, and confirm either the complete old journal or complete restored journal, with no partial replacement.
5. Deploy an update; verify it waits for approval, blocks updating during restore, preserves saved data, and still starts offline after updating.

Transaction behavior follows the [Dexie transaction documentation](https://dexie.org/docs/Dexie/Dexie.transaction%28%29). Brief attachment comparisons inside a transaction use [Dexie.waitFor](https://dexie.org/docs/Dexie/Dexie.waitFor%28%29); ZIP operations use [fflate's documented async ZIP and extraction filter APIs](https://github.com/101arrowz/fflate).
