# Tahoe: macOS Tahoe glass for Vesktop

A Vencord theme for Vesktop on macOS: a floating glass sidebar over the native window vibrancy,
SF Symbols in menus and toolbars, liquid-glass controls and radii concentric with the window corner.

## Install on a device

1. Vesktop settings: **Vencord > Settings**, turn on *transparent window*, set *macOS vibrancy* to
   `sidebar`, restart Vesktop.
2. Put [`theme/Tahoe.theme.css`](theme/Tahoe.theme.css) in the themes folder
   (**Vencord > Themes > Open Themes Folder**) and enable it.

That file only imports `build/tahoe.css` from GitHub Pages and holds your settings, so every device
picks up new versions on its own. Change the variables in it per device.

## Layout

| Path | What |
|---|---|
| `theme/Tahoe.theme.css` | the file you install: import + settings |
| `src/main.css` | the module list, in cascade order |
| `src/*.css` | the modules: `tokens` (all variables and defaults), `palette` (Discord's variables), `base`, `layout` (window and floating panels), `titlebar`, `sidebar` (servers, channels, user panel), `toolbar` (chat header), `chat` (messages, input), `people` (members, profiles, friends), `floating` (menus, popouts, modals, settings), `controls` (buttons, inputs, switches), `icons` (generated) |
| `build/tahoe.css` | the bundle served by GitHub Pages; commit it after every change |
| `build.py` | builds the bundle, and `build/Tahoe.local.theme.css` for local development |
| `tools/sf/` | SF Symbols: `icons.json` maps Discord selectors to symbol names, `build.py` renders them into `src/icons.css` |
| `tools/reload.sh` | build and load the local version into Vesktop |
| `tools/cdp.mjs` | screenshots, CSS injection and JS in the running Vesktop (needs `--remote-debugging-port=9222`) |
| `docs/discord-variables.txt` | Discord's CSS variables and their default values |

## Develop

```sh
open -g -a Vesktop --args --remote-debugging-port=9222   # only if you want tools/cdp.mjs
python3 tools/sf/build.py                                # after editing tools/sf/icons.json
tools/reload.sh                                          # rebuild and reload in Vesktop
```

`tools/reload.sh` links `build/Tahoe.local.theme.css` (bundle inlined, no network) into Vesktop under
the same name, so the enabled theme switches to your working copy. Put the installed file back to
return to the published version.

## Publish

Commit `src/` and `build/`, push, and serve the repository with GitHub Pages (Settings > Pages,
branch `main`, folder `/`). Vencord only loads remote CSS from a few hosts, GitHub Pages among them,
and Pages needs a public repository on a free plan.
