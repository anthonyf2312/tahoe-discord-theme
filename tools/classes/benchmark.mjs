// Measures what the theme costs Discord's style recalculation in the running Vesktop (CDP on
// 127.0.0.1:9222): no theme, the default build ([class*=] selectors) and the build.py --exact one.
//   node tools/classes/benchmark.mjs [rounds=5] [recalcs per round=20]
// The installed theme is switched off while it runs and put back at the end.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const ROOT = new URL("../../", import.meta.url).pathname;
const PORT = process.env.CDP_PORT ?? 9222;
const [ROUNDS = 5, RECALCS = 20] = process.argv.slice(2).map(Number);

const build = (...flags) => execFileSync("python3", [ROOT + "build.py", "--stdout", ...flags],
  { encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "inherit"] });
const variants = { off: "", attr: build(), exact: build("--exact") };

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const page = targets.find(t => t.type === "page" && t.url.startsWith("https://discord.com"));
if (!page) throw new Error("Discord page not found");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((ok, err) => { ws.onopen = ok; ws.onerror = err; });
let id = 0;
const pending = new Map();
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
const send = (method, params = {}) => new Promise((ok, err) => {
  const i = ++id;
  pending.set(i, m => m.error ? err(new Error(method + ": " + m.error.message)) : ok(m.result));
  ws.send(JSON.stringify({ id: i, method, params }));
});
const evaluate = async expr => {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
const metric = async name => (await send("Performance.getMetrics")).metrics.find(m => m.name === name)?.value ?? 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// In the page: switch off whatever sheet loads Tahoe (Vencord's themes <style> imports it), add
// the variant under test, and a rule that makes toggling a class on <html> dirty every element.
const SETUP = `(() => {
  const mentions = sheet => { try { return [...sheet.cssRules].some(r => r.href?.toLowerCase().includes("tahoe")
    || (r.styleSheet && mentions(r.styleSheet)) || r.cssText.includes("--vg-")); } catch { return false; } };
  const theme = [...document.querySelectorAll("style, link[rel=stylesheet]")].filter(n => !n.id.startsWith("__bench")
    && n.sheet && !n.sheet.disabled && (/tahoe/i.test(n.href ?? n.textContent) || mentions(n.sheet)));
  theme.forEach(n => n.sheet.disabled = true);
  const style = id => document.getElementById(id) ?? document.head.appendChild(Object.assign(document.createElement("style"), { id }));
  style("__bench_flip").textContent = "html.__bench_flip * { --bench-flip: 1; }";
  const css = style("__bench_css");
  window.__bench = {
    theme,
    apply(text) { const t = performance.now(); css.textContent = text; getComputedStyle(document.body).color; return performance.now() - t; },
    recalc(n) {
      const t = performance.now();
      for (let i = 0; i < n; i++) { document.documentElement.classList.toggle("__bench_flip"); getComputedStyle(document.body).color; }
      return (performance.now() - t) / n;
    },
    restore() {
      document.documentElement.classList.remove("__bench_flip");
      document.querySelectorAll("#__bench_css, #__bench_flip").forEach(n => n.remove());
      theme.forEach(n => n.sheet && (n.sheet.disabled = false));
      delete window.__bench;
    },
  };
  return { disabled: theme.map(n => n.id || n.href || n.tagName), elements: document.getElementsByTagName("*").length };
})()`;

const restore = () => evaluate(`window.__bench?.restore()`);
process.on("SIGINT", async () => { await restore().catch(() => {}); process.exit(130); });

const results = Object.fromEntries(Object.keys(variants).map(v => [v, { apply: [], js: [], style: [] }]));
try {
  await send("Performance.enable");
  const info = await evaluate(SETUP);
  console.log(`theme sheets switched off: ${info.disabled.join(", ") || "none found"}; ${info.elements} elements`);
  await evaluate(`window.__benchCss = ${JSON.stringify(variants)}`);
  // rounds interleave the variants, so drift in what Discord is doing spreads over all of them
  for (let r = 0; r < ROUNDS; r++) {
    for (const v of Object.keys(variants)) {
      results[v].apply.push(await evaluate(`__bench.apply(__benchCss[${JSON.stringify(v)}])`));
      await sleep(300);
      await evaluate(`__bench.recalc(3)`);
      const [d0, c0] = [await metric("RecalcStyleDuration"), await metric("RecalcStyleCount")];
      results[v].js.push(await evaluate(`__bench.recalc(${RECALCS})`));
      const [d1, c1] = [await metric("RecalcStyleDuration"), await metric("RecalcStyleCount")];
      results[v].style.push((d1 - d0) * 1000 / Math.max(1, c1 - c0));
    }
    process.stdout.write(`round ${r + 1}/${ROUNDS}\r`);
  }

  // The exact build only knows the classes in the dump; a live class it lacks means a miss.
  const map = ROOT + ".cache/exact-map.json";
  if (existsSync(map)) {
    const { stems } = JSON.parse(readFileSync(map, "utf8"));
    const live = await evaluate(`[...new Set([...document.querySelectorAll("[class]")].flatMap(e => e.getAttribute("class").split(/\\s+/)))]`);
    const missed = Object.entries(stems).flatMap(([stem, known]) =>
      live.filter(c => c.includes(stem) && !known.includes(c)).map(c => `${stem} -> ${c}`));
    console.log(missed.length ? `exact build misses live classes:\n  ${missed.join("\n  ")}`
      : `exact build covers all ${live.length} classes on screen`);
  }
} finally {
  await restore().catch(e => console.error("restore failed, reload Vesktop:", e.message));
  await send("Performance.disable").catch(() => {});
  ws.close();
}

const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const base = mean(results.off.style);
console.log(`\n${ROUNDS} rounds x ${RECALCS} full-document style recalcs`);
console.log(["variant", "size KB", "apply ms", "recalc ms", "style ms", "vs off"].map(s => s.padStart(10)).join(""));
for (const [v, r] of Object.entries(results)) {
  const style = mean(r.style);
  console.log([v, (variants[v].length / 1024).toFixed(0), mean(r.apply).toFixed(1), mean(r.js).toFixed(2),
    style.toFixed(2), v === "off" ? "" : (style >= base ? "+" : "") + (style - base).toFixed(2)].map(s => String(s).padStart(10)).join(""));
}
console.log("apply: parse + first recalc after switching; recalc: JS wall time; style: Blink's RecalcStyleDuration per recalc");
