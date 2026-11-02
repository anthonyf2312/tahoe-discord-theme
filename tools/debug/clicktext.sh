#!/bin/zsh
# usage: clicktext.sh "Plugins"  -> real click on first leaf element with exact text
cd "$(dirname "$0")/.."
XY=$(node tools/cdp.mjs eval "(() => { const e=[...document.querySelectorAll('body *')].find(e=>e.children.length===0&&e.textContent.trim()==='$1'&&e.getBoundingClientRect().width>0); if(!e) return ''; const r=e.getBoundingClientRect(); return Math.round(r.x+r.width/2)+' '+Math.round(r.y+r.height/2)})()")
[ -z "$XY" ] && { echo "not found"; exit 1; }
node tools/cdp.mjs click ${=XY}
