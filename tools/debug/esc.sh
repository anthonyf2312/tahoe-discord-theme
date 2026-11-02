#!/bin/sh
cd "$(dirname "$0")/.."
node tools/cdp.mjs eval 'for (const t of [document.activeElement, document.body, document, window]) { t && t.dispatchEvent && t.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",keyCode:27,which:27,bubbles:true,cancelable:true})); } 1' >/dev/null
