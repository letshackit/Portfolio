#!/bin/sh
# Local Lighthouse (mobile) against `vite preview` (NFR-11, architecture F.6). The local number is a proxy; NFR-11 is judged on the live URL.
# Builds into a scratch folder so dist/ is untouched. Reports land in .sdlc/reports/.
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
OUT=$(mktemp -d)
PORT=4173
mkdir -p .sdlc/reports
npx vite build --outDir "$OUT" --emptyOutDir
npx vite preview --outDir "$OUT" --port $PORT --strictPort >/dev/null 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null; rm -rf "$OUT"' EXIT
sleep 3
CHROME_PATH="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}" \
npx --yes lighthouse@12.2.1 "http://localhost:$PORT/" --form-factor=mobile --screenEmulation.mobile \
  --throttling-method=simulate --only-categories=performance,accessibility,best-practices,seo \
  --output=html --output=json --output-path=./.sdlc/reports/lighthouse-mobile \
  --chrome-flags="--headless=new"
node -e "
const r=JSON.parse(require('fs').readFileSync('./.sdlc/reports/lighthouse-mobile.report.json','utf8'));
const c=r.categories,a=r.audits;
console.log({perf:c.performance.score*100,a11y:c.accessibility.score*100,bp:c['best-practices'].score*100,seo:c.seo.score*100,
fcp:a['first-contentful-paint'].displayValue,lcp:a['largest-contentful-paint'].displayValue,cls:a['cumulative-layout-shift'].displayValue,tbt:a['total-blocking-time'].displayValue});"
