// Prints the layout tree under a selector: tag.class [x,y wxh], hashes shortened.
((sel, maxDepth) => {
  const out = [];
  const short = c => [...c].map(x => x.replace(/_[a-z0-9]{5,6}$/, "_")).join(".");
  const walk = (el, d) => {
    if (d > maxDepth) return;
    for (const ch of el.children) {
      const r = ch.getBoundingClientRect();
      if (r.width < 30 || r.height < 14) continue;
      const bg = getComputedStyle(ch).backgroundColor;
      out.push("  ".repeat(d) + ch.tagName.toLowerCase() + "." + short(ch.classList) + ` [${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}]` + (bg !== "rgba(0, 0, 0, 0)" ? " bg=" + bg : ""));
      if (!/messageListItem|member_|listItem_|containerDefault/.test(ch.className)) walk(ch, d + 1);
    }
  };
  walk(document.querySelector(sel), 0);
  return out.slice(0, 160).join("\n");
})
