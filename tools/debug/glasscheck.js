(() => {
const out=[];
for (const e of document.querySelectorAll("[class*=layerContainer] *, [class*=positionLayer] *, [class*=layer_] *")) {
  const r=e.getBoundingClientRect(); if (r.width<120||r.height<60) continue;
  const c=getComputedStyle(e); const bg=c.backgroundColor;
  if (bg==="rgba(0, 0, 0, 0)") continue;
  const bf=c.backdropFilter; 
  out.push((bf&&bf!=="none"?"GLASS ":"flat  ")+bg.slice(0,28)+" | "+e.className.toString().slice(0,60)+" "+[r.width,r.height].map(Math.round));
}
return [...new Set(out)].slice(0,25).join("\n");
})()
