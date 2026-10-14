# MemoTrail — Living Scrapbook

An original 40-second, 30 FPS Remotion film, independently composed at 1920×1080 and 1080×1920. The existing PWA is read as source and served locally for captures; its source, routes, schema and personal data are not changed.

## Windows commands

Run from this directory. `npm.cmd` avoids PowerShell execution-policy issues; `npm` works from Command Prompt.

```powershell
npm.cmd install
npm.cmd run promo:capture
npm.cmd run promo:studio
npm.cmd run promo:render:landscape
npm.cmd run promo:render:vertical
npm.cmd run promo:render:all
npm.cmd run promo:qa
```

Prerequisites: Node, the existing sibling `memotrail/node_modules` installation, and Google Chrome. Set `PROMO_CHROME` to an alternate Chrome executable for rendering. Capture uses Playwright's installed Chrome channel. No global FFmpeg installation is required: Remotion supplies its tools.

## Project

- `src/index.tsx`: two 1200-frame compositions.
- `src/video.tsx`, `src/visuals.css`: layered paper, Polaroids, editorial type, intentional camera motion, photo-to-interface morph, perspective page turn, closing book and final brand.
- `scripts/capture.mjs`: 18 actual screenshots, two ephemeral browser contexts, synthetic journal fixture, local origin `127.0.0.1:4188`, blocked service workers. No persistent browser profiles or production addresses.
- `scripts/assets.mjs`: deterministic, original paper texture.
- `scripts/render.mjs`: both H.264 MP4s and representative stills. `PROMO_STILLS_ONLY=1` renders previews only.
- `scripts/qa.mjs`: MP4 metadata, complete decode, blank-frame checks and contact sheets extracted from the delivered videos.
- `public/ui/`: mobile and desktop Home, Add Memory, photo attachments, Collections, Timeline, memory details, Memory Jar, Memory Rewind and Time Capsule.
- `public/photos/`: already bundled local sample photographs; attribution and source URLs in `photo-credits.txt`.
- `public/fonts/`: existing Cormorant Garamond, DM Sans and Caveat fonts with their license files.
- `public/brand.png`: unchanged `public/icons/icon-192.png` used by the production Brand component. The serif MemoTrail wordmark retains its lavender period.
- `out/MemoTrail_LivingScrapbook_Landscape.mp4`
- `out/MemoTrail_LivingScrapbook_Vertical.mp4`
- `qa/`: capture, render and verification reports, composition previews and contact sheets from final MP4s.

## Editorial timing

| Time | Story |
|---|---|
| 0–6 s | Blank page, one Polaroid, “Some moments deserve to stay.” |
| 6–12 s | Collage, dates and handwritten notes, “Every little moment tells a story.” |
| 12–19 s | Photo expands into real mobile Home, Add Memory and photo attachments. |
| 19–26 s | Page-turn illusion reveals desktop Collections, Timeline and a memory detail view. |
| 26–33 s | Real Memory Jar, Memory Rewind and Time Capsule screens. |
| 33–40 s | Book closes; logo, tagline and call to action hold through the last frame. |

## Fidelity and limitations

Memory Vault is the existing Timeline according to `src/data/help.ts`, rather than a separate route. The third desktop shot opens a real memory from that vault. Screenshots are intact app pixels; the portrait composition additionally magnifies a crop of the same desktop capture for readability. All screenshot scaling preserves aspect ratio. Screens represent synthetic data as of October 14, 2026. UI interactions are captured as still images and animated in the film.

The page turn is a restrained 2D perspective illusion, not a photorealistic simulation. No previous advertisement reference was available in this session; this film follows an independently designed scrapbook composition.

Both outputs are deliberately silent, with the supplied scene durations ready for a licensed score. No music, mascot, AI, cloud, synchronization claim or invented website appears.

The existing photographs are identified as Unsplash assets in the PWA's credit file. Their [license](https://unsplash.com/license), checked October 14, 2026, permits commercial use. The selected film photos depict landscapes and coffee, avoiding identifiable people. Remotion's software license is separate from the asset licenses; see its package license for the terms applicable to your organization.
