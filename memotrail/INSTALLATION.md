# Installation progress

The Settings install button opens MemoTrail's own responsive progress panel,
with lavender animation, the supplied app icon, and confirmation stages.
The browser's native confirmation is still required; websites cannot replace
it or read the operating system installer's download percentage.

`src/hooks/use-pwa.tsx` consumes each install prompt once, handles cancellation
and rejection, and waits for the browser's `appinstalled` report. The panel
stops animating after 45 seconds without a result and offers browser-menu
guidance. A late result still updates the panel. Closing it leaves the journal
usable and does not cancel a browser-managed installation.

`src/components/install-progress.tsx` and `src/styles/install-progress.css`
provide the panel. They respect device and app reduced-motion settings.
Accepting the prompt does not mark the app installed. Even `appinstalled` may
precede Android completing its WebAPK installation, so completion copy explains
that the system may still be working. No journal data or caches are cleared.

`tests/install.spec.ts` tests acceptance, dismissal, failure, timeout, late
completion, mobile layout and accessibility. It also checks the built manifest,
PNG icon dimensions and MIME types, and Chrome installability diagnostics in a
disposable normal profile (incognito profiles prohibit installation).
These checks do not install an actual app on a physical phone or desktop.

The deployed URL is still needed to investigate the reported system installer
getting stuck: local diagnostics cannot verify deployed asset responses or
Android's WebAPK service. Deploy the new build before testing the new panel.
