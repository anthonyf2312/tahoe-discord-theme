// Snapshot of the open channel for demo screenshots: who writes (name, avatar, role colour),
// the member list and the message layout. Real people's data, so it is saved outside git.
(() => {
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const people = new Map();
  const add = (name, avatar, color, where) => {
    if (!name || !avatar) return;
    const p = people.get(name) || { name, avatar, color: "", seen: [] };
    if (color && !p.color) p.color = color;
    if (!p.seen.includes(where)) p.seen.push(where);
    people.set(name, p);
  };
  const colorOf = el => el && (el.style.color || getComputedStyle(el).color);
  let last = null;
  const messages = $$("li[id^='chat-messages-']").map(li => {
    const u = li.querySelector("h3[class*=header_] [class*=username_]");
    const av = li.querySelector("[class*=contents_] > img[class*=avatar_]");
    if (u) { last = u.textContent.trim(); add(last, av?.src, colorOf(u), "message"); }
    const rm = li.querySelector("[class*=repliedMessage_]");
    if (rm) add(rm.querySelector("[class*=username_]")?.textContent.trim().replace(/^@/, ""), rm.querySelector("img")?.src, colorOf(rm.querySelector("[class*=username_]")), "reply");
    return {
      author: last, head: !!u, reply: !!rm,
      image: !!li.querySelector("[class*=mosaicItem_], [class*=imageWrapper_]"),
      embed: !!li.querySelector("article[class*=embed]"),
      reactions: !!li.querySelector("[class*=reactions_]"),
      text: (li.querySelector("[class*=messageContent_]:not([class*=repliedTextContent_])")?.innerText || "").slice(0, 160),
    };
  });
  const members = $$("[class*=membersWrap_] [class*=member_][class*=container_]").map(row => {
    const n = row.querySelector("[class*=name_][class*=username_]");
    const name = n?.textContent.trim();
    add(name, row.querySelector("img[class*=avatar_]")?.src, colorOf(n), "member");
    return { name, status: row.querySelector("[class*=customStatusContent_], [class*=textWithIconContainer_], [class*=activity_]")?.innerText?.slice(0, 60) || "" };
  });
  const groups = $$("[class*=membersWrap_] [class*=membersGroupName_]").map(g => g.textContent.trim());
  return {
    channel: { path: location.pathname, title: document.title.replace(/^\(\d+\)\s*/, "") },
    people: [...people.values()], messages, members, groups,
  };
})()
