// Screenshots of every flavor for the README, from the running Vesktop (debug port 9222).
//   node tools/showcase/shoot.mjs [scene.json] [--name chat] [--only Light]
// Applies the demo scene first (unless --no-demo), then for each flavor injects its settings,
// captures the window over a blurred wallpaper (CDP cannot see the native vibrancy), frames it
// as a macOS window and writes docs/screenshots/<name>-<flavor>.webp plus the README gallery.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const ROOT = new URL("../../", import.meta.url).pathname;
const HERE = ROOT + "tools/showcase/";
const OUT = ROOT + "docs/screenshots/";
const ASSETS = HERE + "assets/";
const TMP = ROOT + ".cache/shoot/";
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const scene = args.find(a => a.endsWith(".json")) ?? HERE + "scenes/atlas-programming.json";
const name = opt("--name", "chat");
const only = opt("--only");
[OUT, ASSETS, TMP].forEach(d => mkdirSync(d, { recursive: true }));

const run = (cmd, a) => execFileSync(cmd, a, { encoding: "utf8", maxBuffer: 64 << 20 }).trim();
const cdp = (...a) => run("node", [ROOT + "tools/cdp.mjs", ...a]);
const magick = (...a) => run("magick", a);

// Generated wallpaper (deep blue with soft glows), so the repo needs no Apple artwork.
const wall = ASSETS + "wallpaper.jpg";
if (!existsSync(wall)) magick("-size", "3840x2400", "xc:#050b1f",
  "(", "-size", "2800x2800", "radial-gradient:rgba(37,99,235,0.55)-rgba(37,99,235,0)", ")", "-geometry", "-500-1000", "-composite",
  "(", "-size", "2600x2600", "radial-gradient:rgba(14,116,233,0.38)-rgba(14,116,233,0)", ")", "-geometry", "+1900+800", "-composite",
  "(", "-size", "1800x1800", "radial-gradient:rgba(99,102,241,0.30)-rgba(99,102,241,0)", ")", "-geometry", "+2600-700", "-composite",
  "-quality", "92", wall);

const size = JSON.parse(cdp("eval", "({w: innerWidth, h: innerHeight, dpr: devicePixelRatio})"));
const W = size.w * size.dpr, H = size.h * size.dpr, PAD_X = Math.round(W * 0.06), PAD_Y = Math.round(H * 0.07);
const CW = W + PAD_X * 2, CH = H + PAD_Y * 2;
const canvas = TMP + "canvas.jpg";
magick(wall, "-resize", `${CW}x${CH}^`, "-gravity", "center", "-extent", `${CW}x${CH}`, canvas);

// What sits behind the window: the wallpaper under it, blurred and tinted like the vibrancy
// material (dark or light), passed to cdp.mjs as the capture backdrop.
const backdrop = light => {
  const file = TMP + (light ? "backdrop-light.jpg" : "backdrop-dark.jpg");
  magick(canvas, "-crop", `${W}x${H}+${PAD_X}+${PAD_Y}`, "+repage", "-resize", `${size.w}x${size.h}`, "-blur", "0x45",
    "-modulate", light ? "115,80" : "90,115", "-fill", light ? "rgb(236,238,242)" : "rgb(26,27,34)",
    "-colorize", light ? "62" : "35", "-quality", "85", file);
  return `url(data:image/jpeg;base64,${readFileSync(file).toString("base64")}) 0 0 / 100% 100% no-repeat`;
};

const flavors = [["Tahoe", ROOT + "theme/Tahoe.theme.css"],
  ...readdirSync(ROOT + "theme/flavors").filter(f => f.endsWith(".theme.css")).sort()
    .map(f => [f.replace(/^Tahoe-|\.theme\.css$/g, "").replace(/-/g, " "), ROOT + "theme/flavors/" + f])]
  .filter(([n]) => !only || n.toLowerCase() === only.toLowerCase());

if (!args.includes("--no-demo")) console.log(run("node", [HERE + "demo.mjs", scene]));

const radius = Math.round(15 * size.dpr), light = 12 * size.dpr / 2;
const shots = [];
for (const [flavor, file] of flavors) {
  // Vencord inserts the theme after injected styles, so the flavor needs more specificity to win.
  const settings = (readFileSync(file, "utf8").match(/:root\s*\{[\s\S]*?\n\}/)?.[0] ?? "").replace(/^:root/, "html:root:root");
  writeFileSync(TMP + "flavor.css", settings);
  cdp("css", TMP + "flavor.css");
  const raw = TMP + "raw.png";
  execFileSync("node", [ROOT + "tools/cdp.mjs", "shot", raw], { env: { ...process.env, BACKDROP: backdrop(/light/i.test(flavor)) } });
  // The native traffic lights and rounded window corner are outside the page, so they're drawn.
  const lights = [17, 39, 61].flatMap((x, i) => ["-fill", ["#ff5f57", "#febc2e", "#28c840"][i],
    "-draw", `circle ${x * size.dpr},${17 * size.dpr} ${x * size.dpr + light},${17 * size.dpr}`]);
  const win = TMP + "win.png";
  magick(raw, ...lights, "(", "+clone", "-alpha", "extract", "-fill", "black", "-colorize", "100",
    "-fill", "white", "-draw", `roundrectangle 0,0 ${W - 1},${H - 1} ${radius},${radius}`, ")",
    "-alpha", "off", "-compose", "copy_opacity", "-composite", win);
  const slug = flavor.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const out = `${OUT}${name}-${slug}.webp`;
  magick(canvas, "(", win, "(", "+clone", "-background", "black", "-shadow", "45x40+0+30", ")", "+swap",
    "-background", "none", "-layers", "merge", "+repage", ")", "-gravity", "center", "-geometry", "+0+0",
    "-compose", "over", "-composite", "-resize", "2400x", "-quality", "88", out);
  shots.push([flavor, `docs/screenshots/${name}-${slug}.webp`]);
  console.log("shot", flavor);
}
cdp("css", "-");

// README gallery between the markers: the default flavor large, the others in a grid.
const readme = ROOT + "README.md";
const [hero, ...rest] = shots[0]?.[0] === "Tahoe" ? shots : [null, ...shots];
const grid = rest.reduce((rows, s, i) => (i % 2 ? rows[rows.length - 1].push(s) : rows.push([s]), rows), [])
  .map(r => "| " + r.map(([f, p]) => `<img src="${p}" alt="${f}"><br>${f}`).join(" | ") + (r.length < 2 ? " | |" : " |")).join("\n");
const gallery = (hero ? `![Tahoe](${hero[1]})\n\n` : "") + (grid ? "| | |\n|---|---|\n" + grid + "\n" : "");
let md = readFileSync(readme, "utf8");
const start = "<!-- screenshots:start -->", end = "<!-- screenshots:end -->";
md = md.includes(start)
  ? md.replace(new RegExp(`${start}[\\s\\S]*?${end}`), `${start}\n${gallery}${end}`)
  : md.replace(/\n## Install on a device/, `\n${start}\n${gallery}${end}\n\n## Install on a device`);
writeFileSync(readme, md);
console.log(`${shots.length} screenshots, README gallery updated`);
