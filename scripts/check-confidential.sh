#!/bin/sh
# Launch gate (PRD "Confidentiality", NFR-28, ADR-005). Run from anywhere; exits non-zero on any hit.
#   scripts/check-confidential.sh            scans src/, scripts/, index.html, public/ (minus the resume PDF, A-PRD-1) and dist/ if present
#   scripts/check-confidential.sh --launch   also fails while the TravelDesk architecture is still status 'proposed' (ADR-005)
#   scripts/check-confidential.sh <dir>...   scans the given paths instead (used to prove the gate fails on a planted string)
# The forbidden strings are assembled from parts and this file is excluded from the scan, so it does not match itself.
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT" || exit 2

LAUNCH=0
if [ "$1" = "--launch" ]; then LAUNCH=1; shift; fi

A=People; B=Strong
VENDOR="${A}[[:space:]_-]*${B}"
C=Abha; D=Sinha
AUTHOR="${C}[[:space:]]+${D}"
H=letshackit; N=netlify
OLDHOST="${H}\.${N}\.app"
# Secret / tracker scan: specific tokens, not the bare word "analytics" (the resume legitimately lists Google Analytics 360).
SECRETS='api[_-]?key|token=|@vercel/analytics|vercel-analytics|googletagmanager|google-analytics\.com|gtag\(|plausible\.io|mixpanel|segment\.com/analytics'

if [ "$#" -gt 0 ]; then TARGETS="$*"; else
  TARGETS="src scripts index.html public"
  [ -d dist ] && TARGETS="$TARGETS dist"
fi

FAIL=0
scan() { # label pattern
  HITS=$(grep -rniE --exclude='*.pdf' --exclude=check-confidential.sh --exclude-dir=node_modules -- "$2" $TARGETS 2>/dev/null)
  if [ -n "$HITS" ]; then
    echo "FAIL  $1"
    echo "$HITS" | cut -c1-160 | sed 's/^/        /'
    FAIL=1
  else
    echo "PASS  $1: 0 matches"
  fi
}

echo "Scanning: $TARGETS (PDFs excluded by owner decision A-PRD-1)"
scan "HRIS vendor name (any case, with or without a space)" "$VENDOR"
scan "SBI Life quote author" "$AUTHOR"
scan "retired host address" "$OLDHOST"
scan "secrets and trackers" "$SECRETS"

# ADR-005: the proposed-architecture flag. Reported always; fatal only with --launch.
if [ "$#" -eq 0 ] || [ "$1" = "src" ]; then
  if grep -q "status: 'proposed'" src/data/traveldesk-architecture.ts 2>/dev/null; then
    if [ "$LAUNCH" = 1 ]; then echo "FAIL  architecture status is 'proposed' (owner must confirm, Q-1)"; FAIL=1
    else echo "WARN  architecture status is 'proposed': launch blocker, enforced by --launch"; fi
  else
    echo "PASS  architecture status is confirmed"
  fi
fi

[ "$FAIL" = 0 ] && echo "check-confidential: OK" || echo "check-confidential: FAILED"
exit "$FAIL"
