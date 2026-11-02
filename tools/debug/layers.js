(() => {
const out=[];
for (const l of document.querySelectorAll("[class*=layerContainer] > *, [class*=layerContainer] [class*=layer_]")) {
  const kid=l.firstElementChild; if(!kid) continue;
  const d=(e,n)=>e.className.toString().slice(0,60)+" ["+getComputedStyle(e).backgroundColor+"]"+(n<3&&e.firstElementChild?" > "+d(e.firstElementChild,n+1):"");
  out.push(d(l,0));
}
return out.join("\n");
})()
