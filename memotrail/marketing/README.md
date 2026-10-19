# MemoTrail marketing screenshots

Open **INDEX.html** in your browser to browse every output. The images remain entirely local; no publishing or uploads take place.

## Regenerate (from the MemoTrail project folder)

```powershell
npm.cmd run marketing:capture
npm.cmd run marketing:posts
npm.cmd run marketing:verify
# Or capture, compose and verify in sequence:
npm.cmd run marketing:all
```

Use `npm` instead of `npm.cmd` in Command Prompt or a shell that permits PowerShell npm scripts. No new dependencies are needed. The existing development dependencies `@playwright/test` and `sharp` are reused. Google Chrome must be installed, as in the project's existing Playwright configuration.

## Output folders

```text
marketing/
  screenshots/desktop/   # 1440×900 and 1920×1080 viewports, at 2× density
  screenshots/mobile/    # 390×844 viewport, at 2× density
  social-posts/facebook/ # six 1200×630 covers
  social-posts/instagram/# six 1080×1080 squares + six 1080×1350 portraits
  social-posts/stories/  # six 1080×1920 stories
  scripts/               # fixture, captures, HTML/CSS composition and verification
  review/                # contact sheets
  capture-manifest.json # raw file paths, routes, viewport and pixel dimensions
  posts-manifest.json   # social file paths and source screenshots
  verification.json    # dimensions, complete PNG decoding and feature coverage
  INDEX.html            # local image browser
  README.md
```

## Raw screenshot filenames

Desktop files have suffixes `_1440x900@2x.png` or `_1920x1080@2x.png`. Their actual PNG dimensions are **2880×1800** and **3840×2160**. Mobile files end in `_390x844@2x.png` and are **780×1688**. These are the requested CSS viewport dimensions rendered at device scale factor 2.

| Stem | Actual app route/state |
|---|---|
| 01_Home_Dashboard | `/`, dark-theme Home |
| 02_Add_Memory | `/add`, synthetic title, story and local photo attachment |
| 03_Memory_Details | `/memories/marketing-lake` |
| 04_Collections | `/collections`, three photo-backed collections |
| 05_Timeline | `/timeline`, chronological saved memories |
| 06_On_This_Day | `/`, scrolled to a real past-anniversary card |
| 07_Memory_Jar | `/jar`, real jar and enabled Shake control |
| 08_Time_Capsule | `/capsules`, three actual synthetic capsules |
| 09_Memory_Rewind | `/rewind`, actual monthly recap options |
| 10_Mobile_Dashboard | `/`, mobile Home |
| 11_Mobile_Memory_Details | memory details, scrolled to the entire story and actions |
| 12_Mobile_Collections | real mobile collections |

Supplemental captures include `07_Memory_Jar_Revealed` at both desktop sizes and `11_Mobile_Memory_Details_Photo`, `13_Mobile_Add_Memory`, `14_Mobile_Memory_Jar`, and `15_Mobile_Time_Capsule` on mobile. They show actual states, not reconstructed UI. The separate mobile story and photo views accommodate the app's long, scrolling detail page without changing its layout. A normal viewport screenshot shows only the current scroll position, not every part of a long page.

## Social graphic filenames

Each of these six themes is exported in all four formats:

- `01_Meet_MemoTrail`
- `02_Save_Memories`
- `03_Collections_and_Timeline`
- `04_Rediscover_Memories`
- `05_Time_Capsule`
- `06_Offline_First_Privacy`

For example: `social-posts/facebook/01_Meet_MemoTrail_Facebook_Cover_1200x630.png`.

All captions use implemented features. Post 03 includes actual Collections and Timeline pixels; Post 04 includes Memory Jar and an actual On This Day card. Supplemental detail insets are crops of captured pixels and retain their proportions. No fake device controls or app UI are drawn. The fixed-size graphics use reproducible HTML/CSS, the real production icon, existing Cormorant Garamond / DM Sans / Caveat fonts, and the actual `#201e25` charcoal / `#b69af8` lavender palette.

## Privacy and source fidelity

Capture serves the unchanged PWA at `http://127.0.0.1:4196` and creates three new ephemeral Playwright browser contexts. It never uses a persistent Chrome profile or reads a user's saved browser state. The fixture checks that journal stores are empty before inserting anything and refuses a non-marketing origin or incompatible schema. All records have `marketing-` IDs. The browser contexts are discarded afterwards; no demo records are left in a user profile. External HTTP requests and service workers are blocked during capture.

The fixed date is **October 14, 2026**, in Asia/Singapore. This makes On This Day and capsule statuses reproducible. Nine fictional memories, three collections and three capsules provide populated app views. Only the existing schema is used. No production source, route, layout or data is changed. Only npm automation scripts are added to `package.json`; marketing code is not imported into the PWA or placed in `public/`.

No screenshots are uploaded. No Mimo, AI, automatic synchronization, cloud storage, invented website URL, or encryption claim is included. Offline-first privacy copy is supported by the existing IndexedDB repository and PWA precaching; it does not promise that browser storage cannot be cleared. Offline cache installation is not exercised by this screenshot workflow.

## Photography and fonts

The selected images already ship in `public/photos/`: `lake-weekend`, `golden-hour`, `slow-mornings`, `wildflowers`, `mountain-air`, and `italian-summer`. See `public/photo-credits.txt` for source URLs and the [Unsplash license](https://unsplash.com/license). They are illustrative stock photos accompanying fictional stories; the selected images do not include identifiable faces. No new images or music are downloaded. Fonts are reused from the existing `@fontsource` packages; their license files remain in those packages.

## Checks and practical limits

Capture waits for the real page, dark theme, loaded fonts, visible images and running finite transitions. Important feature targets must fit inside the viewport; mobile target checks reserve room for the actual bottom navigation. Pointer hover and input focus are cleared before capture. No CSS redesign or fake screen overlays are injected into the application.

Composition checks ensure marketing text and framing stay inside each canvas, with no headline-to-screenshot collisions. Verification checks every required feature/size, exact PNG dimensions, nonblank pixels and complete PNG decoding. Contact sheets support visual review. Social platforms may compress uploaded PNGs; smaller UI labels naturally become smaller when a full desktop screenshot is shown inside a social graphic.

All requested features are implemented. Any capture failure stops successful composition and is recorded in `capture-manifest.json`; unavailable features must be documented there rather than fabricated.
