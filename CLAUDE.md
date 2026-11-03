# Tahoe theme for Windows

Equicord theme for Discord on Windows, ported from skopevoj's Tahoe for Vesktop on macOS. Read
README.md for the layout; this file is what to do on top of it.

## After every change to the theme

1. `powershell -ExecutionPolicy Bypass -File install.ps1` rebuilds `build/` and copies the theme into
   Equicord, which reloads it. Check the change in Discord.
2. Commit `src/` and `build/` together, so GitHub Pages never serves a bundle older than the source.
   Commit and push only when the owner asks.

Windows-specific rules go in `src/windows.css`, so the other modules stay close to the original and
its later changes can be brought over.

## Performance

Never put a `:has()` above the element a rule styles (`X:has(A) Y`, `X:has(A) > Y`,
`:is(…, X:has(A)) Y`): in Discord's Chromium every DOM insertion, like the cover Discord drops over
the message list when a scroll starts, then restyles whole lists at several times the cost. Let
`X:has(A)` set a flag (`--vg-is-…: 1`) and put the rules for X's parts in
`@container style(--vg-is-…: 1)`; the SF Symbols generator does the same with `--vg-sf-swap`.
A `:has()` on the element being styled (`X:has(A)`, `X:has(A)::after`) is fine. A fade mask on a
scroller always states `mask-size: 100% 100%`.

## Checking in the running Discord

`tools/cdp.mjs` needs Discord started with the debug port (see its header). Ask the owner before
quitting their Discord to restart it that way, and restart it normally afterwards, which closes the
port. Captures of their Discord show private messages: look at them, never commit them.

## Discord updates

Run `node tools/check-classes.mjs` after a Discord update; dead stems mean a renamed class to fix.
