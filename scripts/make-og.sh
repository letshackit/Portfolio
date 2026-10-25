#!/bin/sh
# Rasterises scripts/og-image.svg (1200x630) to public/og-image.png and public/apple-touch-icon.png (180x180)
# with headless Google Chrome. Geist fonts are loaded from public/fonts. Re-run only when the artwork changes.
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
TMP=$(mktemp -d)
{
  echo "<!doctype html><meta charset=utf-8><style>"
  echo "@font-face{font-family:'Geist';font-weight:100 900;src:url('file://$ROOT/public/fonts/geist-latin-wght-normal.woff2')}"
  echo "@font-face{font-family:'Geist Mono';font-weight:100 900;src:url('file://$ROOT/public/fonts/geist-mono-latin-wght-normal.woff2')}"
  echo "html,body{margin:0;background:#0B0C0E}svg{display:block}</style>"
  cat "$ROOT/scripts/og-image.svg"
} > "$TMP/og.html"
cat > "$TMP/icon.html" <<EOF
<!doctype html><meta charset=utf-8><style>html,body{margin:0;background:#0B0C0E}svg{display:block}</style>
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 32 32"><rect width="32" height="32" fill="#0B0C0E"/><circle cx="16" cy="16" r="10" fill="none" stroke="#22D3EE" stroke-width="2.5"/><circle cx="26" cy="16" r="2" fill="#F59E0B"/></svg>
EOF
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --virtual-time-budget=3000 \
  --window-size=1200,630 --screenshot="$ROOT/public/og-image.png" "file://$TMP/og.html"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=180,180 \
  --screenshot="$ROOT/public/apple-touch-icon.png" "file://$TMP/icon.html"
rm -rf "$TMP"
