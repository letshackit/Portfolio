# Code review 2 — STORY-001..009 (branch revamp/mission-control), after rework round 1
**Verdict:** APPROVE WITH CHANGES
**Diff reviewed:** `git diff main...HEAD` = 0c81e60..9488101 (5 commits, 247 files). I read the rework commit 9488101 in full, line by line. The working tree had no uncommitted source; the only uncommitted files are the parallel security auditor's `.sdlc/` files.
**Build:** pass   **Tests:** pass (`npm test` → 13 files, 107 tests passed)

## How this was verified
- `npm run verify` → exit 0. `eslint .` exit 0, `tsc -b` exit 0, vite build ok, sitemap written (lastmod unchanged, so git shows no diff).
  - Budgets: PASS NFR-5 126.8/300 kB, NFR-6 211.2/400 kB, NFR-8 184.6/1024 kB, FR-141 1692.8/5120 kB; entry chunk 24.8 kB gz.
  - check-confidential: 5 PASS (including the new `.DS_Store` check), WARN architecture 'proposed', OK.
- `npm test` → `Test Files 13 passed (13)`, `Tests 107 passed (107)`.
- **Runtime.** I built to `scratchpad/build-review2` and served it with `vite preview` on :4199. I drove headless Chrome 1280×800 over CDP (`scratchpad/r2.mjs`) with real mouse, wheel and keyboard input, the same way as review 1. Motion was on, so ScrollSmoother was attached (the content transform was `matrix3d`) and `data-mode` was `3d`.
- **Accessibility.** I ran **axe-core 4.14** (the engine Lighthouse uses, taken from the local npx cache; nothing installed) at 360 px and 1280 px, with reduced motion, with motion, with the palette open and with the mobile menu open.
- **Dev server (H-1).** `npx vite --port 5791` printed `Network: use --host to expose`. `/.git/config`, `/.git/HEAD`, `/.sdlc/00-inputs/testimonials.md`, and the `?raw`, `?import&raw`, `/@fs/…` and `%2e` variants all returned 403. `/.git%2fconfig` and `/.env` returned 200, but the body is the SPA fallback `index.html` (no `.env` exists). Servers stopped afterwards.

## Review-1 findings: claimed fix vs. actual state

| Review-1 finding | Claimed | Verified state |
|---|---|---|
| BLOCKER in-page `#` links bypass the scroll seam | fixed | **FIXED (runtime).** Hero "See deployments" → `wrapper.scrollTop` 0, `scrollY` 1804, focus `deployments-heading`. Then 40 wheel-ups reach `scrollY` 0 with the hero at `top 0`. "See the architecture" → focus `architecture-heading` on screen (top 376). Capability proof link → `#deployments`, focus on heading, wrapper 0. Footer "Back to top" from `scrollY` 9932 → `scrollY` 0, focus `top-heading`. Every `href="#…"` in `src/` now goes through `onAnchorClick`, `Header.go`, `MobileMenu.onLink` or `SkipLink.focusMain` (grep). |
| MAJOR MENU button visible ≥ 900 px | fixed | **FIXED (runtime).** Computed `display`: 899 px `flex`, 900 px `none`, 1280 px `none`. |
| MAJOR hero text flashes at boot end | fixed | **FIXED (runtime).** At 1545 ms: boot opacity 1.00 (`ending`), h1 0.00 under the still-opaque boot. The boot then fades (0.27, 0.07, 0.01) while the h1 rises (0.27, 0.64, 0.82 … 1.00). The headline no longer disappears after it has been seen. |
| MAJOR brand link has no name < 768 px | fixed | **FIXED** for `link-name`: axe no longer reports it, and the AX tree gives "Harshal Saraogi". The new `aria-label` does trip `label-content-name-mismatch`; see M-1. |
| MAJOR hero stage buttons fail Label in Name | fixed | **NOT FIXED per its own acceptance check.** axe 4.14 still reports `label-content-name-mismatch` (serious) on all 7 stage buttons at 360 px and at 1280 px with reduced motion. See M-1. |
| MINOR 3D chunk downloads during the boot | not addressed, no deferral recorded | **Still present.** `three-*.js` and `Pipeline3D-*.js` start at 119 ms on a first visit; the boot covers the hero until about 1700 ms. |
| MINOR Ctrl+K during the boot | not addressed | **Still present.** After the boot: `palette:true, active:"page-start", inPalette:false`. |
| MINOR strings outside content (archCopy.ts, platform.ts) | not addressed | Still present (`src/architecture/archCopy.ts` unchanged). |
| MINOR no nav landmark < 900 px | not addressed | Still present (`MobileMenu.tsx:75` has a bare `<ul>` in the dialog). |
| MINOR re-selecting the same stage leaves focus behind | not addressed | Still present (`Stepper.tsx:57-59` unchanged). |
| MINOR repeated toast not re-announced | not addressed | Still present (`Toast.tsx:10-14` unchanged). |
| MINOR palette listbox owns a `<p>` (PLAUSIBLE) | — | **Not reproduced.** axe 4.14 with the palette open reports no `aria-required-children` or `aria-required-parent` violation. Withdrawn. |
| MINOR reveals escape `gsap.context` (PLAUSIBLE) | not addressed | Code unchanged (`motion.ts:53-90`); still PLAUSIBLE. |
| H-1 dev server serves `.git/` (security) | fixed | **FIXED (runtime);** see "How this was verified". |
| L-1 / L-2 / L-3 (security) | fixed | Mostly fixed; one gap remains, see m-3. Full matrix: security-auditor round 2. |

Review 1 asked the implementer to "fix the MINORs or record why each is deferred". The rework block does neither for the seven code MINORs. That is a process gap, not a defect. They are carried forward below as one item (m-4).

## Findings

### [MAJOR] M-1 `label-content-name-mismatch` still fails on 9 controls; the stage-button fix did not clear the audit — `src/hero/PipelineOverlay.tsx:58,69-74`, `src/nav/Header.tsx:53-59`, `src/nav/Header.tsx:84-90`
**Failure scenario:** axe 4.14 on the built page, 1280 px, reduced motion → `label-content-name-mismatch [serious] x9`:
- `.site-header__brand`
- `button[aria-label="Open command palette"]`
- all seven `button[aria-label="0n <short>: <name> (n/7)"]`

At 360 px it reports 8 (the palette button's shortcut text is hidden there). Lighthouse runs the same rule, so review 1's acceptance check ("Lighthouse mobile shows no `label-content-name-mismatch`") still fails.

**Why:**
- **Stage buttons.** The visible text is two adjacent spans with no whitespace between them, so it computes as "01Research". "01Research" is not a substring of the name "01 Research: Research (1/7)". I confirmed the cause with a DOM-only experiment in the page (no source edited):
  - inserting one text node `' '` between the two spans, while keeping the new `aria-label`, clears the violation for that button;
  - review 1's suggested pattern (no `aria-label`, spans not hidden, visually hidden ", stage 1 of 7" suffix) also clears it.
- **Brand link.** The visible "HS" monogram (aria-hidden, but visible) is not in the name "Harshal Saraogi". Below 768 px "HS" is the only visible text, so a voice-control user who says "click HS" gets no match. This mismatch was introduced by the rework's `aria-label`.
- **Palette button.** The visible text is "⌘K" or "CTRL K", and it is not in the name "Open command palette". This was present in review 1 but not reported.

**Suggested fix:**
1. In `PipelineOverlay`, put `{' '}` between `.stage__num` and `.stage__label`. Better, follow review 1's pattern and drop the `aria-label`.
2. For the brand, drop the `aria-label`, take `aria-hidden` off the monogram, and hide the name with `.visually-hidden` (not `display:none`) below 768 px. The name then becomes "HS Harshal Saraogi". Removing both attributes in the page cleared the rule.
3. For the palette button, name it so that it contains the visible shortcut, for example `aria-label={`${openPalette} (${shortcutLabel()})`}`, plus `aria-keyshortcuts`.
4. Re-run axe or Lighthouse to confirm 0 violations.

**Confidence:** CONFIRMED (axe runtime, plus a DOM experiment proving the one-space cause)

### [MINOR] m-1 Under ScrollSmoother every anchor jump lands with the heading centred, not under the header — `src/lib/scroll.ts:93-109,122,133-138`
**Failure scenario:** 1280×800, motion on. Header link "Deployments" (and the hero CTA, palette Go to, and hero stage click) → `deployments` section top at **220 px**, heading at 376 px, so the last 164 px of the previous section stay on screen. In native mode the same click lands the section at 56 px and the heading at 212 px. An event trace explains it:

```
scroll 45 y=1968 · scrollend 45 y=1968 · focusin 45 deployments-heading top=2180 · scroll 62 y=1804
```

`smoother.scrollTo` moves the native scroll position at once, and only the content transform lags. `scrollend` therefore fires about 0 ms later, and `waitForSettle` resolves immediately. The heading is focused while it is still painted 2180 px down. ScrollSmoother's own `focusin` handler sees it off screen and calls `scrollTo(target, false, "center center")`, which overrides the `top 56px` target. `smoother.offset('#deployments','top 56px')` returns the correct 1968 (checked through the dev server's module graph), so the offset maths is right; the bug is the timing.
**Why:** E.4 specifies a tween with an `onComplete` and focus after completion. The implementer's step-5 note ("no scrollend in smoother mode, relies on the 650 ms fallback") is wrong: `scrollend` does fire, immediately. The result looks inconsistent between modes, and the landing contract (heading just below the header) holds only in native mode. Review 1's measurement of about 211 px in smoother mode does not reproduce on this build.
**Suggested fix:** In smoother mode, do not wait on `scrollend`. Either follow E.4 (`gsap.to(smoother, { scrollTop: y, duration: 0.6, onComplete })` exposed through the `SmootherHandle` seam), or wait until `smoother.scrollTop()` is within 1 px of the target before focusing. Returning `false` from `onFocusIn` for the duration of a programmatic jump also works.
**Confidence:** CONFIRMED (runtime trace and offsets)

### [MINOR] m-2 The anchor-routing regression test does not test routing — `src/__tests__/motion.test.ts:131-143`
**Failure scenario:** Replace `void scrollToAnchor(id, { focus: true })` in `onAnchorClick` with nothing, keeping `preventDefault`. The test still passes, because it asserts only `defaultPrevented`. A future in-page `<a href="#…">` added without the handler would also pass: review 1's suggested Shell-wide test (every `a[href^="#"]` except the skip link reaches the seam) was not written. A real-browser check caught the original blocker; a unit test would not have.
**Suggested fix:** Spy on `scrollToAnchor`, or assert `location.hash` and focus after the settle. Add the Shell-wide test: render `<Shell>`, click each `a[href^="#"]`, and assert that the event's default is prevented and the hash or focus changed.
**Confidence:** CONFIRMED (code reading; deterministic)

### [MINOR] m-3 The confidentiality gate skips any file whose path contains a space — `scripts/check-confidential.sh:30,44,50`
**Failure scenario:** A planted file `my file.tsx` containing the vendor name, joined → `sh scripts/check-confidential.sh <dir>` exits **0**. The same text in `a.tsx` exits 1. The cause is `echo "$FILES" | xargs …`, which splits the path on the space, so grep and perl are handed two paths that do not exist (errors go to `/dev/null`). No such file exists today, so the risk is latent. Other planted cases behaved as claimed:
- nbsp entity, zero-width space, author split across lines, a non-résumé PDF, `ghp_` token → exit 1
- the résumé file name → exempt (exit 0)
- missing path → exit 2
- `{'Vendor'}`/`{' Name'}` across two JSX lines, `'A' + 'B'`, and a template literal → exit 0 on source, but the rendered or constant-folded text lands in `dist/`. `npm run build` now runs the gate after `vite build`, so the build catches those.

**Suggested fix:** `find … -print0 | xargs -0 …`. Defer to security-auditor round 2 for the full matrix.
**Confidence:** CONFIRMED (planted-string run)

### [MINOR] m-4 Seven review-1 MINORs are unaddressed and undeferred
All seven were re-checked and are unchanged (details in review 1):
- 3D chunk loads during the boot: runtime, 119 ms. NFR-7 / FR-53, `PipelineFrame.tsx:66`.
- Ctrl+K during the boot leaves the modal palette open with focus outside it: runtime. `App.tsx:31-35`.
- archCopy.ts and platform.ts strings sit outside content.ts (FR-3).
- No navigation landmark below 900 px (NFR-17): `MobileMenu.tsx:75`.
- Re-selecting the same hero stage leaves focus behind (FR-60): `Stepper.tsx:57-59`.
- A repeated toast is neither re-announced nor kept visible (FR-39): `Toast.tsx:10-14`.
- motion.ts reveals escape `gsap.context`: PLAUSIBLE.

**Suggested fix:** Fix them, or record a per-item deferral with its reason in HANDOFF so QA does not re-raise them.

### [NIT] Two click-routing implementations — `src/nav/Header.tsx:15-17,41-45` vs `src/lib/scroll.ts:73-80`
`Header` keeps its own `isPlainClick` + `go`, which duplicates `onAnchorClick`. The brand link and the nav links could use `onAnchorClick` directly.

### [NIT] Index keys on static geometry lists (carried) — `src/architecture/ArchDiagram.tsx:63`, `src/hero/three/StageNodes.tsx:55`, `src/hero/three/Edges.tsx:32`

### [NIT] The boot still swallows F5 and Cmd/Ctrl+R (carried) — `src/boot/BootScreen.tsx:56-61`

## Verified as correct
- **Build health:** lint and `tsc -b` exit 0 under strict. No `any` and no default exports in `src/` (grep). Every promise-returning call is awaited or `void`ed: `scrollToAnchor` ×5 call sites, `command.run`, `copyText`, `import()` ×2.
- **Rework code:**
  - `onAnchorClick` keeps modified and middle clicks native and ignores ids that are not anchors. It is wired only where `href` starts with `#`, so `Button` downloads and external links are untouched.
  - `onEnding` is called exactly once, guarded by `phaseRef`, before `setPhase('ending')`. `onDone` still owns unmount, page-start focus and the hash landing.
  - The Header.css specificity fix works at the 900 px boundary. `vite.config.ts` keeps the default deny entries and adds `.git` and `.sdlc`.
  - `npm run build` now chains the gate after `vite build`, so a host build that runs `npm run build` scans `dist/`.
- **Hash landing:** `/#contact` at 1280 with the smoother puts the heading at 211 px with focus on it and the wrapper at 0. At 360, `/#history` puts the heading at 146 px with focus on it.
- **Skip link under the smoother**, activated with the page scrolled to 6000: focus goes to `main`, and the wrapper stays at 0 (no desync).
- **Accessibility (axe 4.14):** the only rule that fails anywhere is `label-content-name-mismatch` (M-1). No `link-name`, `aria-required-children`, `color-contrast`, `landmark-*`, `region`, `heading-order`, `button-name` or `nested-interactive` violations at 360 or 1280, with the palette open, with the mobile menu open, or in 3D mode.
- **3D lifecycle (code, unchanged since review 1):**
  - The projector writes and cleans up `--px-i/--py-i`.
  - Context loss calls `preventDefault` and fails over to the SVG.
  - The watchdog is memoised on stable callbacks.
  - `frameloop` is `never` while paused, with a 10 % IntersectionObserver threshold plus `tabHidden`.
  - The import races 8 s and clears its timer. Runtime `data-mode` reaches `3d` at 1280 with motion.
- **Confidentiality:** grep over `src scripts index.html public dist README.md` (résumé PDF excluded) for the vendor and the SBI Life author → only the gate script's split variables. The only emails are the owner's and the GSAP licence comment. The only phone number is the owner's (3 formats). "SBI Life" appears once, as a client name, which matches resume.md:80. No quote from that author appears anywhere. There is no `.DS_Store` under `src/` or `public/` (the one in the repo root is gitignored and outside the gate's targets).
- **Budgets:** I read the `check-budgets.mjs` output myself; its classification is unchanged and still conservative (both motion chunks and Pipeline3D count toward NFR-5).
