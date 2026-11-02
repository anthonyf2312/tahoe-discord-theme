// Fills the open channel with an invented conversation and swaps the server icons on the left,
// for showcase screenshots. Only the live DOM changes; reloading the window (Cmd+R) restores it.
// Run in the page (node tools/cdp.mjs eval "$(cat tools/showcase/demo.js)") with a text
// channel open that has a plain message, a continued message, a reply and an image.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Discord's hashed class names, looked up from its stylesheets so the demo uses its real styles.
  const sheetText = $$("style, link[rel=stylesheet]").length && [...document.styleSheets].flatMap(s => {
    try { return [...s.cssRules].map(r => r.cssText) } catch { return [] }
  }).join("\n");
  const cls = (name, sibling) => {
    const re = new RegExp("\\.(" + name + "_[_a-z0-9]{5,7})(?![\\w-])", "g");
    const all = [...sheetText.matchAll(re)].map(m => m[1]);
    if (!sibling) return all[0] || "";
    const suffix = (sheetText.match(new RegExp("\\." + sibling + "(_[_a-z0-9]{5,7})(?![\\w-])")) || [])[1];
    return suffix ? name + suffix : all[0] || "";
  };

  // --- generated artwork -------------------------------------------------------------
  const uri = svg => "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  const grad = (id, a, b, x2 = 1, y2 = 1) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  const font = `font-family="-apple-system, 'SF Pro Display', Helvetica, sans-serif"`;
  const avatar = (initials, a, b) => uri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs>${grad("g", a, b)}</defs>` +
    `<rect width="96" height="96" fill="url(#g)"/>` +
    `<text x="48" y="61" ${font} font-size="36" font-weight="600" fill="white" text-anchor="middle">${initials}</text></svg>`);
  const icon = (glyph, a, b) => uri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs>${grad("g", a, b)}` +
    `<radialGradient id="s" cx="0.3" cy="0.2" r="0.8"><stop offset="0" stop-color="white" stop-opacity="0.45"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="96" height="96" fill="url(#g)"/><rect width="96" height="96" fill="url(#s)"/>` +
    `<text x="48" y="64" ${font} font-size="44" font-weight="600" fill="white" text-anchor="middle">${glyph}</text></svg>`);
  const blobs = (w, h, cols, extra = "") => uri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice"><defs>` +
    `${grad("bg", cols[0], cols[1])}<filter id="b"><feGaussianBlur stdDeviation="${Math.round(w / 14)}"/></filter></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#bg)"/><g filter="url(#b)">` +
    `<circle cx="${w * .22}" cy="${h * .3}" r="${h * .42}" fill="${cols[2]}"/>` +
    `<circle cx="${w * .7}" cy="${h * .75}" r="${h * .5}" fill="${cols[3]}"/>` +
    `<circle cx="${w * .85}" cy="${h * .15}" r="${h * .3}" fill="${cols[4]}"/></g>${extra}</svg>`);

  // Profile pictures come from people already in the channel, so the chat looks lived-in;
  // names and text are invented.
  const realAvatars = [...new Set([
    ...$$("li[id^='chat-messages-']:not([data-vg]) [class*=contents_] > img[class*=avatar_]").map(i => i.src),
    ...$$("[class*=membersWrap_] img[class*=avatar_]").map(i => i.src),
  ])];
  const av = (i, fallback) => realAvatars[i] || fallback;
  const people = {
    milo: { name: "milo", color: "#64d2ff", av: av(0, avatar("M", "#0a84ff", "#64d2ff")) },
    nova: { name: "nova", color: "#ff9f0a", av: av(1, avatar("N", "#ff9f0a", "#ff375f")) },
    kenji: { name: "kenji", color: "", av: av(2, avatar("K", "#5ac8fa", "#5e5ce6")) },
    alex: { name: "alex", color: "#bf5af2", av: av(3, avatar("A", "#5e5ce6", "#bf5af2")) },
    lea: { name: "lea.m", color: "", av: av(4, avatar("L", "#ff375f", "#ff9f0a")) },
    theo: { name: "theo", color: "#30d158", av: av(5, avatar("T", "#30d158", "#64d2ff")) },
  };


  const hues = [["#0a84ff", "#5e5ce6"], ["#ff9f0a", "#ff375f"], ["#30d158", "#64d2ff"], ["#bf5af2", "#ff375f"],
    ["#5ac8fa", "#0a84ff"], ["#ffd60a", "#ff9f0a"], ["#ff375f", "#bf5af2"], ["#64d2ff", "#30d158"]];

  // --- hide the real messages ---------------------------------------------------------
  $("#__vgdemo_css")?.remove();
  const css = document.createElement("style");
  css.id = "__vgdemo_css";
  css.textContent = `
    ol[class*="scrollerInner_"] > li[id^="chat-messages-"]:not([data-vg]),
    ol[class*="scrollerInner_"] > [class*="divider_"]:not([data-vg]) { display: none !important; }
  `;
  document.head.append(css);

  // --- server list ---------------------------------------------------------------------
  const glyphs = ["A", "✦", "◐", "☁︎", "⌘", "♫", "☀︎", "✿", "◆", "⚑", "☾", "▲"];
  $$("nav[class*=guilds_] img[class*=icon_]").forEach((img, i) => {
    const [a, b] = hues[i % hues.length];
    img.srcset = ""; img.src = icon(glyphs[i % glyphs.length], a, b);
  });
  $$("nav[class*=guilds_] [class*=folderPreviewGuildIcon_]").forEach((el, i) => {
    const [a, b] = hues[(i + 3) % hues.length];
    el.style.backgroundImage = `url("${icon(glyphs[(i + 5) % glyphs.length], a, b)}")`; el.textContent = "";
  });
  $$("nav[class*=guilds_] [class*=acronym_]").forEach((el, i) => { el.textContent = ["Ps", "K", "Lab", "Q"][i % 4]; });
  $$("nav[class*=guilds_] [class*=numberBadge_]").forEach((el, i) => { el.textContent = ["3", "12", "1"][i % 3]; });

  // --- messages ------------------------------------------------------------------------
  const list = $("ol[class*=scrollerInner_]");
  const real = $$("li[id^='chat-messages-']:not([data-vg])", list);
  const hasHeader = li => li.querySelector("h3[class*=header_]");
  const hasImg = li => li.querySelector("[class*=mosaicItem_], [class*=imageWrapper_]");
  const tpl = {
    head: real.find(li => hasHeader(li) && !li.querySelector("[class*=repliedMessage_]") && !hasImg(li)),
    cont: real.find(li => !hasHeader(li) && !hasImg(li)),
    reply: real.find(li => li.querySelector("[class*=repliedMessage_]")),
    image: real.find(li => hasHeader(li) && hasImg(li)),
  };
  const missing = Object.entries(tpl).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) return "missing message templates: " + missing.join(", ");
  const dividerTpl = $("[class*=divider_][class*=hasContent_]", list);

  const mentionWrap = (sheetText.match(/\.(wrapper_[a-z0-9]{5,7}) \{ background: var\(--mention-background\)/) || [])[1];
  const mentionCls = ($("[id^=chat-messages-] .mention") || {}).className || `mention ${mentionWrap || ""} interactive`;
  const anchorCls = ($("[id^=chat-messages-] a[class*=anchor_]") || {}).className || "";
  const mention = t => `<span class="${mentionCls}" role="button">${t}</span>`;
  const md = cls("blockquoteContainer").replace("blockquoteContainer", "");

  const clone = (li) => {
    const c = li.cloneNode(true);
    c.setAttribute("data-vg", "");
    c.querySelector("[id^=message-accessories]")?.setAttribute("data-vg-acc", "");
    [c, ...c.querySelectorAll("[id]")].forEach(e => e.removeAttribute("id"));
    $$("[aria-labelledby], [aria-describedby]", c).forEach(e => { e.removeAttribute("aria-labelledby"); e.removeAttribute("aria-describedby"); });
    $$("img[class*=avatarDecoration], [class*=roleIcon], [class*=newMemberBadge], [class*=clanTag], [class*=chiplet], [class*=nameplate]", c).forEach(e => e.closest("span:not([class*=headerText_])") ? e.closest("span:not([class*=headerText_])").remove() : e.remove());
    return c;
  };
  // Only the message's own header: replies carry a second avatar and username in their preview.
  const setAuthor = (c, p, time) => {
    const av = $(":scope [class*=contents_] > img[class*=avatar_]", c); if (av) { av.srcset = ""; av.src = p.av; }
    const u = $("h3[class*=header_] [class*=username_]", c);
    if (u) {
      u.textContent = p.name; u.setAttribute("data-text", p.name);
      u.className = u.className.split(" ").filter(x => !/Gradient|Glow|desaturate/.test(x)).join(" ");
      u.style.cssText = `color:${p.color}`;
      [...u.parentElement.children].forEach(s => { if (s !== u) s.remove(); });
    }
    const t = $("time", c);
    if (t) { const sep = $("i", t); t.textContent = ""; if (sep) t.append(sep); t.append(time); }
    $$("[class*=timestamp_] [class*=hiddenVisually_]", c).forEach(e => e.remove());
  };
  // The reply preview also carries a messageContent class, so the message's own text is the last one.
  const content = (c, html) => { const m = $$("[class*=messageContent_]:not([class*=repliedTextContent_])", c).pop(); if (m) m.innerHTML = html; };
  const accessories = c => { const a = $("[data-vg-acc]", c); a.innerHTML = ""; return a; };

  const head = (p, time, html, extra = "") => { const c = clone(tpl.head); setAuthor(c, p, time); content(c, html); if (extra) accessories(c).innerHTML = extra; return c; };
  const cont = (html, extra = "") => { const c = clone(tpl.cont); content(c, html); if (extra) accessories(c).innerHTML = extra; return c; };
  const reply = (p, time, html, to, toText, extra = "") => {
    const c = clone(tpl.reply); setAuthor(c, p, time); content(c, html);
    const rm = $("[class*=repliedMessage_]", c);
    rm.setAttribute("aria-label", `${p.name} replying to ${to.name}`);
    const rav = $("img[class*=replyAvatar_]", rm); if (rav) { rav.srcset = ""; rav.src = to.av; }
    $$("[class*=copyOnlyText_], [class*=chiplet]", rm).forEach(e => (e.closest("span:not([class*=username_])") || e).remove());
    const ru = $("[class*=username_]", rm);
    if (ru) {
      ru.textContent = "@" + to.name; ru.setAttribute("data-text", "@" + to.name);
      ru.className = ru.className.split(" ").filter(x => !/Gradient|Glow|desaturate/.test(x)).join(" ");
      ru.style.cssText = `color:${to.color}`;
    }
    const rt = $("[class*=repliedTextContent_]", rm); if (rt) rt.innerHTML = toText;
    if (extra) accessories(c).innerHTML = extra;
    return c;
  };
  const image = (p, time, html, art) => {
    const c = clone(tpl.image); setAuthor(c, p, time); content(c, html);
    $$("img:not([class*=avatar])", $("[class*=mosaicItem_], [class*=imageWrapper_]", c).closest("div[class*=container_]") || c).forEach(img => {
      if (img.closest("[class*=header_]") || img.closest("[class*=contents_]") && img.className.includes("avatar")) return;
      img.srcset = ""; img.src = art; img.style.objectFit = "cover";
    });
    $$("video", c).forEach(v => v.remove());
    // A landscape frame instead of whatever size the original attachment had.
    const item = $("[class*=mosaicItem_]", c);
    if (item) {
      item.style.cssText = "width:440px;height:275px";
      $$("div", item).forEach(d => { d.style.width = "100%"; d.style.height = "100%"; d.style.maxWidth = "none"; d.style.maxHeight = "none"; });
      $$("img", item).forEach(i => { i.style.width = "100%"; i.style.height = "100%"; });
    }
    return c;
  };

  const rh = cls("reactionInner").replace("reactionInner", "");
  const reactions = items => `<div class="reactions${rh}" role="group"><div></div><div style="display:flex;flex-wrap:wrap;gap:4px">` + items.map(([e, n, me]) =>
    `<div class="reaction${rh}${me ? " reactionMe" + rh : ""}"><div class="reactionInner${rh}" role="button"><div></div>` +
    `<div><span class="emoji-text" style="font-size:16px;line-height:20px">${e}</span></div>` +
    `<div class="reactionCount${rh}" style="min-width:12px">${n}</div></div></div>`).join("") + "</div></div>";

  const quote = t => `<div class="blockquoteContainer${md}"><div class="blockquoteDivider${md}"></div><blockquote>${t}</blockquote></div>`;
  const art = blobs(1200, 750, ["#06122e", "#1b0f3b", "#0a84ff", "#bf5af2", "#30d158"],
    `<g fill="none" stroke="white" stroke-opacity="0.18" stroke-width="2">${[...Array(9)].map((_, i) => `<path d="M0 ${380 + i * 26} C 300 ${300 + i * 30}, 700 ${470 + i * 18}, 1200 ${360 + i * 24}"/>`).join("")}</g>`);

  const divider = (text, unread) => {
    if (!dividerTpl) return null;
    const d = dividerTpl.cloneNode(true); d.setAttribute("data-vg", ""); d.removeAttribute("id");
    const ct = $("[class*=content_]", d);
    if (text && ct) ct.textContent = text;
    // Without a date the divider is just the line and the "New" pill.
    if (!text) { ct?.remove(); d.className = d.className.split(" ").filter(c => !/hasContent/.test(c)).join(" "); }
    if (unread) {
      const dh = cls("isUnread").replace("isUnread", "");
      d.classList.add("isUnread" + dh);
      const pill = document.createElement("span"); pill.className = `endCap${dh} unreadPill${dh}`; pill.textContent = "new"; d.append(pill);
    }
    return d;
  };

  const P = people;
  const items = [
    divider("November 2, 2026"),
    head(P.milo, "2:14 PM", `anyone else get the new update yet?`),
    cont(`lock screen lyrics finally work for me 🙏`),
    reply(P.nova, "2:16 PM", `yeah installed it this morning, way smoother now`, P.milo, `anyone else get the new update yet?`,
      reactions([["🔥", 4, false], ["👍", 2, true]])),
    head(P.kenji, "2:19 PM", `${mention("@alex")} did you ever figure out the certificate thing?`),
    head(P.alex, "2:21 PM", `yep, just had to re-sign it with <code class="inline">--force</code>`),
    cont(`takes like two minutes, then it's fine`),
    image(P.lea, "2:26 PM", `my setup rn 😌`, art),
    divider("", true),
    head(P.theo, "2:31 PM", `${quote("is it worth it?")}100%, no going back after this`,
      reactions([["💯", 3, false], ["❤️", 1, true]])),
  ].filter(Boolean);
  // The mention of the viewer gets Discord's own "mentioned" highlight.
  const mh = cls("mentioned", "cozyMessage");
  const leaItem = items.find(it => it.textContent.includes("@alex did you"));
  const leaMsg = leaItem && $("[class*=message_]", leaItem);
  if (leaMsg && mh) leaMsg.classList.add(mh);

  const anchor = [...list.children].reverse().find(ch => /scrollerSpacer/.test(ch.className)) || null;
  $$("[data-vg]", list).forEach(e => e.remove());
  items.forEach(it => list.insertBefore(it, anchor));
  const scroller = list.closest("[class*=scroller_]");
  if (scroller) scroller.scrollTop = scroller.scrollHeight;
  return "ok: " + items.length + " items";
})()
