#!/bin/sh
# Rebuilds the bundle and links the local theme (bundle inlined) into Vesktop. Vencord watches
# the themes folder, not the link target, so re-creating the link is what makes it reload.
set -e
cd "$(dirname "$0")/.."
python3 build.py
L="$HOME/Library/Application Support/vesktop/themes/Tahoe.theme.css"
rm -f "$L"
ln -s "$PWD/build/Tahoe.local.theme.css" "$L"
