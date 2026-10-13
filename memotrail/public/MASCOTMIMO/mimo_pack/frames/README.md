This directory has no individual-frame exports. The active Complete Sprite Pack
is installed as horizontal PNG strips in public/assets/mimo. The instructions
below remain available for future individual-frame deliveries.

Place artist-exported, individual transparent frames under each action folder:
`idle/001.png`, `idle/002.png`, `wave/001.png`, and so on. Use a consistent
256 x 256 canvas, scale and ground alignment for every action, without trimming
each pose. Leave at least a 1px fully transparent border. Include the full ears,
camera, scarf and any deliberately animated props. Never export board labels or
backgrounds as character pixels.

The explicit array in `../animation_manifest.json` controls order, not filename
sorting. Start with status `candidate`, list all files, and set their durations.
Run `npm run mimo:validate` from the app root to inspect pixels and generate a
review sheet. Check character identity, consistent scale, alignment, correct
sequence and clean alpha edges. Only then set `visualReview: true` and status
`verified`. Candidate and pending assets stay on the labeled static preview.

The original `animation_manifest.template.json` describes a legacy strip format
and is retained as a supplied reference; it is not the live production manifest.
