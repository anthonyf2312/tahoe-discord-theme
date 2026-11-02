(() => {
const out=[];
for (const e of document.querySelectorAll("body *")) {
  const r=e.getBoundingClientRect(); if (r.width<60||r.height<24) continue;
  if (r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth) continue;
  const c=getComputedStyle(e); const m=c.backgroundColor.match(/[\d.]+/g);
  let a=1, ok=false;
  const bg=c.backgroundColor;
  if (bg==="rgba(0, 0, 0, 0)"||bg==="transparent") continue;
  const mm=bg.match(/^(rgba?|oklab|color)\(/)? bg : bg;
  if (/oklab\(0 0 0\)/.test(bg)) a=1;
  else if (/\/\s*([\d.%]+)\)/.test(bg)) { let v=bg.match(/\/\s*([\d.%]+)\)/)[1]; a=v.endsWith("%")?parseFloat(v)/100:parseFloat(v); }
  else if (bg.startsWith("rgba")) a=parseFloat(m[3]); 
  if (a>=0.45) out.push(c.backgroundColor.slice(0,40)+" | "+e.tagName+"."+e.className.toString().slice(0,70)+" "+[r.x,r.y,r.width,r.height].map(Math.round).join(","));
}
return JSON.stringify(out.slice(0,40),null,0).replace(/","/g,'"\n"');
})()
