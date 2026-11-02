# Tahoe theme

Vencord theme for Vesktop on macOS. Read README.md for the layout; this file is what to do on top of it.

## After every change to the theme

1. `tools/reload.sh` rebuilds `build/` and reloads the theme in the running Vesktop.
2. Re-render the screenshots the change shows up in (below), look at each one before committing.
3. Commit `src/`, `build/` and `docs/screenshots/` together, so the README never shows an older look.
   Commit and push only when the owner asks.

Which screenshots to redo:
- tokens, palette, a flavor file, layout, sidebar, chat, toolbar, people, icons: the flavor gallery and
  every "More screens" shot.
- one module only: the shots that show it (floating, forms → option-sf; threads → forum and thread;
  calls → none yet).
- `src/options.css` or an option's default: the matching option comparison (vibrancy, SF Symbols,
  compact, panel art, background image).

## Rendering screenshots

Vesktop must run with the debug port: `open -g -a Vesktop --args --remote-debugging-port=9222`.
Each shot needs a specific screen open in Discord. Ask the owner to open it and wait for them to say
so; never navigate their Discord yourself beyond what a shot below says. Before each run reload the
page (`node tools/cdp.mjs eval 'location.reload()'`, wait ~10 s): the demo rewrites the live page and
running it twice reshuffles an already shuffled page. Reload again when done, so nothing fake stays.

| Shot | Screen to open | Command |
|---|---|---|
| Flavor gallery (`chat-*.webp`, README gallery) | AtlasOS, `#programming`, member list shown | `node tools/showcase/shoot.mjs` |
| Vibrancy on | same | `node tools/showcase/shoot.mjs --only Tahoe --wallpaper vivid --name option-vibrancy --suffix on --no-gallery` |
| Vibrancy off | same, after the one above | `node tools/showcase/shoot.mjs --no-demo --only Tahoe --wallpaper vivid --name option-vibrancy --suffix off --set "--vg-vibrancy: off" --no-gallery` |
| SF Symbols on | same | `node tools/showcase/shoot.mjs --no-demo --only Tahoe --menu --crop menu --name option-sf --suffix on --no-gallery` |
| SF Symbols off | same | `node tools/showcase/shoot.mjs --no-demo --only Tahoe --menu --crop menu --name option-sf --suffix off --set "--vg-sf-symbols: off" --no-gallery` |
| Panel art on | AtlasOS `#programming` (fresh reload) | `node tools/showcase/shoot.mjs --keep-panel-art --only Tahoe --crop "section[class*=panels_]" --name option-panel-art --suffix on --no-gallery` |
| Panel art off | same, after the one above | `node tools/showcase/shoot.mjs --no-demo --only Tahoe --crop "section[class*=panels_]" --name option-panel-art --suffix off --set "--vg-panel-art: off" --no-gallery` |
| Compact off / on | same | `node tools/showcase/shoot.mjs --no-demo --only Tahoe --crop "[class*=base_] > [class*=content_] > [class*=sidebar_]" --name option-compact --suffix off --no-gallery`, then `--suffix on --set "--vg-compact: on"` |
| Background image | same | `node tools/showcase/shoot.mjs --no-demo --only Tahoe --menu --name option-background --suffix on --set "--vg-background-image: on; --vg-background-image-url: url(https://skopevoj.github.io/tahoe-discord-theme/tools/showcase/assets/wallpaper-vivid.jpg)" --no-gallery` |
| Forum | AtlasOS `#atlas-support` forum with the "cannot download minecraft" post open beside the list | `node tools/showcase/shoot.mjs tools/showcase/scenes/atlas-support.json --only Tahoe --name forum --no-gallery` |
| Thread | chroma.pw `#sneak-peeks`, the "Your files" thread open in the side panel, the channel scrolled to its post | `node tools/showcase/shoot.mjs tools/showcase/scenes/chroma-thread.json --only Tahoe --name thread --no-gallery` |

The flavor-gallery run rewrites the gallery between the `screenshots` markers in README.md itself;
the other shots are referenced by hand in README.md ("Options" and "More screens").

If a post or thread a scene was written for is gone, pick a similar one, adjust the scene file in
`tools/showcase/scenes/` (its `_comment` says what each field does) and update the table above.

## Privacy in screenshots

Screenshots are public. Message texts, post titles and thread texts always come from the scene files;
names and avatars are shuffled among the people on screen, server icons are public servers'. Before
committing, check every image for leftover real text (bot cards, embeds, reply previews, placeholders,
the user panel) and fix `tools/showcase/demo.js` rather than the image. Captured data of real people
(`tools/showcase/data/`) stays local and out of git.

## Discord updates

Run `python3 tools/classes/check.py` after a Discord update; dead stems mean a renamed class to fix.
