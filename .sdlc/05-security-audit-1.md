# Security audit 1
**Verdict:** BLOCK (one HIGH; no CRITICAL)

**Scope:** branch `revamp/mission-control` (ca4ac11..e152d08) vs `main`, working tree clean (no uncommitted files; ignored: dist/, node_modules/, .DS_Store, *.tsbuildinfo). Reviewed: index.html, public/{_headers,404.html,robots.txt,sitemap.xml,favicon.svg,fonts/,Harshal_Saraogi_Resume.pdf (active content and metadata only)}, every external link and browser API call in src/, scripts/*.sh|*.mjs, vite.config.ts, package.json, .gitignore, git history (all refs), the local repo config that the dev server can reach, and a scratch production build.

**Scanners run (real output):**
- `npm audit --omit=dev` -> `found 0 vulnerabilities` (exit 0)
- `npm audit` -> `17 vulnerabilities (1 low, 5 moderate, 9 high, 2 critical)` (exit 1). All of them are in dev tooling: tinypool (critical, via vitest), @vitest/mocker, vitest, vite/vite-node/esbuild (GHSA-67mh-4wv8-2f99), brace-expansion, browserslist, flatted, js-yaml, nanoid, picomatch, postcss, source-map-js, @babel/core, @humanfs/node, baseline-browser-mapping. None ships in the build. Reachability is covered in finding L-4.
- `sh scripts/check-confidential.sh` -> 4 PASS, WARN architecture 'proposed', `check-confidential: OK`, exit 0
- Planted-string tests against `scripts/check-confidential.sh <scratch dir>` (results in L-1; scratch files removed)
- `git log --all -p` grepped for token and key formats (gho_/ghp_/github_pat_/AKIA/AIza/sk-/xox/PEM headers/GA and GTM ids/api_key). Only false positives: minified Draco wasm glue and words like "desk-architecture". No real secret was ever committed.
- `npx vite build --outDir <scratchpad>/build-security-1`. Inspected the built index.html, the assets/*.js and *.css, and the listing of the output folder.
- Local-only check of the Vite dev server, bound to 127.0.0.1 (finding H-1). The server was stopped afterwards.

## Findings

### [HIGH] Live GitHub OAuth token in the git remote URL, served by the dev server to the local network — `.git/config:9`, `package.json:7`, `vite.config.ts:36`
**Exploit path:** The `origin` remote URL embeds a GitHub OAuth token (`gho_…`, the rest not reproduced here) in plain text. `npm run dev` is `vite --host` (package.json:7, inherited from main). The branch adds `server: { host: true }` (vite.config.ts:36, commit ca4ac11), so even a bare `npx vite` now listens on every interface. Vite 5.4.21's default `server.fs.deny` is only `['.env', '.env.*', '*.{crt,pem}']` (node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:63488). It does not cover `.git/`, and in dev mode sirv serves dotfiles from the project root. I verified this locally on 127.0.0.1: `GET /.git/config` -> `HTTP 200`, body contains the `gho_` token. The same request also returns `/.sdlc/00-inputs/testimonials.md` (names the SBI Life contact) and `/.sdlc/00-inputs/resume.md` (names the HRIS vendor) with 200. So anyone on the same Wi-Fi or LAN can fetch `http://<laptop-ip>:5173/.git/config` while the owner or an agent runs `npm run dev`, and read the token.
**Impact:** A `gho_` token normally carries `repo` scope for the `letshackit` account. That means read and write access to all of the account's repositories, private ones included. The attacker could push to `letshackit/Portfolio`; if the host auto-deploys from it, that is a defacement or malicious-JS path on harshalsaraogi.com. Separately, the token has already been printed into local agent transcripts by `git remote -v`, including this audit's own tool output. Any malicious install script in the large dev dependency tree can also read it from `.git/config`.
**Fix (owner, not code):** revoke the token at GitHub (Settings -> Applications / Developer settings, or `gh auth logout` + re-login). Then reset the remote to `https://github.com/letshackit/Portfolio.git` with no credentials in it, and use the macOS keychain credential helper. **Fix (implementer):** remove `server: { host: true }` from vite.config.ts. Change `"dev"` to plain `vite`, and if LAN testing is ever needed add a separate opt-in `"dev:lan": "vite --host"`. Add `server.fs.deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.sdlc/**']`. Do not apply this to `vite preview`, which serves dist/ only.
**Confidence:** CONFIRMED that the token is present and that the dev server serves it (tested on loopback). Reaching it from another machine over the LAN follows from the config and the `--host` flag, but I did not test it from a second machine.

### [MEDIUM] `.sdlc/` decision record holds confidential names and is committed to a GitHub remote — `.sdlc/00-inputs/testimonials.md`, `.sdlc/00-inputs/resume.md`, `.sdlc/00-inputs/brief.md`, `.sdlc/00-prd.md`, `.sdlc/HANDOFF.md`
**Exploit path:** The hard constraints cover src/, scripts/, index.html, public/ and the build, and those are clean. But tracked files under `.sdlc/` contain the HRIS vendor name (brief.md 1x, resume.md 1x, HANDOFF.md 4x) and the SBI Life contact's name (testimonials.md 1x, 00-prd.md 2x, HANDOFF.md 2x). The quote itself is not stored anywhere in the repo. The remote is `github.com/letshackit/Portfolio`. If that repository is public, pushing this branch publishes those names, together with the contact's own request not to be posted.
**Impact:** Exposure of a confidential vendor relationship and of a third party who asked not to be named publicly.
**Fix:** the owner confirms the GitHub repo is private before any push, or moves `00-inputs/` out of the committed tree, or replaces the two names in `.sdlc/` with placeholders. The confidentiality script should also scan `.sdlc/` if the repo is or will be public.
**Confidence:** PLAUSIBLE. I did not check the repo's visibility, because that needs a network call I did not make.

### [LOW] L-1 Gaps in the confidentiality gate — `scripts/check-confidential.sh:14-16,20,29`
**What I tested:** strings planted in a scratch directory, run through `sh scripts/check-confidential.sh <scratch>`. Exit 1 means the gate caught it.

| Planted string | Exit |
|---|---|
| vendor joined / UPPER / space / hyphen / underscore / NBSP | 1 (caught) |
| author name, normal case and UPPER with a double space | 1 (caught) |
| retired host, `gtag(` | 1 (caught) |
| vendor written with `&nbsp;` between the words | 0 (missed) |
| vendor with a `.` between the words | 0 (missed) |
| vendor with a zero-width space between the words | 0 (missed) |
| vendor split over two lines of JSX | 0 (missed) |
| author split over two lines of JSX | 0 (missed) |
| vendor inside a non-résumé `notes.pdf` | 0 (missed) |
| `AKIA…`, `-----BEGIN RSA PRIVATE KEY-----`, `ghp_…` | 0 (missed) |
| path that does not exist | 0 (fails open) |

**Exploit path:** this is an accidental leak, not an attacker. A future copy edit wraps the vendor name across a JSX line break, or writes it with `&nbsp;`. Running `npm run check:confidential` with no dist/ present (for example after a fresh clone) passes. The JSX case is only caught once dist/ exists, because JSX collapses the line break into a space in the built string. `npm run build`, which is what a static host normally runs, does not call the gate at all; only `npm run verify` does. `--exclude='*.pdf'` exempts every PDF, but owner decision A-PRD-1 exempts only the résumé. `2>/dev/null` hides "no such file" errors, so a mistyped target path passes.
**Fix:** run multiline matching on the vendor and author patterns (`grep -Pzo` or `perl -0ne`). Allow `[^A-Za-z0-9]{0,8}` or `&nbsp;` between the parts, and strip zero-width characters before matching. Exclude only `public/Harshal_Saraogi_Resume.pdf`. Fail when a target path is missing. Add AKIA / gh[opsu]_ / github_pat_ / PEM / AIza patterns to the secret scan. Chain the gate into `build` (for example `"build": "tsc -b && vite build && sh scripts/check-confidential.sh dist"`), or document that the host must run `npm run verify`.
**Confidence:** CONFIRMED (tested).

### [LOW] L-2 `public/.DS_Store` ships in the build output — `public/.DS_Store`
**Exploit path:** `.gitignore` keeps the file out of git, but Vite copies all of `public/` into the build: `<scratch>/build-security-1/.DS_Store` (6148 B) is present, and so is the existing `dist/.DS_Store`. A visitor can fetch `https://harshalsaraogi.com/.DS_Store` and read the folder names it records: `draco`, `images`, `models`.
**Impact:** Minor information disclosure (old template folder names). It shows sloppiness more than it leaks anything.
**Fix:** delete `public/.DS_Store` (and `src/.DS_Store`), and add a budgets or confidentiality check that fails on any dotfile in dist/ other than `_headers`.
**Confidence:** CONFIRMED.

### [LOW] L-3 Lighthouse script runs an unpinned package from the registry — `scripts/lighthouse.sh:16`
**Exploit path:** `npx --yes lighthouse` downloads and runs whatever version is current, with no lockfile and no prompt, on the owner's machine. That machine holds the token from H-1. It is a supply-chain exposure if the package or one of its dependencies is compromised.
**Fix:** pin a version (`npx --yes lighthouse@12.x.y`) or add it as a devDependency so the lockfile and `npm audit` cover it.
**Confidence:** PLAUSIBLE. It depends on an upstream compromise.

### [LOW] L-4 Dev-dependency advisories (17; 2 critical, 9 high) — `package.json` devDependencies
**Reachability:** none of them reach the shipped site; `npm audit --omit=dev` reports 0. tinypool (critical, prototype-pollution gadget to RCE) and @vitest/mocker (code injection or file read through mock registration) need an attacker-controlled input or an exposed Vitest API or UI server. Here Vitest runs `vitest run` with jsdom on our own files. postcss, @babel/core, source-map-js, brace-expansion, picomatch, js-yaml, flatted, nanoid and browserslist only process this repo's own trusted sources. esbuild GHSA-67mh-4wv8-2f99 concerns esbuild's own `serve()`, which Vite does not use; Vite 5.4.21 already ships the CORS and fs.deny fixes from 5.4.12–5.4.19. The real dev-server exposure is H-1.
**Fix:** in a step that is allowed to run npm install, run `npm audit fix` (non-breaking). Track the Vitest 2 -> current upgrade, which needs Vite 6+, with the Vite upgrade instead of forcing it now.
**Confidence:** CONFIRMED (scanner output); not reachable.

### [INFO] I-1 CSP is coherent; notes for tightening — `index.html:6-7`, `public/_headers:2`
The meta policy and the header policy are identical, except that `frame-ancestors 'none'` appears only in the header, as it must. Checked against the scratch build:
- **Scripts:** the build emits one external module script and one `modulepreload`, plus the JSON-LD data block. The browser parses JSON-LD as data, not script, so `script-src 'self'` does not block it.
- **Fonts:** self-hosted at `/fonts/*`, covered by `font-src 'self'`.
- **Network calls:** the only `fetch(` in the bundles is Vite's same-origin modulepreload polyfill.
- **No dynamic code:** no `eval`, `new Function`, workers, WebSocket or sendBeacon.
- **External URLs:** the only ones in the bundles are link targets or library comments (gsap.com, w3.org namespaces, linkedin, github, the journal).
- **Styles:** `'unsafe-inline'` is needed, because GSAP calls `setAttribute("style", …)` (motion chunk) and 404.html has an inline `<style>`. It could be narrowed to `style-src 'self'; style-src-attr 'unsafe-inline'`, plus a hash for 404.html. The risk is low because no user content is rendered.
- **Dev mode:** the dev-only React Refresh inline preamble comes before the meta tag, so the meta CSP does not block it.

### [INFO] I-2 `_headers` is sensible for Netlify or Cloudflare Pages — `public/_headers:1-18`
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` and `frame-ancestors 'none'` are all present and correct.
- HSTS `max-age=31536000; includeSubDomains`: the owner should confirm that no subdomain of harshalsaraogi.com is HTTP-only before launch.
- Optional additions:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `X-Frame-Options: DENY`, for old browsers
  - `payment=(), usb=(), browsing-topics=()` in Permissions-Policy
- On a host that ignores `_headers`, only the meta CSP applies, so framing (clickjacking) protection is lost. Q-5 is still open.

### [INFO] I-3 Owner's phone and email are published in the JSON-LD and the Contact section — `index.html:43-44`, `src/data/content.ts:540-542`
This follows owner decision FR-135, and the values match resume.md. They will be harvested by scrapers and spam lists. No other phone number or email appears in src/ or index.html (grep for digit runs, excluding the owner's number, returned 0 hits).

### [INFO] I-4 Old template encryption code is gone from the branch; its hard-coded password remains in main's history — `main:public/models/encrypt.cjs:16`
On HEAD, `git grep -iE "decrypt|encrypt|crypto.subtle|\.enc"` (excluding .sdlc and the lockfile) returns nothing. No `.enc`, `.glb`, draco or decrypt files are tracked. main still has the template's `encrypt.cjs` with a hard-coded password (`Char…`) for a third-party template model. It is not the owner's credential and needs no action.

## Checked and clean
- **Secrets in source, config and history:** none in tracked files or in any commit (scan above). No `.env` was ever committed; `.env` and `.npmrc` are in .gitignore. No `import.meta.env` values are read except `DEV`. The build has no sourcemaps. The only console output is two `console.warn` calls behind `import.meta.env.DEV`.
- **Analytics and trackers:** none. `@vercel/analytics` is removed; no gtag, GTM, GA, Plausible, Mixpanel or Segment in src/ or the build.
- **target=_blank:** the only occurrence is `src/ui/ExternalLink.tsx:15`, with `rel="noopener noreferrer"`. `Button` routes external links through it (`src/ui/Button.tsx:41-46`). The palette's LinkedIn command uses `window.open(url, '_blank', 'noopener,noreferrer')` (`src/palette/commands.ts:98`). The noscript links do not open new tabs.
- **XSS:** there is no `dangerouslySetInnerHTML`, `innerHTML`, `insertAdjacentHTML`, `document.write` or `eval` outside tests. The palette query is rendered only as React text and an input value. `location.hash` is checked against the anchor allow-list (`isAnchorId`, `src/App.tsx:14-15`) before use. All hrefs come from constants in content.ts; none take user input.
- **Clipboard:** write-only, on a user click, with a constant value (`src/lib/clipboard.ts:7-16`). Failure leads to a manual-copy fallback, with no error leak. The clipboard is never read.
- **sessionStorage:** one key, value `'1'`, compared strictly, wrapped in try/catch (`src/lib/session.ts`). No cookies, localStorage or IndexedDB.
- **Confidentiality of shipped files:** 0 hits for the vendor, the SBI Life contact's name or the old Netlify host in src/, scripts/, index.html, public/ (PDF excluded per A-PRD-1) and dist/. The branch's diff history for those paths adds 0 such strings. testimonials.md contains no phone numbers or emails from signatures.
- **Résumé PDF:** no `/JavaScript`, `/OpenAction`, `/Launch`, `/EmbeddedFile` or `/AA` objects. Metadata: Author "Un-named", Creator "Microsoft Word", so no path or account leak.
- **SVG assets:** favicon.svg and og-image.svg contain no scripts, event handlers or external references.
- **Production dependencies:** `npm audit --omit=dev`: 0 vulnerabilities.
