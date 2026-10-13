Integrate the attached Mimo_Complete_Sprite_Pack into the existing MemoTrail React/TypeScript/Vite PWA.

1. Inspect existing MimoMascot, MimoSpritePlayer, animation controller and event hooks. Preserve existing routes, UI and Dexie data.
2. Copy the PNG strips and manifest.json into public/assets/mimo/ (or an equivalent public asset location). Do not reference the old concept/reference sheet as a sprite.
3. Parse the manifest and render each horizontal strip as 8 frames of 256x256 pixels, with the manifest fps and looping rules. Use a fixed-size viewport with background-image and background-size: 800% 100%; advance the background position one frame at a time, or use an equivalent frame crop. Never show the entire strip at once.
4. On mobile, display Mimo at about 64-88 CSS pixels; preserve aspect ratio. Make the floating mascot tappable, non-obstructive, and dismissible. Remove the “Static preview” label once verified.
5. Support states idle, blink, wave, walk, happy, sad, cry, thinking, camera, celebrate, sleep, surprised, envelope, memory_jar. Play non-looping reactions once and return to idle; queue/interrupt intelligently. Trigger camera on save memory, happy on memory jar reveal, envelope on capsule seal, celebrate after rewind, thinking for assistant, sad only for explicit sad reaction (do not infer user mood). Tap mascot to wave.
6. Preload strips, respect prefers-reduced-motion, pause when document is hidden, and clean up animation timers. Keep UI responsive and offline.
7. Run npm run build; verify in Android Chrome and PWA. Report actual behavior and remaining art limitations.

The supplied sprites are stylized 2D animation assets; do not claim they are identical to the original 3D Mimo artwork.
