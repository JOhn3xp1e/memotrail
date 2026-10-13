Mimo's production pipeline uses individual transparent PNG frames (manifest v2).
The static mascot and all existing interactions continue to work. Memory data
and IndexedDB schemas are untouched.

The two supplied PNGs are references only:
- `MASCOTMIMO/mimo_pack/reference/mimo_concept_sheet.png`
- `MIMOREFERRENCE/Mimo_Animation_Reference/Mimo_Animation_Reference/mimo_animation_reference.png`

Both contain backgrounds and labels. The newer board also has uneven spacing
and repeated/inconsistent frame numbers. Neither is cropped, decoded as frames,
or included in the PWA's offline cache. The displayed SVG is the existing labeled
static preview, not production animation art.

No production PNG frames are ready. All 13 requested states are pending:
idle, blink, wave, walk, happy, thinking, camera, celebrate, sleep, sad,
surprised, envelope and memoryJar. Speaking remains an optional future state.
Counts and durations in the live manifest are provisional animation plans;
adjust them to the artist-approved final exports instead of trusting board labels.

Production delivery:
1. Export separate PNGs into `public/MASCOTMIMO/mimo_pack/frames/<action>/001.png`,
   `002.png`, etc. Recommended common canvas: 256 x 256. Keep the same canvas
   dimensions across every animation, character scale and ground alignment.
   Include whole ears and props, clean alpha edges and a clear 1px outer border.
   Do not trim canvases per pose, rescale poses independently or include captions.
2. Edit `public/MASCOTMIMO/mimo_pack/animation_manifest.json`. Supply explicit
   ordered filenames, exact frameCount, frameDurationMs and loop. Start with
   status candidate. frameDurationMs is either one duration for all frames or an
   array with one millisecond duration per listed frame.
3. Run `npm run mimo:validate` (Node 22.18+ and the project's installed Chrome
   Playwright channel). It checks metadata, PNG signatures, file existence,
   dimensions, alpha transparency, nonempty content and the 3 MiB per-file PWA
   cache limit. It writes `artifacts/mimo-asset-validation.json` and an offline
   checkerboard contact sheet at `artifacts/mimo-frame-review.html`.
4. Review every frame in the contact sheet for identity, scale, alignment, order
   and labels/backgrounds. Bounds, center spread and baseline spread assist
   review; they cannot distinguish an intentional jump or ear movement from
   unintended drift. Automated transparency checks cannot prove a background-free
   character silhouette. Do not mark visualReview until the art has been checked.
5. Set visualReview to true and status to verified, run validation again, then
   run `npm run build`. Rebuilding updates the installed PWA's offline cache.

Example entry (files must actually exist; this is documentation only):

```json
{
  "version": 2,
  "format": "individual-png-frames",
  "character": "Mimo",
  "frameWidth": 256,
  "frameHeight": 256,
  "animations": {
    "wave": {
      "status": "candidate",
      "visualReview": false,
      "frameCount": 3,
      "frameDurationMs": [100, 150, 250],
      "loop": false,
      "frames": [
        "frames/wave/001.png",
        "frames/wave/002.png",
        "frames/wave/003.png"
      ]
    }
  }
}
```

pending entries have an empty frames array and a planned positive frameCount.
candidate entries contain exports available for validation, but are not played.
verified entries require visualReview: true and still undergo runtime pixel checks.
The original supplied strip-based template is retained as reference only.
Legacy strip manifests are rejected by the v2 loader.

MimoSpritePlayer loads and decodes every frame of an action before showing any,
caches decoded images, and draws them on one fixed canvas. The square display box
stays stable even for a different source aspect ratio; object-fit preserves that
ratio. A timestamp-based frame clock supports uneven durations and loops without
chained-timer drift. Idle and greeting are preloaded; returning to a successfully
preloaded idle uses the cached frames. Missing/invalid assets fall back atomically
to the static preview. Requests time out after ten seconds. Individual frames
must be 16–1024 pixels per side; each animation is capped at 120 frames and 64 MiB
of decoded pixels. A manifest error keeps the whole manifest on fallback.

Temporary actions complete once and return to idle. Hidden documents suspend the
clock without accumulating hidden time; minimizing removes the player. OS and
MemoTrail reduced-motion settings freeze frame zero, while reactions still finish.
Thinking/sleep can remain active until a caller changes them; speaking has no AI
or audio behavior.

MimoMascot accepts state, size, manifestUrl, inline, onComplete and onActivate. Explicit state
is controlled: the caller uses onComplete to switch it. The shared controller:

```ts
useMimo.getState().play('camera'); // One-shot, then idle
useMimo.getState().play('memoryJar');
useMimo.getState().play('envelope');
useMimo.getState().play('thinking', false); // Persistent state
useMimo.getState().play('walk', false); // Explicit continuous loop
useMimo.getState().play('idle'); // Explicit stop
```

The floating companion now opens the Phase 7 local assistant on activation;
its greeting animation is preserved. See MIMO_ASSISTANT.md for assistant details.

Priority and request IDs prevent greetings or stale completion callbacks from
cancelling save/celebration reactions. Existing events remain: home greeting,
camera after a successful memory save, happy after jar reveals, celebrate after
capsule sealing and when rewind reaches its closing slide. Rewind suspends the
background companion and presents Mimo inside its dialog.

Verification commands:
```sh
npm run mimo:validate
npm run build
npx playwright test tests/mimo.spec.ts tests/mimo-assets.spec.ts
```

The colored squares in automated tests are synthetic fixtures under artifacts
or mocked responses; they are never shipped as Mimo assets.

