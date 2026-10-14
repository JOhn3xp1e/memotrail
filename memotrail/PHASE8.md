# Phase 8 — native-like controls and supplied icon branding

The journal schema and backup format are unchanged. Existing record IDs, collection relationships, original stored media, capsule dates/time zones, and local-only storage remain intact. Mimo and AI remain unmounted. No cloud service or content upload was added.

## Native UI audit and replacements

| Interface | Change |
| --- | --- |
| Add/Edit Memory collection `<select>` | `MemoSelect`: anchored desktop popover; themed phone bottom sheet, collection indicators, and Create a collection action. Existing IDs and repository validation are preserved. |
| Timeline year, mood and collection selects | The same reusable picker, preserving URL-based filters. |
| Capsule optional mood select | The same reusable picker; blank values retain their existing optional semantics. |
| Memory date, timeline date filters, capsule unlock date | Typed ISO date fields with a custom calendar, month/year navigation, range constraints and keyboard day navigation. |
| Capsule time input | Typed 24-hour field and themed hour/minute selection. The existing conversion to local device time and future-date validation remain unchanged. |
| App update `window.confirm` | `MemoConfirmDialog`, with cancel-first focus, save-before-reload explanation and the existing backup operation guard. |
| Memory deletion, capsule sealing/deletion, collection deletion | Shared `MemoConfirmDialog` with explicit confirmation and busy-state protection. Collection deletion removes the collection only; memories and photos remain. |
| Backup preview/restore, collection creation/editing, previews and rewind | Continue using the shared Radix dialog wrapper, now with focus restoration, larger close targets, viewport-aware sizing and consistent styling. Backup replacement still requires its separate explicit checkbox. |
| Alerts and feedback | No mounted `window.alert` calls were found. Added a branded toast system with success/error/warning/info support, used for collection deletion, backup errors and update errors. Persistent inline errors and destructive confirmations remain. |

File selection, browser installation prompts, browser storage permissions, and the leave-page warning during an active backup remain platform-controlled. They provide privileged browser/device access or protect an interrupted operation and are not replaced with decorative controls. Retired, unmounted Mimo source is excluded from the active UI audit.

## Shared components and accessibility

- `MemoPicker`: one responsive surface for collection, mood, calendar, hour and minute pickers. Existing Radix Dialog provides modal sheets; Radix Popover provides anchored desktop surfaces.
- `MemoSelect`: controlled record values, listbox/options, selected indicators, arrow/Home/End navigation, typeahead, Enter/Space selection and focus return. Create action stays outside the option list.
- `MemoDateInput`: strict calendar-day validation, manual `YYYY-MM-DD` entry, local-noon calendar calculations, selected/today indicators and keyboard arrows/Home/End/PageUp/PageDown. Memory save now explicitly rejects invalid calendar dates; form errors are branded inline messages rather than browser constraint bubbles.
- `MemoTimeInput`: `HH:mm` entry and hour/minute pickers. Text keyboards permit typing `-` and `:`. Midnight retains the previous blank-time meaning.
- `MemoConfirmDialog`: alert-dialog semantics, safe cancel-first focus, explicit action labels, focus restoration and dismissal prevention while a write is busy.
- `MemoToastViewport` with `src/stores/toasts.ts`: ephemeral feedback only, outside persistent journal storage.
- Enhanced `DialogContent`: a 44px close button, remembered opener focus, busy state, Escape/backdrop protection during writes and shared overflow rules.

The existing serif typography, lavender tokens and light/dark surfaces are reused. Sheets have rounded top corners, a subtle handle, safe-area padding, scrollable options and a layer above bottom navigation. New custom controls have at least 44px touch targets. Both OS reduced motion and MemoTrail's reduced-motion preference suppress popup animations.

The app tracks `visualViewport.height` and `offsetTop` to keep modal dialogs within the visible viewport when a keyboard reduces available space. Phone sheets move above that reduced viewport boundary. Dialog action rows remain within the scrolling dialog.

The underlying primitives follow the [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) and [Radix Popover](https://www.radix-ui.com/primitives/docs/components/popover) APIs. Option keyboard behavior follows the [WAI listbox pattern](https://w3c.github.io/wai-website/ARIA/apg/patterns/listbox/).

## Supplied branding artwork and build pipeline

The user supplied `public/icons/memoicon.png` (1254×1254). It is the raster artwork source for this release, rather than an editable vector illustration. The source file is preserved unchanged.

Run:

```sh
npm run icons:generate
```

`scripts/generate-icons.mjs` uses Sharp locally. It makes only the boundary-connected, near-black exterior matte transparent, preserving internal dark details, then generates:

| Output | Size |
| --- | --- |
| `public/icons/icon-192.png` | 192×192 |
| `public/icons/icon-512.png` | 512×512 |
| `public/icons/maskable-512.png` | 512×512 |
| `public/apple-touch-icon.png` | 180×180 |
| `public/favicon.png` | 64×64 |

The maskable variant places the complete artwork inside the central safe circle on the existing cream background. Tests check both dimensions and that no meaningful artwork extends outside that circle. Ordinary icon sizes use consistent proportional scaling and preserve the supplied artwork's padding.

`BrandMark` now displays the generated icon. `index.html` uses the PNG favicon and Apple touch icon. The manifest retains the existing app name, short name, theme/background colors and standalone mode. Workbox precaches generated icons and excludes the large source artwork. Existing application update behavior and offline navigation are preserved. Installed launcher-icon refresh timing still depends on the browser/platform.

## Files changed

- New shared controls: `src/components/ui/memo-picker.tsx`, `memo-select.tsx`, `memo-date-input.tsx`, `memo-time-input.tsx`, `memo-confirm-dialog.tsx`, `memo-toast.tsx`.
- Supporting code: `src/lib/date-input.ts`, `src/stores/toasts.ts`, `src/styles/native-ui.css`.
- Shared app integration: `src/App.tsx`, `src/index.css`, `src/components/ui/dialog.tsx`, `src/hooks/use-pwa.tsx`.
- Journal interfaces: `src/pages/add-memory.tsx`, `timeline.tsx`, `collections.tsx`, `memory-details.tsx`, `capsule-create.tsx`, `capsule-details.tsx`, `src/components/memory-dialog.tsx`, `src/components/storage-backup.tsx`.
- Branding: `src/components/brand.tsx`, `index.html`, `vite.config.ts`, `scripts/generate-icons.mjs`, supplied `public/icons/memoicon.png` and generated assets listed above.
- Dependencies/scripts: `package.json`, `package-lock.json` add Radix Popover, Sharp and `icons:generate`.
- QA: `tests/phase8.spec.ts`, `tests/helpers/memo-select.ts`; existing app, capsule, collection-cover, memory-detail, hero and timeline tests now interact with the actual custom controls. Backup/hero/jar checks wait for page readiness, foreground animation rendering and cross-tab favorite updates before interacting.

No changes were made to the database schema, memory/capsule repositories, backup format, or user-data migrations in this phase.

## Verification and limits

- Icon generation: passed; verified all five output sizes and maskable safety.
- `npm run build`: passed, including TypeScript; generated a 64-entry Workbox precache.
- `npm run test:backup`: 12 passed, preserving export/restore integrity, optional capsule fields, conflict handling and rollback.
- `npm run lint`: passed with the same six existing warnings; no new warnings or errors.
- `git diff --check`: passed.
- Browser verification includes all five requested Android viewport widths in both themes, accessibility scans of open sheets/calendars, keyboard navigation/typeahead, Escape/backdrop closure, focus restoration, Create from picker, Edit selection, safe collection deletion, calendar validation, capsule time selection, simulated keyboard viewport reduction and nested pickers. Existing browser tests cover capsules, memories, photos, backup/restore offline, standalone-display emulation, jar, rewind and timeline.

Final production browser run: **40 passed in 4.5 minutes**. This includes all six new Phase 8 cases and the existing offline/data-preservation regression suite. Earlier checks exposed test timing problems: scanning a still-mounting Settings page, inspecting background-tab animations, and pressing the jar picker before a cross-tab favorite change enabled it. The tests now wait for the actual visible/enabled UI; the final full run passed.

Preview screenshots: `artifacts/phase8-sheet-dark.png` and `artifacts/phase8-sheet-light.png`.

The tests use desktop Chrome and Android Chrome viewport/touch/user-agent emulation. Standalone display mode and keyboard viewport changes are simulated. No physical Android device or real installed-PWA automation endpoint is available in this workspace. Before release, check the actual Android keyboard, screen-reader behavior, safe-area behavior, launcher icon refresh and installed-PWA date/time/collection sheets on a device. Browser-native installation/file access prompts necessarily remain outside the app's theme.
