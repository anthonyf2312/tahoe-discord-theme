// Turns the open channel into showcase material in place: every person keeps their spot but gets
// another person's name and a third person's avatar, message texts come from a scene file, and the
// server list shows public servers' icons. Only the live DOM changes; Cmd+R restores everything.
// Run through tools/showcase/demo.mjs, which provides window.__vgScene and window.__vgIcons.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const scene = window.__vgScene || { messages: [] };
  const icons = window.__vgIcons || [];
  const base = src => (src || "").replace(/\?.*$/, "");

  // --- who is on screen ------------------------------------------------------------------
  const nameEls = "h3[class*=header_] [class*=username_], [class*=repliedMessage_] [class*=username_], " +
    "[class*=membersWrap_] [class*=name_][class*=username_], [class*=voiceUser_] [class*=username_], " +
    "li[class*=card_] [class*=author_] [class*=username_]";
  // The name is the first piece of text in the element; anything after it (the hidden
  // "Server Tag: …" and the tag chip) belongs to the server tag and stays.
  const firstText = el => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let t; (t = w.nextNode());) if (t.nodeValue.trim()) return t;
    return null;
  };
  const nameOf = el => el && (firstText(el)?.nodeValue || "").trim();
  const setName = (el, text) => {
    const t = firstText(el);
    if (t) t.nodeValue = text; else el.textContent = text;
    el.setAttribute("data-text", text);
  };
  const people = new Map();
  const note = (name, avatar) => {
    name = (name || "").trim().replace(/^@/, "");
    if (!name) return;
    const p = people.get(name) || { name, avatar: "" };
    if (avatar && !p.avatar) p.avatar = base(avatar);
    people.set(name, p);
  };
  $$("li[id^='chat-messages-']").forEach(li => {
    note(nameOf($("h3[class*=header_] [class*=username_]", li)), $("[class*=contents_] > img[class*=avatar_]", li)?.src);
    const rm = $("[class*=repliedMessage_]", li);
    if (rm) note(nameOf($("[class*=username_]", rm)), $("img", rm)?.src);
  });
  $$("[class*=membersWrap_] [class*=member_][class*=container_]").forEach(row =>
    note(nameOf($("[class*=name_][class*=username_]", row)), $("img[class*=avatar_]", row)?.src));
  $$("li[class*=card_] [class*=author_] [class*=username_]").forEach(el => note(nameOf(el)));
  const pool = [...people.values()].filter(p => p.avatar && !/^\[bot\]|bot$/i.test(p.name)).sort((a, b) => a.name.localeCompare(b.name));
  if (pool.length < 3) return "not enough people on screen to shuffle";

  // Person i shows the name of i+1 and the avatar of i+2, so neither half of any real pair survives.
  const n = pool.length;
  const byName = new Map(), byAvatar = new Map();
  pool.forEach((p, i) => {
    const id = { name: pool[(i + 1) % n].name, avatar: pool[(i + 2) % n].avatar };
    byName.set(p.name, id);
    byAvatar.set(p.avatar, id.avatar);
  });
  // Names on screen without an avatar we know still get a pool name.
  people.forEach(p => { if (!byName.has(p.name)) byName.set(p.name, { name: pool[byName.size % n].name, avatar: "" }); });

  const plain = el => el.className.split(" ").filter(c => !/Gradient|Glow/.test(c)).join(" ");
  $$(nameEls).forEach(el => {
    const raw = (nameOf(el) || "").trim(), at = raw.startsWith("@"), id = byName.get(raw.replace(/^@/, ""));
    if (!id) return;
    setName(el, (at ? "@" : "") + id.name);
    // Display-name effects re-draw the original text in a pseudo-element, so they go.
    el.className = plain(el);
  });
  $$("[class*=nameGlow_]").forEach(el => el.remove());
  $$("img").forEach(img => {
    const to = byAvatar.get(base(img.src));
    if (to) { img.srcset = ""; img.src = to + "?size=96"; }
  });

  // --- the viewer: a pool identity, no personal artwork -------------------------------------
  const panel = $("section[class*=panels_]");
  if (panel) {
    const me = pool[Math.floor(n / 2)];
    const title = $("[class*=panelTitleContainer_] [class*=title_]", panel);
    if (title) title.textContent = me.name;
    $$("[class*=hoverRoll_] [class*=hovered_]", panel).forEach(el => { el.textContent = me.name.toLowerCase(); });
    const av = $("img[class*=avatar_]", panel);
    if (av) { av.srcset = ""; av.src = me.avatar + "?size=96"; }
    // The panel artwork is the owner's own; kept only for the --vg-panel-art comparison.
    if (!window.__vgKeepPanelArt) $$("video, [class*=avatarDecoration]", panel).forEach(el => el.style.setProperty("display", "none", "important"));
  }

  // --- message texts ----------------------------------------------------------------------
  const mentionCls = ($(".mention") || {}).className || "mention interactive";
  const rh = (($("[class*=reactionInner_]") || {}).className || "").match(/reactionInner(_[_a-z0-9]+)/)?.[1] || "";
  const markup = (text, mentionName) => text
    .replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))
    .replace(/`([^`]+)`/g, '<code class="inline">$1</code>')
    .replace(/@\{mention\}/g, `<span class="${mentionCls}" role="button">@${mentionName}</span>`);
  const reactions = list => `<div class="reactions${rh}" role="group"><div></div><div style="display:flex;flex-wrap:wrap;gap:4px">` +
    list.map(([e, c, me]) => `<div class="reaction${rh}${me ? " reactionMe" + rh : ""}"><div class="reactionInner${rh}" role="button"><div></div>` +
      `<div><span style="font-size:16px;line-height:20px;color:#fff">${e}</span></div><div class="reactionCount${rh}" style="min-width:12px">${c}</div></div></div>`).join("") +
    "</div></div>";

  // Each message list on screen (the channel, a thread beside it) is a pane with its own messages.
  // A pane covers what is visible, aligned to the bottom where the newest messages are.
  const panes = scene.panes || [{ messages: scene.messages || [], allMessages: scene.allMessages, keepMedia: scene.keepMedia }];
  const filler = scene.filler || ["lol", "makes sense", "same"];
  let rewritten = 0;
  $$("[class*=messagesWrapper_]").forEach((wrap, w) => {
    const pane = panes[w];
    if (!pane) return;
    const view = $(":scope > [class*=scroller_]", wrap)?.getBoundingClientRect();
    const items = $$("li[id^='chat-messages-']", wrap).filter(li => {
      const r = li.getBoundingClientRect();
      return pane.allMessages || !view || (r.bottom > view.top && r.top < view.bottom);
    });
    const offset = pane.messages.length - items.length;
    // A mention points at whoever wrote the next message that starts a group, the natural addressee.
    const authorAt = i => items.slice(i + 1).map(li => nameOf($("h3[class*=header_] [class*=username_]", li))).find(Boolean) || pool[0].name;
    items.forEach((li, i) => {
      const m = pane.messages[i + offset] || { text: filler[i % filler.length] };
      if (m.reply === undefined) m.reply = (pane.messages[i + offset - 1] || {}).text;
      const body = $$("[class*=messageContent_]:not([class*=repliedTextContent_])", li).pop();
      if (body) body.innerHTML = markup(m.text, authorAt(i));
      const rt = $("[class*=repliedTextContent_]", li);
      if (rt && m.reply) rt.innerHTML = markup(m.reply, authorAt(i));
      // Whatever else the message carried (embeds, media, bot components) belongs to the old text,
      // unless the pane keeps its media (the owner's own posts).
      if (!pane.keepMedia) $$("[id^='message-accessories-'] > *", li).forEach(e => { if (!e.querySelector("[class*=reactions_], [class*=threadMessageAccessory_]") && !e.matches("[class*=reactions_]")) e.remove(); });
      // A kept card (bot post) gets its own heading and text in place of the original ones.
      const md = $$("[class*=isComponentsV2_] [class*=markdownContainer_]", li)[0];
      if (md && m.card) md.innerHTML = `<h2>${markup(m.card.title)}</h2><span>${markup(m.card.text)}</span>`;
      const preview = $("[class*=threadMessageAccessoryContent_]", li);
      if (preview && pane.threadPreview) preview.innerHTML = markup(pane.threadPreview, authorAt(i));
      const old = $("[class*=reactions_]", li);
      if (m.reactions && rh) {
        const html = reactions(m.reactions);
        if (old) old.outerHTML = html;
        else ($("[id^='message-accessories-']", li) || li).insertAdjacentHTML("beforeend", html);
      } else old?.remove();
      rewritten++;
    });
    // Rewritten messages are shorter than the originals, so the list goes back to its newest end.
    if (pane.allMessages) { const sc = $(":scope > [class*=scroller_]", wrap); if (sc) sc.scrollTop = sc.scrollHeight; }
  });

  // --- forum: post cards and the open post's title -----------------------------------------
  const titles = new Map();
  $$("li[class*=card_]").forEach((card, i) => {
    const post = (scene.posts || [])[i];
    if (!post) return;
    const h3 = $("h3", card), t = h3 && firstText(h3);
    if (t) { titles.set(t.nodeValue.trim(), post.title); t.nodeValue = post.title; }
    const preview = $("[class*=messageContent_]", card);
    if (preview) preview.innerHTML = markup(post.preview, pool[0].name);
    // Attachment thumbnails are other people's screenshots.
    $$("[class*=bodyMedia_]", card).forEach(e => e.remove());
  });
  // The open post's old title also shows in the header, the channel list and the thread panel.
  if (scene.threadTitle) {
    const header = $("[class*=chatLayerWrapper_] section h1, [class*=chatLayerWrapper_] section [class*=title_] [class*=defaultColor_]");
    const old = header && firstText(header)?.nodeValue.trim();
    if (old) titles.set(old, scene.threadTitle);
  }
  if (titles.size) {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let t; (t = w.nextNode());) {
      const to = titles.get(t.nodeValue.trim());
      if (to) { t.nodeValue = to; continue; }
      // Also inside longer strings, like the input's "Send a message in …" placeholder.
      for (const [from, into] of titles) if (from.length > 8 && t.nodeValue.includes(from)) t.nodeValue = t.nodeValue.replace(from, into);
    }
  }

  // --- server list: public servers' icons ---------------------------------------------------
  const current = location.pathname.split("/")[2];
  let k = 0;
  const next = () => icons[k++ % icons.length];
  $$("nav[class*=guilds_] [data-list-item-id^='guildsnav___']").forEach(item => {
    const id = item.getAttribute("data-list-item-id").replace("guildsnav___", "");
    if (id === current || !/^\d+$/.test(id) || !icons.length) return;
    const ic = next();
    const img = $("img", item);
    if (img) { img.srcset = ""; img.src = ic.src; }
    else {
      const acr = $("[class*=acronym_]", item);
      // The theme paints these tiles with !important, so the icon needs it too.
      if (acr) { acr.textContent = ""; acr.style.setProperty("background", `url("${ic.src}") center/cover`, "important"); }
    }
  });
  $$("nav[class*=guilds_] [class*=folderPreviewGuildIcon_]").forEach(el => {
    el.style.backgroundImage = `url("${next().src}")`; el.textContent = "";
  });

  return `ok: ${n} people shuffled, ${rewritten} messages rewritten`;
})()
