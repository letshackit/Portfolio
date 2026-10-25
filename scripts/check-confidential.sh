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
C=Abha; D=Sinha
H=letshackit; N=netlify
OLDHOST="${H}\.${N}\.app"
RESUME=Harshal_Saraogi_Resume.pdf   # the one file exempt from the scan (A-PRD-1)
# Secret / tracker scan: specific tokens, not the bare word "analytics" (the resume legitimately lists Google Analytics 360).
SECRETS='api[_-]?key|token=|@vercel/analytics|vercel-analytics|googletagmanager|google-analytics\.com|gtag\(|plausible\.io|mixpanel|segment\.com/analytics|AKIA[0-9A-Z]{16}|github_pat_[A-Za-z0-9_]{20,}|AIza[0-9A-Za-z_-]{30,}|sk-[A-Za-z0-9_-]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}|gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN ([A-Z]+ )?PRIVATE KEY-----'

if [ "$#" -gt 0 ]; then TARGETS="$*"; else
  TARGETS="src scripts index.html public"
  [ -d dist ] && TARGETS="$TARGETS dist"
fi

for T in $TARGETS; do
  if [ ! -e "$T" ]; then echo "check-confidential: path does not exist: $T"; exit 2; fi
done

# Paths are NUL-delimited end to end so a file name with a space is still scanned. Only the exact resume path is exempt.
list_files() {
  # shellcheck disable=SC2086
  find $TARGETS -type f ! -path '*/node_modules/*' ! -name check-confidential.sh ! -path "public/$RESUME" ! -path "dist/$RESUME" -print0 2>/dev/null
}

FAIL=0
report() { # label hits
  if [ -n "$2" ]; then
    echo "FAIL  $1"
    echo "$2" | cut -c1-160 | sed 's/^/        /'
    FAIL=1
  else
    echo "PASS  $1: 0 matches"
  fi
}
scan() { # label pattern
  # shellcheck disable=SC2086
  report "$1" "$(list_files | xargs -0 grep -niE -- "$2" 2>/dev/null)"
}
# Name scan that survives obfuscation. The text is normalised first (\uXXXX and numeric/named entities decoded, zero-width
# characters and comments dropped, common homoglyphs folded to Latin), then any run of whitespace, quotes, '+', ',',
# brackets, braces, '.', '_', '-', tags or comments between the two words counts as a separator, in either order,
# across lines.
nscan() { # label first second [rev: also match second-then-first; only for names too rare to occur as plain words]
  report "$1" "$(list_files | NAME_A="$2" NAME_B="$3" NAME_REV="$4" xargs -0 perl -CSD -0777 -ne '
    BEGIN { ($a, $b) = ($ENV{NAME_A}, $ENV{NAME_B}); }
    my $t = $_;
    for (1 .. 2) {
      $t =~ s/\\u\{?([0-9a-fA-F]{4,6})\}?/chr(hex($1))/ge;
      $t =~ s/\\x([0-9a-fA-F]{2})/chr(hex($1))/ge;
      $t =~ s/&#x([0-9a-fA-F]+);/chr(hex($1))/ge;
      $t =~ s/&#([0-9]+);/chr($1)/ge;
    }
    $t =~ s/&(?:nbsp|shy|zwj|zwnj);/ /gi;
    $t =~ s/[\x{200B}-\x{200D}\x{FEFF}\x{00AD}\x{2060}]//g;
    $t =~ s/\x{00A0}/ /g;
    $t =~ s{/\*.*?\*/}{}gs;
    $t =~ tr/\x{0430}\x{0435}\x{043E}\x{0440}\x{0441}\x{0443}\x{0445}\x{0456}\x{0391}\x{03B1}\x{03BF}/aeopcyxiAao/;
    my $sep = qr/(?:[\s._\-\x27"+,\[\]{}\\]|<[^>]*>|\{[^}]*\}|\/\/[^\n]*\n)*/;
    print "$ARGV: forbidden name\n" if $t =~ /$a$sep$b/i || ($ENV{NAME_REV} && $t =~ /$b$sep$a/i);
    close ARGV if eof;' 2>/dev/null)"
}

echo "Scanning: $TARGETS (only $RESUME excluded, owner decision A-PRD-1)"
nscan "HRIS vendor name (any case, separators, entities, zero-width, line breaks)" "$A" "$B"
nscan "SBI Life quote author (same rules, either order)" "$C" "$D" rev
scan "retired host address" "$OLDHOST"
scan "secrets and trackers" "$SECRETS"
report "stray .DS_Store files" "$(find $TARGETS -name .DS_Store 2>/dev/null)"

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
