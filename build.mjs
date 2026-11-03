// Bundles src/ into build/tahoe.css (what the theme imports from GitHub Pages) and writes
// build/Tahoe.local.theme.css, the theme file with the bundle inlined instead of imported, which
// install.ps1 copies into Equicord: it works offline and shows local changes before they are
// published.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "src"), BUILD = join(ROOT, "build"), THEME = join(ROOT, "theme", "Tahoe.theme.css");
const IMPORT = /^@import\s+"([^"]+)";\s*$/gm;
const THEME_IMPORT = /^@import url\([^)]*tahoe\.css[^)]*\);\s*$/m;

// git may check the sources out with CRLF; the build is written with LF either way
const read = path => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

const modules = [...read(join(SRC, "main.css")).matchAll(IMPORT)].map(m => read(join(SRC, m[1])).trimEnd() + "\n");
const css = "/* tahoe: built from src/ by build.mjs, do not edit */\n" + modules.join("\n");
mkdirSync(BUILD, { recursive: true });
writeFileSync(join(BUILD, "tahoe.css"), css);

const theme = read(THEME);
if (!THEME_IMPORT.test(theme)) throw new Error("theme/Tahoe.theme.css has no @import of tahoe.css to inline");
writeFileSync(join(BUILD, "Tahoe.local.theme.css"), theme.replace(THEME_IMPORT, () => css));
console.log(`build/tahoe.css ${css.length >> 10} KB`);
