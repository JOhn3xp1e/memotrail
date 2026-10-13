Mimo now uses the supplied Mimo_Complete_Sprite_Pack, not the static preview.

Active assets: public/assets/mimo/manifest.json plus 14 transparent horizontal
PNG strips. The original extracted pack and CODEX_PROMPT.md remain untouched in
public/mimospritesheet/Mimo_Complete_Sprite_Pack/Mimo_Complete_Sprite_Pack.
The pack's README identifies these as simplified 2D illustrations with modest
pose/expression changes; they are not identical to the earlier 3D/clay concept.
Their upright ears and simplified props differ from that reference.

Verified strip names:
idle, blink, wave, walk, happy, sad, cry, thinking, camera, celebrate, sleep,
surprised, envelope and memory_jar.

Each source PNG is 2048 x 256: eight ordered 256 x 256 frames. The manifest's
fps and loop settings are retained. Idle/sad/cry/thinking/sleep use 5 fps;
the other actions use 9 fps. Idle, blink, walk and sleep loop. Other actions
complete once, then the shared controller returns to idle. memoryJar remains a
backward-compatible controller alias for memory_jar. Speaking has no delivered
sprite and remains a future assistant extension.

MimoSpritePlayer draws one native 256 x 256 crop to a fixed square canvas.
It never displays the entire strip. CSS scales that canvas uniformly, with the
floating mobile mascot about 75 CSS pixels and desktop at 88 pixels. All strips
are preloaded, dimension/signature/alpha checked and decoded once per action.
Cropping uses integer source offsets, while a timestamp clock selects frames at
manifest speed. Cached strips prevent flicker when switching actions. Hidden
documents pause clocks without accumulating hidden time. Reduced motion holds
frame zero; reactions still finish. Minimizing removes the player and restores
idle. Higher-priority save/envelope/celebration events override greetings; request
IDs protect newer actions from stale completion callbacks.

Existing UI and IndexedDB schemas/data are preserved. Event connections:
- Tapping Mimo waves and opens the existing local assistant.
- Successful memory save: camera.
- Memory Jar pick: memory_jar while unfolding; happy on reveal.
- Successful Time Capsule seal: envelope.
- Rewind closing slide: celebrate, including manual advancement.
- Local assistant search: thinking, then happy or a friendly wave.
- Writing tools keep their friendly reactions based on the saved non-sensitive
  mood labels. No sad or cry reaction is inferred.
- Assistant > Try a Mimo reaction lets the user explicitly choose all 14 actions.
  Looping poses continue until another action, closing the assistant, or minimize.
  The assistant's reaction toggle can disable its reactions.

Workbox precaches the active manifest and all 14 PNGs. The original extracted
pack, labeled concept/reference boards and pack preview are excluded from the
offline cache so reference art is not confused with production sprites. The
static SVG remains a clearly labeled fallback for missing/invalid assets.
Rebuild after replacing production assets to update the installed PWA cache.

npm run mimo:validate checks all strips and each of their 112 crops. It reports
PNG dimensions, nonempty alpha content, a fully transparent outer border,
frame counts/timing and per-file cache size. It produces:
- artifacts/mimo-asset-validation.json
- artifacts/mimo-frame-review.html (ordered checkerboard crops, not whole strips)

Pixel checks do not certify pose quality. All delivered action illustrations are
usable, but some motions are subtle and stylized, rather than full hand animation.

The earlier v2 individual-PNG pipeline is still supported for alternate manifests:
version 2, format individual-png-frames, global frameWidth/frameHeight, and
animations with status (pending/candidate/verified), frameCount, frameDurationMs,
loop and an ordered frames array. Verified v2 entries require visualReview: true.
Durations may be a scalar or per-frame array. Candidate/pending entries stay on
fallback. Individual files must use frames/<action>/<file>.png paths. Global
dimensions must be consistent, and bounds/scale/alignment still need visual
review. The old reference templates are not the active manifest.

MimoMascot accepts state, size, manifestUrl, inline, onComplete and onActivate.
Explicit state props are controlled: the caller changes state on completion.
The default shared controller can play reactions or persistent loops:

```ts
useMimo.getState().play('camera'); // Once, then idle
useMimo.getState().play('envelope');
useMimo.getState().play('memory_jar');
useMimo.getState().play('walk'); // Manifest loop
useMimo.getState().play('sad'); // Explicit user choice only
useMimo.getState().play('idle'); // Stop an action
```

No local generative model or cloud processing is added. See MIMO_ASSISTANT.md
for the existing rule-based assistant.

Checks: npm run build; npm run mimo:validate; Playwright Mimo/assistant/strip
and memory-flow tests. The real-strip tests compare every rendered frame pixel
with an independent source crop and check speed, loop/one-shot behavior, pause,
reduced motion, navigation clearance, minimize/restore and all states offline.
Android-sized Chrome is emulated with a Pixel 7 viewport, touch and Android user
agent; physical Android hardware and launcher installation are not available in
this workspace.

