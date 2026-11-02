// Drives the running Vesktop over CDP: screenshots, live CSS, JS eval.
// Vesktop must run with --remote-debugging-port=9222.
import { readFileSync, writeFileSync } from "node:fs";

const PORT = process.env.CDP_PORT ?? 9222;
const [cmd, ...args] = process.argv.slice(2);

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

switch (cmd) {
  case "shot": {
    // shot <out.png> [css selector]
    const [out = "shot.png", sel] = args;
    let clip;
    if (sel) {
      const b = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(sel)})?.getBoundingClientRect();
        return r && { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);
      if (!b) throw new Error(`no element for ${sel}`);
      clip = { ...b, scale: 1 };
    }
    // CDP can't see the native macOS vibrancy, so transparent areas get a stand-in
    // blurred-wallpaper gradient just for the capture (BACKDROP=none to skip).
    const backdrop = process.env.BACKDROP ?? "radial-gradient(at 15% 20%,#5b6e8f,transparent 55%),radial-gradient(at 80% 85%,#6b5641,transparent 55%),linear-gradient(150deg,#3f4a5c,#4a4036 60%,#2f3a33)";
    if (backdrop !== "none") await evaluate(`(() => { const s = document.createElement("style"); s.id = "__dev_backdrop";
      s.textContent = "html:root:root{background:" + ${JSON.stringify(backdrop)} + " !important}"; document.head.append(s); })()`);
    await new Promise(r => setTimeout(r, 150));
    const { data } = await send("Page.captureScreenshot", { format: "png", ...(clip && { clip }) });
    await evaluate(`document.getElementById("__dev_backdrop")?.remove()`);
    writeFileSync(out, Buffer.from(data, "base64"));
    console.log(out);
    break;
  }
  case "css": {
    // css <file|-> : injects into a dev <style>, replacing the previous one; "-" removes it
    const css = args[0] === "-" ? "" : readFileSync(args[0], "utf8");
    await evaluate(`(() => { let s = document.getElementById("__dev_theme");
      if (!s) { s = document.createElement("style"); s.id = "__dev_theme"; document.head.append(s); }
      s.textContent = ${JSON.stringify(css)}; })()`);
    console.log("ok");
    break;
  }
  case "eval": {
    const v = await evaluate(args.join(" "));
    console.log(typeof v === "string" ? v : JSON.stringify(v, null, 2));
    break;
  }
  case "key": {
    // key <Escape|Enter|...> [ctrl]: renderer-level key press, no OS focus involved
    const [key, mod] = args;
    const codes = { Escape: 27, Enter: 13, k: 75 };
    const modifiers = mod === "ctrl" ? 2 : mod === "meta" ? 4 : 0;
    const base = { key, code: key.length === 1 ? "Key" + key.toUpperCase() : key, windowsVirtualKeyCode: codes[key] ?? key.toUpperCase().charCodeAt(0), modifiers };
    await send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...base });
    await send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
    console.log("ok");
    break;
  }
  case "click": {
    // click <x> <y>: renderer-level mouse click in CSS px
    const [x, y] = args.map(Number);
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
    console.log("ok");
    break;
  }
  default:
    console.log("usage: cdp.mjs shot <out.png> [selector] | css <file|-> | eval <js>");
}
ws.close();
