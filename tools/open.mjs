// Small UI drivers for checking screens: node tools/open.mjs <what>. Uses cdp.mjs eval/key.
import { execFileSync } from "node:child_process";
const cdp = (...a) => execFileSync("node", [new URL("./cdp.mjs", import.meta.url).pathname, ...a], { encoding: "utf8" }).trim();
const what = process.argv[2];
const js = {
  // right-click the last message
  msgmenu: `(() => { const m=[...document.querySelectorAll('[id^=chat-messages-] [class*=contents_]')].pop(); const r=m.getBoundingClientRect(); m.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:r.x+200,clientY:r.y+10})); return 'ok' })()`,
  // right-click a channel in the list
  chanmenu: `(() => { const c=document.querySelectorAll('[class*=sidebarList_] li[class*=containerDefault_] a')[3]; const r=c.getBoundingClientRect(); c.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:r.x+40,clientY:r.y+10})); return 'ok' })()`,
  // click the avatar of the last message author
  profile: `(() => { const a=[...document.querySelectorAll('[id^=chat-messages-] img[class*=avatar_]')].pop(); a.click(); return 'ok' })()`,
  emoji: `(() => { document.querySelector('[class*=channelTextArea_] [class*=emojiButton_] button, [class*=channelTextArea_] [aria-label*=emoji i]').click(); return 'ok' })()`,
  settings: `(() => { document.querySelector('[class*=panels_] button[aria-label*=Settings], [class*=panels_] [aria-label="User Settings"]').click(); return 'ok' })()`,
  inbox: `(() => { document.querySelector('[class*=trailing_] [class*=clickable_]').click(); return 'ok' })()`,
  tooltip: `(() => { const b=document.querySelector('[class*=toolbar_] [class*=iconWrapper_]'); b.dispatchEvent(new MouseEvent('mouseover',{bubbles:true})); b.dispatchEvent(new MouseEvent('mouseenter',{bubbles:false})); return 'ok' })()`,
}[what];
if (what === "esc") console.log(cdp("key", "Escape"));
else if (what === "switcher") console.log(cdp("key", "k", "meta"));
else if (js) console.log(cdp("eval", js));
else console.log("usage: open.mjs msgmenu|chanmenu|profile|emoji|settings|inbox|tooltip|switcher|esc");
