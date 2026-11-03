// Checks the Discord classes src/*.css targets against a public dump of Discord's current classes
// (itmesarah/DiscordClasses): stems that match no class any more are dead after a Discord update,
// so a renamed class needs fixing. Exits 1 on dead stems.
//   node tools/check-classes.mjs            # against Stable, dump cached for 6 h in .cache/
//   node tools/check-classes.mjs --canary   # against Canary, to see what is coming
//   node tools/check-classes.mjs --refresh  # download the dump again
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const channel = process.argv.includes("--canary") ? "canary" : "stable";
const cache = join(ROOT, ".cache", `${channel}classes.json`);
const url = `https://raw.githubusercontent.com/itmesarah/DiscordClasses/main/${channel}classes.json`;

if (process.argv.includes("--refresh") || !existsSync(cache) || Date.now() - statSync(cache).mtimeMs > 6 * 3600e3) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    JSON.parse(text);
    mkdirSync(dirname(cache), { recursive: true });
    writeFileSync(cache, text);
  } catch (e) {
    if (!existsSync(cache)) throw new Error(`cannot download the ${channel} class dump: ${e.message}`);
    console.warn(`warning: using the stale cached ${channel} dump (${e.message})`);
  }
}
const dump = JSON.parse(readFileSync(cache, "utf8"));
const classes = new Set();
for (const module of Object.values(dump)) {
  // composed values like "dot_abc dotNormal_abc" hold several real classes
  if (module && typeof module === "object") for (const v of Object.values(module)) if (typeof v === "string") v.split(/\s+/).forEach(c => classes.add(c));
}
const all = [...classes];

// [class*="stem"] in any quoting; comments are blanked but keep their newlines, so lines stay right
const ATTR = /\[\s*class\s*\*=\s*(?:"([^"\\]*)"|'([^'\\]*)'|([\w-]+))\s*\]/g;
const where = new Map();
for (const file of readdirSync(join(ROOT, "src")).filter(f => f.endsWith(".css"))) {
  const text = readFileSync(join(ROOT, "src", file), "utf8").replace(/\/\*[\s\S]*?\*\//g, c => c.replace(/[^\n]/g, " "));
  text.split("\n").forEach((line, i) => {
    for (const m of line.matchAll(ATTR)) {
      const stem = m[1] ?? m[2] ?? m[3];
      where.set(stem, [...(where.get(stem) ?? []), `${file}:${i + 1}`]);
    }
  });
}
// Kebab-case and plain lowercase stems (vc-card, hljs, custom-theme) can be Equicord's or
// unhashed classes outside the dump, so only hashed-module stems count as dead.
const isModuleStem = s => !s.includes("-") && !s.includes("/") && (s.includes("_") || s !== s.toLowerCase());
const dead = [], unchecked = [];
for (const [stem, places] of [...where].sort((a, b) => a[0].localeCompare(b[0]))) {
  if (all.some(c => c.includes(stem))) continue;
  (isModuleStem(stem) ? dead : unchecked).push(`${stem} (${places.slice(0, 4).join(", ")}${places.length > 4 ? ", ..." : ""})`);
}
console.log(`${where.size} stems checked against ${classes.size} classes of Discord ${channel} ${JSON.stringify(dump.channel ?? "")}`);
console.log(`\ndead, match nothing (${dead.length}):\n` + (dead.map(d => "  " + d).join("\n") || "  none"));
console.log(`\nnot in the dump, unhashed or from Equicord, not checked (${unchecked.length}):\n  ` + (unchecked.join(", ") || "none"));
process.exit(dead.length ? 1 : 0);
