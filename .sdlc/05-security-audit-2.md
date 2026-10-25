# Security audit 2
**Verdict:** APPROVE WITH CHANGES (CRITICAL 0, HIGH 0, MEDIUM 2, LOW 4, INFO 5). The two MEDIUMs are owner actions, not code. Neither blocks the code gate. Both must be done before anything is pushed.

**Scope:** branch `revamp/mission-control` (`git diff main...HEAD`, HEAD 9488101, which includes the round-1 rework commit). There were no uncommitted files (`git status --short` was empty). Reviewed:
- index.html, the CSP, public/_headers, 404.html, robots.txt, sitemap.xml
- every external link, window.open, clipboard, sessionStorage and location.hash path in src/
- scripts/check-confidential.sh, scripts/lighthouse.sh, vite.config.ts, package.json, .gitignore
- git history (all refs), the committed .sdlc/ files and Lighthouse reports
- a scratch production build

Did not edit source.

**Scanners run (real output):**
- `npm audit --omit=dev` -> `found 0 vulnerabilities` (exit 0)
- `npm audit` -> `17 vulnerabilities (1 low, 5 moderate, 9 high, 2 critical)` (exit 1). This is the same set as round 1, all in devDependencies; see L-4.
- `sh scripts/check-confidential.sh` (repo default targets: src scripts index.html public dist) -> 5 PASS, `WARN architecture status is 'proposed'`, `check-confidential: OK`, exit 0
- Planted-string matrix: 42 planted cases (c01-c41, c99), each in its own scratch directory, plus two path cases, run through `sh scripts/check-confidential.sh <dir>`. The results table is below. The scratch directory was removed afterwards (`rm -rf .../scratchpad/confgate` confirmed).
- `npx vite build --outDir <scratchpad>/build-security-2` -> built in 1.07s, 20 files, 0 `.map`, 0 dotfiles
- Local loopback dev-server probe: `npx vite --host 127.0.0.1 --port 5893`, 24 URL variants (results under "Round-1 findings"). The server was killed and `curl` afterwards returned `000`.
- `git log --all -p | grep -E 'gh[pousr]_…|github_pat_|AKIA…|AIza…|sk-…|xox…|PEM|G-/GTM-/UA-'` -> 1 hit. It is the literal string `-----BEGIN RSA PRIVATE KEY-----` in the round-1 audit's planted-string table, not a key. `gho_[A-Za-z0-9]{20,}` -> 0 hits in history and 0 in .sdlc/.
- `npx vitest run` -> `Test Files 13 passed (13)`, `Tests 107 passed (107)`

## Round-1 findings: re-verified in code

| Round 1 | Status | Evidence |
|---|---|---|
| H-1 dev server serves `.git/config` (token) and `.sdlc/` to the LAN | **Code part FIXED. Owner part OPEN (now M-1)** | `vite.config.ts:36`: `server.host` is gone and `fs.deny` has `'**/.git/**', '**/.sdlc/**'`. `package.json:7`: `"dev": "vite"`. On loopback, all of these return 403: `/.git/config`, `/.git/HEAD`, `/.sdlc/HANDOFF.md`, `/.sdlc/00-inputs/{testimonials,resume}.md`, the `?raw`, `?import`, `?url` and `?import&raw` variants, `/%2egit/config`, `/.git//config`, `/./.git/config`, `/src/../.git/config`, the case variants `/.GIT/config`, `/.Git/CONFIG`, `/.SDLC/HANDOFF.md` (which matter on case-insensitive APFS), and `/@fs<repo>/.git/config`, `/@fs<repo>/.GIT/config`, `/@fs<repo>/.SDLC/HANDOFF.md`. Two variants return 200, `/.git/config%00` and `/.git%2fconfig`, but the body is the SPA index.html (0 matches for the token or `[remote`). The token is still in `.git/config:9` (see M-1). |
| M-1 `.sdlc/` holds confidential names, committed to a GitHub remote | **OPEN (now M-2)** | Not code-fixable. Repo visibility is still unconfirmed. |
| L-1 confidentiality gate gaps | **Mostly FIXED** | All 9 round-1 misses are now caught: `&nbsp;`, `.`, zero-width, line split for both names, a non-résumé PDF, AKIA, PEM, `ghp_`. A nonexistent path exits 2. The build now chains the gate (`package.json:10`). New gaps: L-1 and L-2 below. |
| L-2 `.DS_Store` ships in the build | **FIXED** | `public/.DS_Store` and `src/.DS_Store` are gone. The scratch build has no dotfiles (`find <build> -name '.*'` is empty). The gate fails on any `.DS_Store` (planted case c23 exits 1). The only remaining `.DS_Store` is in the repo root; it is gitignored and outside every scanned or shipped path. |
| L-3 unpinned `npx lighthouse` | **FIXED** | `scripts/lighthouse.sh:16` `npx --yes lighthouse@12.2.1` |
| L-4 dev-dependency advisories | **Unchanged, waived** (L-4 below) | Same 17 advisories. |
| I-1..I-4 | Still accurate | Re-checked below. |

## Confidentiality gate: planted-string matrix (`scripts/check-confidential.sh <dir>`)
"vendor" means the HRIS vendor's two-word name and "author" means the SBI Life quote author's two-word name. Neither name is written out in this report.

| # | Planted | Exit |
|---|---|---|
| c01-c09 | vendor: joined, UPPER, space, hyphen, underscore, NBSP byte, `&nbsp;`, `.`, U+200B | 1 (caught) |
| c10, c12 | vendor or author split across JSX lines | 1 |
| c11, c13 | author, normal case and UPPER with a double space | 1 |
| c14, c15 | retired host, `gtag(` | 1 |
| c16-c19 | `AKIA…`, `-----BEGIN RSA PRIVATE KEY-----`, `ghp_…`, `gho_…` | 1 |
| c20, c21 | vendor as `A{' '}B`, and as `A<wbr/>B` | 1 |
| c22 | vendor inside `notes.pdf` | 1 |
| c23 | `.DS_Store` | 1 |
| c36, c37 | vendor as `A&#x200B;B`, and with a soft hyphen byte | 1 |
| c40 | vendor as `<text>A</text><text>B</text>` (SVG) | 1 |
| nonexistent path | | 2 (fails closed) |
| c99 | clean control ("Google Analytics 360") | 0 (correct, no false positive) |
| **c24** | **vendor inside a file whose name contains a space (`my notes.md`)** | **0 (missed)** — L-1 |
| c25 | `{'A'}{'B'}` | 0 (missed) — L-2 |
| c26 | `'A' + 'B'` | 0 (missed) — L-2 |
| c41 | `["A","B"]` (JSON or array) | 0 (missed) — L-2 |
| c27 | `A B` (JS escape) | 0 (missed) — L-2 |
| c28 | `A&#32;B` (numeric entity) | 0 (missed) — L-2 |
| c29 | `A/* c */B` | 0 (missed) — L-2 |
| c33 | author in reverse order ("Surname, Given") | 0 (missed) — L-2 |
| c35 | vendor with a Cyrillic homoglyph | 0 (missed) — L-2, already a known gap |
| c39 | vendor inside `a.js.gz` | 0 (missed) — L-2, not applicable to this build |
| c30 | `github_pat_…` | 0 (missed) — L-3 |
| c31 | `AIza…` | 0 (missed) — L-3 |
| c32 | `sk-ant-…` | 0 (missed) — L-3 |
| c38 | `A &amp; B` (ampersand between the words) | 0 (not the name itself, so no finding) |
| c34 | vendor in a file named `Harshal_Saraogi_Resume.pdf` in another directory | 0 (exempt by basename) — I-5 |
| dir with a space in its name | | 2 (fails closed, loudly) |

## Findings

### [MEDIUM] M-1 The GitHub OAuth token is still in plain text in the remote URL; revocation not confirmed — `.git/config:9`
**Exploit path:** `git config --get remote.origin.url` still has `https://letshackit:gho_…@github.com/…` (prefix only; 51-character userinfo). Round 1 found that the token was served to the LAN by the dev server. That path is now closed (403 on all 24 variants above). What remains:
- the token was printed in full into round-1 agent transcripts, which have left the machine to the model API;
- any local process can read it, including install scripts from the large devDependency tree (L-4).

`credential.helper` is already `osxkeychain`, so the embedded token is redundant.
**Impact:** if the token is still live, the holder gets read and write access to the `letshackit` account's repositories. A push to `letshackit/Portfolio` is a route to defacement if the host auto-deploys from it.
**Fix (owner):**
1. Revoke the token on GitHub (Settings -> Applications -> Authorized OAuth Apps, or `gh auth logout` and log in again).
2. Run `git remote set-url origin https://github.com/letshackit/Portfolio.git`.
3. Let osxkeychain hold the new credential.

**Confidence:** CONFIRMED that the token is present; the prefix was checked and the full token was never printed this round. PLAUSIBLE that it is still live: I made no network call to check.

### [MEDIUM] M-2 `.sdlc/` names the HRIS vendor and the SBI Life author, and is committed — `.sdlc/00-inputs/brief.md`, `.sdlc/00-inputs/resume.md`, `.sdlc/00-inputs/testimonials.md`, `.sdlc/00-prd.md`, `.sdlc/HANDOFF.md`
**Exploit path:** literal-name counts in tracked files:

| File | Vendor | Author |
|---|---|---|
| brief.md | 1 | 0 |
| resume.md | 1 | 0 |
| testimonials.md | 0 | 1 |
| 00-prd.md | 0 | 2 |
| HANDOFF.md | 6 | 2 |

05-review-1.md matches only as regex text, not as the literal names. The quote text is not stored. testimonials.md has 0 email addresses or phone numbers. If `github.com/letshackit/Portfolio` is public, pushing this branch publishes both names. The global rule "`.sdlc/` is committed" makes this structural.
**Impact:** a confidential vendor relationship and a third party who asked not to be named become public.
**Fix (owner):** confirm the repo is private before any push. If it is or will be public, replace the two names in `.sdlc/` with placeholders, and add `.sdlc` to the gate's targets.
**Confidence:** PLAUSIBLE. I did not check repo visibility, because that needs a network call.

### [LOW] L-1 The confidentiality gate silently skips files whose path contains whitespace — `scripts/check-confidential.sh:30,44,50`
**Exploit path (accidental leak):** `FILES=$(find …)` is piped through `echo "$FILES" | xargs grep/perl`. xargs splits on whitespace, so `public/my notes.md` becomes two nonexistent paths, and `2>/dev/null` hides the errors. Planted case c24, the vendor inside `my notes.md`, exits **0**. Example: the owner drops `Case study.pdf` or `Old resume (Apr).pdf` into `public/`. Vite copies it to dist/, the gate passes, and it is publicly downloadable. Today no file in src/, public/ or scripts/ has a space in its name (`find … -name '* *'` is empty).
**Fix:** use `find … -print0 | xargs -0 grep …` (and the same for perl), or `find … -exec grep … {} +`. Quote `$TARGETS` handling, or loop over `"$@"`. Fail if any target is unreadable instead of discarding stderr.
**Confidence:** CONFIRMED (tested).

### [LOW] L-2 Name scan misses names built from separate string literals, escapes, or reversed order — `scripts/check-confidential.sh:56`
**Exploit path:** the separator class is `[\s._-]|<…>|{…}|//…\n`. It does not cover quote characters, `+` or `,`, so these are all missed (c25, c26, c41; a minified JSX child array in dist looks the same):
- `{'A'}{'B'}`
- `'A' + 'B'`
- `["A","B"]`

These are also missed:
- ` `-style JS escapes (c27)
- numeric entities other than the listed zero-width ones (c28 `&#32;`)
- `/* */` comments (c29)
- the author in "Surname, Given" order (c33)
- homoglyphs (c35)

The backstop is the rendered-text unit test, `src/__tests__/readable.test.tsx:31-36`. It only checks the joined, case-sensitive vendor string and the author's first name. So a rendered "Vendor Two" (with a space) or an UPPER-case form built from separate literals would pass both the gate and the test. This is unlikely to happen by accident, which is why it is LOW.
**Fix:**
- In the readable test, normalise the rendered `textContent` (lowercase, strip non-letters) before asserting. That catches every rendering-level variant at once.
- In the gate, optionally allow `['"`+, ]` in the separator run and decode `&#NN;` and `\uNNNN` before matching.
- Match the author's surname on its own as well.

**Confidence:** CONFIRMED (tested).

### [LOW] L-3 Secret patterns miss common modern token formats — `scripts/check-confidential.sh:19`
**Exploit path:** `github_pat_…` (fine-grained GitHub PAT, c30), `AIza…` (Google API key, c31) and `sk-…`/`sk-ant-…` (c32) all exit 0. The site has no backend and reads no keys, so this only matters if someone pastes one into `src/` later.
**Fix:** add `github_pat_[A-Za-z0-9_]{20,}|AIza[0-9A-Za-z_-]{35}|sk-[A-Za-z0-9-]{20,}|xox[abpr]-[A-Za-z0-9-]{10,}` to `SECRETS`.
**Confidence:** CONFIRMED (tested).

### [LOW] L-4 Dev-dependency advisories (17: 2 critical, 9 high) — `package.json` devDependencies
**Reachability:** unchanged from round 1. `npm audit --omit=dev` reports 0, and none of these packages appear in the build output.
- tinypool, @vitest/mocker and vitest (GHSA-82fw-gwwq-j7x9, GHSA-qxg6-89mg-rqv8) need an exposed Vitest API or UI server or attacker-controlled mocks. This repo runs `vitest run` on its own files.
- esbuild GHSA-67mh-4wv8-2f99 concerns esbuild's own `serve()`, which Vite does not use.
- picomatch GHSA-3v7f-55p6-f55p and GHSA-c2c7-rcm5-vvqj are reported for picomatch@4.0.3 under typescript-eslint/tinyglobby only (lint time). Vite's `fs.deny` matching uses Vite's own picomatch ^2.3.1, and the deny patterns are our constants with no POSIX classes. So the dev-server fix above does not depend on the vulnerable version.
- The rest (postcss, @babel/core, brace-expansion, js-yaml, flatted, nanoid, browserslist, source-map-js, @humanfs/node, baseline-browser-mapping) only process trusted local input.

**Fix:** run `npm audit fix` (non-breaking) in a step that may run installs. Track Vitest 2 -> current together with the Vite 6+ upgrade.
**Confidence:** CONFIRMED (scanner output); not reachable.

### [INFO] I-1 CSP is coherent with the build — `index.html:6-7`, `public/_headers:2`
The meta and header policies are identical, except that `frame-ancestors 'none'` is header-only, as it must be. Against the scratch build:
- **Scripts:** index.html has one external module script and one `modulepreload`. Its only inline script is the JSON-LD block (`type="application/ld+json"`), which is a data block, not executed, so `script-src 'self'` neither blocks it nor needs a hash.
- **Fonts and styles:** fonts are `/fonts/*.woff2` (`font-src 'self'`), preloaded with `crossorigin`, which is correct for same-origin fonts. The CSS is a same-origin file.
- **Network:** `fetch(` appears in the entry (Vite's same-origin modulepreload polyfill) and 3 times in the three chunk. Those are three.js loader code, unused: `src/` calls no `*Loader`, `useLoader` or `useGLTF`. `connect-src 'self'` would block any cross-origin use anyway.
- **Dynamic code:** no `eval`, `new Function`, `Worker`, `WebSocket` or `sendBeacon`.
- **innerHTML in vendor code:** it appears only in React internals and in GSAP SplitText (`src/lib/motion.ts:54`). SplitText re-serialises the element's own React-rendered constant content on `revert()`, so no outside input reaches it.
- **Styles:** `'unsafe-inline'` is still needed for GSAP style attributes and 404.html's `<style>`. Optional tightening: `style-src 'self'; style-src-attr 'unsafe-inline'` plus a hash for 404.html.

### [INFO] I-2 `_headers` is sensible for Netlify or Cloudflare Pages — `public/_headers:1-18`
- Present and correct: `nosniff`, `strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `frame-ancestors 'none'`, HSTS for 1 year with includeSubDomains, and immutable caching only on hashed `/assets/*` and `/fonts/*`.
- Optional additions: `Cross-Origin-Opener-Policy: same-origin`, `X-Frame-Options: DENY` for legacy browsers, and `browsing-topics=(), payment=(), usb=()`.
- The owner should confirm no subdomain of harshalsaraogi.com is HTTP-only before HSTS ships.
- On a host that ignores `_headers`, only the meta CSP applies, so there is no clickjacking protection and `_headers` itself is served as a public file (harmless). The hosting question, Q-5, is still open.

### [INFO] I-3 The owner's own email and phone are published (FR-135) — `index.html:43-44,74`, `src/data/content.ts:541`
This is a deliberate owner decision. No other email appears in src/, index.html, public/ or scripts/. The only digit runs are SVG path data, test fixtures and the sitemap date. No testimonial signature data is published.

### [INFO] I-4 No leftover encrypted-asset or decrypt code
On HEAD, `git grep -inE "decrypt|encrypt|crypto\.subtle|\.enc\b|draco|\.glb"` (excluding .sdlc and the lockfile) returns 0 hits. `git ls-files` has no `.enc`, `.glb`, draco or encrypt/decrypt files. The template's old hard-coded password exists only in `main`'s history (`public/models/encrypt.cjs`). It is a third party's credential, not the owner's.

### [INFO] I-5 Résumé exemption is by basename, not path — `scripts/check-confidential.sh:17,30`
`! -name "$RESUME"` exempts any file called `Harshal_Saraogi_Resume.pdf` anywhere in the scanned tree (c34). Owner decision A-PRD-1 exempts the one supplied file. Tightening to `! -path 'public/Harshal_Saraogi_Resume.pdf' ! -path 'dist/Harshal_Saraogi_Resume.pdf'` would make the exemption exact. The risk is minimal: a second file with that exact name is unlikely.

## Checked and clean
- **Secrets in source, config and history:**
  - no real secret in any tracked file or commit (scan above);
  - the full `gho_` token is in no committed file or history (0 matches for `gho_[A-Za-z0-9]{20,}`);
  - `.env`, `*.local` and `.npmrc` are gitignored;
  - `import.meta.env` is read only for `DEV`, guarding two `console.warn` calls;
  - no sourcemaps in the build;
  - the committed Lighthouse reports contain no `/Users/` paths and no tokens.
- **Analytics and trackers:** none in src/ or the build. The gate's tracker patterns pass on the repo.
- **target=_blank:** the only element with it is `src/ui/ExternalLink.tsx:15`, which carries `rel="noopener noreferrer"`. `Button` sends `external` links through it (`src/ui/Button.tsx:41-46`). `window.open(contact.linkedin, '_blank', 'noopener,noreferrer')` is at `src/palette/commands.ts:98`. index.html, 404.html and the noscript block contain no `_blank`. `readable.test.tsx:86` asserts on every `_blank` link.
- **XSS:**
  - no `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval` or `javascript:` in src/ outside tests;
  - every href is a constant in `content.ts`, and all of them are `https:`, `mailto:`, `#` or same-origin;
  - the new `onAnchorClick` (`src/lib/scroll.ts:74-80`) only acts on hrefs in the `ANCHORS` allow-list (`isAnchorId`), and so does the `location.hash` landing (`src/App.tsx:14-15`). Neither builds selectors from input; both use `getElementById` with allow-listed ids.
- **Clipboard:** write-only, constant value (the owner's email), on a user gesture, with every error mapped to `'blocked'` and a manual fallback (`src/lib/clipboard.ts:7-16`). The clipboard is never read.
- **sessionStorage:** one key, value `'1'`, strict comparison, try/catch on both read and write (`src/lib/session.ts:7-21`). No cookies, localStorage, IndexedDB or postMessage listeners in src/.
- **Confidential strings in shipped paths:** 0 literal hits in src/, scripts/, index.html, public/ (PDF excepted) and the build. The only matches are test assertions that build the strings from parts, and the gate's own split variables.
- **Dev-server exposure:** closed (24-variant probe above).
- **Production dependencies:** `npm audit --omit=dev` reports 0 vulnerabilities.
