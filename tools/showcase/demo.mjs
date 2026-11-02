// Applies a demo scene to the running Vesktop: node tools/showcase/demo.mjs <scene.json>
// Server icons come from tools/showcase/data/server-icons.json (collected locally, not in git).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const here = new URL(".", import.meta.url).pathname;
const sceneFile = process.argv.slice(2).find(a => a.endsWith(".json"));
const scene = JSON.parse(readFileSync(sceneFile ?? here + "scenes/atlas-programming.json", "utf8"));
const iconsFile = here + "data/server-icons.json";
const icons = existsSync(iconsFile) ? JSON.parse(readFileSync(iconsFile, "utf8")).icons.filter(i => i.name) : [];
const js = `window.__vgScene = ${JSON.stringify(scene)}; window.__vgIcons = ${JSON.stringify(icons)};\n` +
  `window.__vgKeepPanelArt = ${process.argv.includes("--keep-panel-art")};\n` +
  readFileSync(here + "demo.js", "utf8");
console.log(execFileSync("node", [here + "../cdp.mjs", "eval", js], { encoding: "utf8" }).trim());
