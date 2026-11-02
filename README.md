# Tahoe: macOS Tahoe glass for Vesktop

A Vencord theme for Vesktop on macOS: a floating glass sidebar over the native window vibrancy,
SF Symbols in menus and toolbars, liquid-glass controls and radii concentric with the window corner.

## Install on a device

1. Vesktop settings: **Vencord > Settings**, turn on *transparent window*, set *macOS vibrancy* to
   `sidebar`, restart Vesktop.
2. Put [`theme/Tahoe.theme.css`](theme/Tahoe.theme.css) in the themes folder
   (**Vencord > Themes > Open Themes Folder**) and enable it, or one of the
   [flavors](theme/flavors/README.md) instead.

The theme file only imports `build/tahoe.css` from GitHub Pages and holds your settings, so every
device picks up new versions on its own.

## Options

Set in the `:root` block of the theme file; every option is `on` or `off`.

| Option | Default | Effect |
|---|---|---|
| `--vg-animations` | on | off: transitions and motion jump to their end state |
| `--vg-sf-symbols` | on | off: Discord's own icons instead of SF Symbols |
| `--vg-vibrancy` | on | off: solid window and sidebar, no desktop showing through |
| `--vg-background-image` | off | on: `--vg-background-image-url` as the window background; menus become real blurred glass |
| `--vg-panel-art` | on | off: hides Nitro artwork and avatar decoration in the user panel |
| `--vg-compact` | off | on: shorter rows in the channel list, member list and menus |
| `--vg-scroll-fade` | on | off: lists end in a hard edge instead of fading under the bars |

Colours (`--vg-accent`, `--vg-tint`, `--vg-window`, `--vg-panel`…), geometry and fonts are below the
options in the same block; [`src/tokens.css`](src/tokens.css) lists every token with its default.
Options are style container queries (`@container style(--vg-x: off)`), see
[`src/options.css`](src/options.css).

## Flavors

Ready-made palettes in [`theme/flavors/`](theme/flavors/README.md): Catppuccin Mocha and Macchiato,
Nord, Tokyo Night, Rosé Pine, Everforest, Gruvbox Dark, Graphite, Midnight and Light. Each is a full
theme file with the same import and its own tokens.

## Layout

| Path | What |
|---|---|
| `theme/Tahoe.theme.css` | the file you install: import + settings |
| `theme/flavors/` | the same with other palettes |
| `src/main.css` | the module list, in cascade order |
| `src/*.css` | the modules: `tokens`, `palette` (Discord's variables), `base`, `layout`, `titlebar`, `sidebar`, `toolbar`, `chat`, `people`, `floating` (menus, popouts, modals, settings), `controls`, `serverlist`, `composer`, `media` (image viewer), `threads` (threads and forums), `forms` (settings controls), `notices`, `store` (Nitro, Shop, Discover), `calls`, `options`, `icons` (generated) |
| `build/tahoe.css` | the bundle served by GitHub Pages; commit it after every change |
| `build.py` | builds the bundle, and `build/Tahoe.local.theme.css` for local development |
| `tools/sf/` | SF Symbols: `icons.json` maps Discord selectors to symbol names, `build.py` renders them into `src/icons.css` |
| `tools/classes/` | `check.py` (Discord class checker), `benchmark.mjs` (style cost in the running Vesktop) |
| `tools/reload.sh` | build and load the local version into Vesktop |
| `tools/cdp.mjs` | screenshots, CSS injection and JS in the running Vesktop |
| `docs/discord-variables.txt` | Discord's CSS variables and their default values |

## Develop

```sh
open -g -a Vesktop --args --remote-debugging-port=9222   # for tools/cdp.mjs and the benchmark
python3 tools/sf/build.py                                # after editing tools/sf/icons.json
tools/reload.sh                                          # rebuild and reload in Vesktop
python3 tools/classes/check.py                           # after a Discord update
```

`tools/reload.sh` links `build/Tahoe.local.theme.css` (bundle inlined, no network) into Vesktop
under the same name, so the enabled theme switches to your working copy.

**Class checker.** Selectors match Discord's hashed classes by stem (`[class*="listItem_"]`), which
survives the hash changing but not a rename. `check.py` compares every stem with a public dump of
Discord's current classes (`--canary` for what is coming) and lists dead stems (exit 1) and overly
broad ones.

**Performance.** `node tools/classes/benchmark.mjs` forces full-document style recalcs with no theme,
the normal build and `build.py --exact` (stems rewritten to exact class lists). Measured on a
6k-element page: no theme ≈100 ms per full recalc, the normal build ≈210 ms, `--exact` ≈350 ms,
because long `:is(.a,.b,…)` lists escape Chromium's class index while substring matches stay cheap.
So the published bundle uses the normal build; `--exact` stays as an experiment.

## Publish

Commit `src/` and `build/`, push; GitHub Pages serves the repository (branch `main`, folder `/`).
Vencord only loads remote CSS from a few hosts, and only GitHub Pages serves it as `text/css`;
`raw.githubusercontent.com` is `text/plain` with `nosniff`, which Chromium refuses as a stylesheet.
