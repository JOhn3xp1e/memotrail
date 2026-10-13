Phase 7 adds a local, rule-based assistant. No generative model is installed.

Tap the floating Mimo (or activate "Chat with Mimo" using the keyboard) to open
the lavender/cream chat panel. Its mobile position stays above bottom navigation.
The existing mascot moves into the panel; there is no second animation running
behind it. Closing returns focus to the floating companion. Existing saves, jar
reveals, capsule sealing and rewind reactions are preserved.

The panel and its search/writing code are lazy-loaded. The PWA precaches the
bundle so an installed app can open the assistant offline without first opening
it online. Conversations, result snapshots and draft text are only in component
memory and clear on close; no assistant tables, analytics, cloud services or
IndexedDB migration were added.

Search reads only saved personal memories and collections through the existing
memoryRepository. Sample scrapbook records are excluded. Local rules understand
English month names/abbreviations with optional years, ISO dates, saved mood
names, favorites, and AND matching of remaining title/description/collection/
location keywords. Examples: "Show my beach memories", "Find memories from
August 2026", "Show my favorite memories", "Summer travels", "peaceful".
This is deterministic keyword/filter matching, not unrestricted language
understanding. Results sort by memory date, display ten at a time, and link to
personal Memory Details. Deleted/updated records are re-read before drafting.

Caption tools provide three visibly rule-based choices: the recorded title,
title plus saved mood, and title plus existing description (or an explicit
placeholder if there is no story). No inferred people or events are inserted.
Story help only tidies tabs/spaces and excess blank lines, with optional writing
prompts the user can answer. It shows the original, offers an editable draft and
explicit Copy action, and never writes a memory. A user can paste the draft into
the existing editor, review it and choose Save there. Copy failure leaves text
selectable for manual copying.

Search uses thinking then happy/greeting reactions. Writing tools use happy,
celebrate for a user-saved adventurous mood, or a warm wave for saved peaceful/
nostalgic moods. These are presentation choices, not emotional diagnoses.
"Mimo reactions" can turn off assistant-specific reactions for this session.
Visibility pausing, minimizing and both reduced-motion settings still apply.
The supplied Complete Sprite Pack now provides 14 verified transparent 2D strip
animations from public/assets/mimo. "Try a Mimo reaction" exposes every pose,
including explicit-only sad and cry; neither is inferred from saved mood or text.
The static preview is only a missing/invalid-asset fallback. Speaking remains an
optional future state without its own sprite. See MIMO.md for playback details.

Optional on-device AI is an interface only, in mimo-local-model.ts. The browser
check requests an actual WebGPU adapter and reads WebAssembly availability,
secure context and an estimated storage quota. Backend availability and quota
estimates do not prove a model works or guarantee free disk space. There is no
runtime, weight file, endpoint or available model in the catalog. Nothing is
downloaded, and no saved text is submitted to a model.

A future reviewed local adapter must declare download/storage sizes, be tested
in MemoTrail, show those sizes to the user, and call initializeLocalModel only
after explicit consent. The initializer checks consent, tested status, required
backend and storage before invoking any download/initialization. Adapters must
perform inference locally and never transmit prompts. They accept abort signals
and expose disposal; initialization failures dispose resources. Production
integration will require actual device/model tests and review of its network
behavior before any claim that local generative AI works.

Checks: npm run build; npm run lint; Playwright tests in mimo-assistant.spec.ts
cover multiple memories, dates/collections/moods/favorites, empty results,
opening/closing/focus, templates, unchanged IndexedDB records, mobile/desktop,
themes, accessibility, consent guards, lazy loading and an offline PWA without
external requests or content POSTs. Existing Mimo and memory-flow tests remain
part of the regression suite.
