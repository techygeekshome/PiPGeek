#!/usr/bin/env bash
# Builds the release packages into dist/.
#   PiPGeek.zip          Chrome, Edge, Brave, Opera, Vivaldi (unzip, then Load unpacked)
#   PiPGeek-chrome.zip   same files, named for Chrome users
#   PiPGeek-edge.zip     same files, named for Edge users
#   PiPGeek-firefox.zip  Firefox package (Firefox manifest, files at the root)
set -euo pipefail
cd "$(dirname "$0")"
FILES="background.js pipgeek-core.js auto.js options.html options.css options.js icons"
OUT=dist; TMP=$(mktemp -d)
mkdir -p "$OUT"
rm -f "$OUT"/PiPGeek*.zip

mkdir "$TMP/pipgeek"
cp -r $FILES manifest.json LICENSE "$TMP/pipgeek/"
(cd "$TMP" && zip -qr -X pkg.zip pipgeek)
for n in PiPGeek PiPGeek-chrome PiPGeek-edge; do cp "$TMP/pkg.zip" "$OUT/$n.zip"; done

mkdir "$TMP/ff"
cp -r $FILES LICENSE "$TMP/ff/"
cp manifest.firefox.json "$TMP/ff/manifest.json"
# Firefox has no automatic picture-in-picture for add-ons, and no chrome.dom: drop those parts from its package
rm "$TMP/ff/auto.js"
grep -v '// chromium-only$' pipgeek-core.js > "$TMP/ff/pipgeek-core.js"
(cd "$TMP/ff" && zip -qr -X ../ff.zip .)
cp "$TMP/ff.zip" "$OUT/PiPGeek-firefox.zip"

rm -r "$TMP"
ls -l "$OUT"
