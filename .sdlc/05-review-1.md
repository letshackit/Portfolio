# Code review 1 — STORY-001..009 (branch revamp/mission-control)
**Verdict:** BLOCK
**Diff reviewed:** `git diff main...HEAD` = 0c81e60..e152d08 (4 commits, 245 files). The working tree is clean apart from the security auditor's own `.sdlc/` files, so there were no uncommitted source files to review.
**Build:** pass   **Tests:** pass (`npm test` → 13 files, 106 tests passed)

## How this was verified
- `npm run verify` → exit 0. eslint: no output. `tsc -b`: no output. vite build ok. sitemap written. Budgets: PASS NFR-5 126.7/300 kB, NFR-6 211.2/400 kB, NFR-8 184.4/1024 kB, FR-141 1698.4/5120 kB; entry chunk 24.7 kB gz. check-confidential: 4 PASS, WARN architecture 'proposed', OK.
- `npm test` → 13 passed (13), 106 passed (106).
- Own confidentiality grep over src, scripts, index.html, public (PDF excluded), dist and README for `people ?strong|abha|sinha|netlify`: the only hits are the gate script's split-up patterns and the word "Netlify" in the README hosting note. The only email addresses in the build are the owner's and the GSAP licence header (`jack@greensock.com` in a JS comment). The only phone number is the owner's. "SBI Life" appears once, in the Hippo history entry.
- **Runtime checks.** I built to a scratch folder (`build-review1`), served it with `vite preview` on :4199, and drove real headless Chrome through a small CDP script (`scratchpad/cdp.mjs`). The script sent real keyboard, mouse and wheel input and read computed styles and resource timing. Every finding marked CONFIRMED (runtime) below was reproduced this way.

## Findings

### [BLOCKER] In-page `#anchor` links skip `scrollToAnchor()` and break the page under ScrollSmoother — `src/hero/Hero.tsx:24`, `src/deployments/DeploymentCard.tsx:71`, `src/capabilities/Capabilities.tsx:27`, `src/contact/Footer.tsx:13` (all rendered via `src/ui/Button.tsx:48-53` or a plain `<a>`)
**Failure scenario:** This is the primary desktop journey (architecture H.1): 1280×800, a mouse, motion allowed, so ScrollSmoother is attached.
- (a) A real mouse click on the hero's primary CTA "See deployments" makes the browser do a native fragment jump. That jump scrolls the fixed, `overflow:hidden` `#smooth-wrapper` itself. Measured: `wrapper.scrollTop = 2024` while `scrollY = 0`. Forty wheel-up events later, `#top` is still at `top = -2024`. **The hero, and the top 2024 px of the page, cannot be scrolled back to.** The content jumps by about 2000 px the next time something takes focus, because ScrollSmoother's `focusin` handler resets `wrapper.scrollTop`.
- (b) Footer "Back to top" with the page scrolled to the end (`scrollY = 9932`). After the click the hash becomes `#top`, but `scrollY` stays 9932 and the hero stays at `-9932`. **The link does nothing** (FR-116).
- (c) The TravelDesk card's "See the architecture" link, clicked after (a): `#architecture-heading` lands at `top = -279`, off screen (FR-78).
- The four capability proof links use the same plain-anchor pattern.

In native mode (reduced motion, under 1024 px, or touch) these links work but never move focus to the heading.
**Why:** ADR-002 names hash jumps as a known ScrollSmoother desync risk, and B.7.8 says Back to top "calls `scrollToAnchor('top', { focus: true })`". Only the header links, the mobile menu, the palette and the hero stage buttons go through the scroll seam. The CTA (FR-48), FR-78, FR-94 and FR-116 all break on the configuration the site is designed around.
**Suggested fix:**
1. Route every in-page `href="#…"` through the seam, either with an `InPageLink`/`Button` branch that does `isPlainClick → preventDefault → scrollToAnchor(id, { focus: true })`, or with one delegated `click` listener for `a[href^="#"]` in `scroll.ts` while a smoother is attached. Keep the real `href` for no-JS and crawlers.
2. As a backstop, while the smoother is attached, add a `hashchange`/`scroll` listener on the wrapper that resets `wrapper.scrollTop = 0`.
3. Add a test that clicks every `a[href^="#"]` in `<Shell>` (except the skip link) and asserts that `scrollToAnchor` was called.

**Confidence:** CONFIRMED (runtime, real mouse click and wheel input in Chrome)

### [MAJOR] The MENU button is visible, focusable and opens the mobile menu at ≥ 900 px — `src/nav/Header.css:165`, `src/ui/ui.css:44`
**Failure scenario:** At 1280 px, `#menu-button` has computed `display:flex` and a box of 84×44 px at x=1148. It sits in the Tab order right after the palette button (Tab walk: "…Contact → Open command palette → MENU → See deployments"). Clicking it opens the mobile-menu dialog on desktop, next to the inline nav.
**Why:** `.site-header__menu-btn{display:none}` and `.btn{display:inline-flex}` have the same specificity, and `.btn` comes later in the bundle (byte 25551 against 24134), so `.btn` wins. This contradicts E.2 ("At ≥ 900 px the menu is not rendered").
**Suggested fix:** Raise the specificity, for example `.site-header .site-header__menu-btn { display: none }` inside the 900 px query. Alternatively, do not render the button at ≥ 900 px (Header already has a matchMedia for 900).
**Confidence:** CONFIRMED (runtime computed style and Tab walk)

### [MAJOR] The hero text flashes at the end of the boot screen — `src/App.tsx:31-36`, `src/boot/BootScreen.tsx:30-37`, `src/hero/Hero.css:121-146`
**Failure scenario:** On a first visit with motion allowed, the boot fades out over 200 ms (boot opacity 0.44, then 0.07, then 0.005), and the hero `h1` underneath sits at opacity 1. When `onDone` fires, `data-entered` is set and `hero-enter` (`backwards` fill) drops the `h1` to opacity 0. It then fades back in (0, 0.12, 0.64, …, 1 by about 2.3 s). The headline is visible, vanishes, then reappears. This happens on every first visit, on every device.
**Why:** E.1 sets `data-entered` at `ending` (1500 ms, before the fade). The code sets it at `done`, after the fade.
**Suggested fix:** Give BootScreen an `onEnding` callback, called from `end()` before `setPhase('ending')`, and call `enterHero()` there. Keep `onDone` for unmount, focus and the hash landing.
**Confidence:** CONFIRMED (runtime opacity sampled every 60 ms across the boot end)

### [MAJOR] The brand link has no accessible name below 768 px — `src/nav/Header.tsx:50-59`, `src/nav/Header.css:62-66`
**Failure scenario:** At 360 px the only visible child is the `aria-hidden` "HS" monogram, and `.site-header__name` is `display:none`, so screen readers get an unnamed link. Lighthouse mobile flags it: `link-name` score 0 in `.sdlc/reports/lighthouse-mobile.report.json`. This fails WCAG 2.4.4 and 4.1.2 (Level A), which NFR-12 requires.
**Suggested fix:** Add `aria-label={content.meta.name}` on the anchor, or hide the name with `.visually-hidden` instead of `display:none` below 768 px.
**Confidence:** CONFIRMED (Lighthouse audit and CSS)

### [MAJOR] Hero stage buttons fail Label in Name — `src/hero/PipelineOverlay.tsx:58-75`
**Failure scenario:** The visible text is "01" plus `shortLabel` (for example "Jira + Confluence"), but the accessible name is `aria-label="Jira and Confluence (5/7)"`. A voice-control user who says "click Jira plus Confluence" or "click 05" gets no match. Lighthouse flags `label-content-name-mismatch` (score 0). This fails WCAG 2.5.3 (Level A), part of NFR-12. The architecture's C.4 sample markup has the same flaw, so the implementer should deviate from it deliberately.
**Suggested fix:** Drop `aria-label`, take `aria-hidden` off the visible spans, and add a visually hidden suffix such as ", stage 5 of 7". The name then starts with the visible text.
**Confidence:** CONFIRMED (Lighthouse audit)

### [MINOR] The 3D chunk downloads during the boot, before the hero text is on screen — `src/hero/PipelineFrame.tsx:66-83`
**Failure scenario:** On a first visit at 1280 px, resource timing shows `three-*.js` starting at 141 ms and `Pipeline3D-*.js` at 141 ms. The boot covers the hero until 1700 ms. NFR-7 and FR-53 say the 3D chunk starts "only after the hero text is on screen", and H.1 orders the 3D import after the boot. The impact is small on broadband: about 217 kB gz competes with the boot on slow links, and the watchdog measures frames while the boot overlay is up.
**Suggested fix:** Expose a `booting` or `bootDone` flag (UiContext) and add it to the gate before `waitForQuiet()`.
**Confidence:** CONFIRMED (runtime resource timing)

### [MINOR] Pressing Cmd/Ctrl+K during the boot leaves the modal palette open with focus outside it — `src/App.tsx:34`, `src/boot/BootScreen.tsx:52-57`, `src/palette/CommandPalette.tsx:30-38`
**Failure scenario:** At 600 ms into a first visit, press Ctrl+K. The palette opens and its input has focus. At boot end, `onBootDone` focuses `#page-start`, so `inPalette` becomes false while the `aria-modal` palette is still open. Escape no longer closes it, because the handler sits on the dialog element.
**Suggested fix:** Ignore the chord while booting, or skip the page-start focus in `onBootDone` when `paletteOpen` is true.
**Confidence:** CONFIRMED (runtime)

### [MINOR] Visible strings live outside the content file (FR-3) — `src/architecture/archCopy.ts:7-21`, `src/lib/platform.ts:10`
**Failure scenario:** Changing the diagram caption, legend or kind labels, or the "CMD K"/"CTRL K" shortcut text, needs a code edit. `content.architecture.lead` ("Hover or focus a service…") is never rendered, and `archCopy.captionDefault` duplicates it under different wording.
**Suggested fix:** Move these strings into `content.ui` or `content.architecture` and delete `archCopy.ts`.
**Confidence:** CONFIRMED

### [MINOR] No navigation landmark below 900 px (NFR-17) — `src/nav/Header.css:68-70`, `src/nav/MobileMenu.tsx:66-75`
**Failure scenario:** At 360 px the `<nav>` is `display:none`, so it is not in the accessibility tree. The mobile menu is a `role="dialog"` with a bare `<ul>`. A screen-reader user's landmark list has no navigation region, and the menu, when open, is not one either.
**Suggested fix:** Wrap the menu's `<ul>` in `<nav aria-label={content.ui.navLabel}>`.
**Confidence:** CONFIRMED (code and CSS)

### [MINOR] Re-selecting the stage that is already selected leaves focus behind — `src/how/Stepper.tsx:20-22, 57-59`
**Failure scenario:** Click hero stage 3, scroll back up, and click stage 3 again. `setSelectedStage('ux')` does not change state, so the focus effect does not run. The page scrolls to How I work while focus stays on the hero button, which is now off screen, and the next Tab scrolls back to the hero. This partly breaks FR-60.
**Suggested fix:** Keep a selection counter or nonce in UiContext, or have the overlay focus the tab itself after `scrollToAnchor` resolves.
**Confidence:** CONFIRMED (code reading; deterministic React bail-out)

### [MINOR] A repeated toast is neither re-announced nor kept visible — `src/ui/Toast.tsx:10-14`, `src/app/providers/UiProvider.tsx:26`
**Failure scenario:** Run "Copy email" at t=0 and again at t=2.0 s. `showToast('Email copied')` with the same string does not change state, so the timer is not restarted. The toast hides at 2.4 s, only 0.4 s after the second action (FR-39 says "at least 2 seconds"), and screen readers hear nothing the second time. The implementer listed this as a known gap.
**Suggested fix:** Store `{ message, id }` with an incrementing id, key the effect on the id, and clear then re-set the live-region text.
**Confidence:** CONFIRMED (code reading)

### [MINOR] The palette listbox owns a non-option paragraph — `src/palette/CommandPalette.tsx:211-215`
**Failure scenario:** `ul[role=listbox] > li[role=presentation] > p` puts a paragraph directly under the listbox. axe `aria-required-children` normally reports this. I could not run axe (it is not installed), and Lighthouse ran with the palette closed.
**Suggested fix:** Put `aria-hidden="true"` on the `<p>`, since the group already has `aria-labelledby`, and give the group `aria-label` instead.
**Confidence:** PLAUSIBLE

### [MINOR] Reveal animations escape `gsap.context`, so dispose and re-init misbehave — `src/lib/motion.ts:53-90, 109-126`
**Failure scenario:** `SplitText.create` and `gsap.from` run inside the ScrollTrigger `onEnter` callback, after the `gsap.context()` function has returned, so `ctx.revert()` does not track them. If a resize across 1024 px, a pointer-type change or a switch to reduced motion happens mid-reveal, the split lines and the mask wrappers stay in the DOM. After re-init, `bindReveals` also re-binds headings that were already revealed and are now below the 85 % line, so they hide and replay.
**Suggested fix:** Wrap the callback work in `ctx.add(() => …)`, and mark revealed elements (for example `data-revealed`) so they are skipped on re-bind.
**Confidence:** PLAUSIBLE (from GSAP context semantics; not reproduced in a browser)

### [NIT] Index keys on static geometry lists — `src/architecture/ArchDiagram.tsx:63`, `src/hero/three/Edges.tsx:32`, `src/hero/three/StageNodes.tsx:55`
The lists never reorder, so this is harmless. Edge or stage ids would match the "keys from stable ids" convention.

### [NIT] The boot consumes reload and other browser shortcuts — `src/boot/BootScreen.tsx:52-57`
`preventDefault()` runs on every non-modifier key, so F5 and Ctrl/Cmd+R are swallowed during the 1.7 s boot. Ending the boot only needs `preventDefault` for Space and Enter.

### [NIT] `aria-controls` on unselected tabs points at panels that are not in the DOM — `src/how/Stepper.tsx:102`
Only the selected panel is rendered. Set `aria-controls` only on the selected tab, or render all panels with `hidden`.

## Verified as correct
- **Build health:** lint 0/0, `tsc -b` clean under `strict` + `noUnused*`. No `any`, no default exports. Promises are deliberately `void`ed. `copyText` never rejects. Effects clean up their listeners, timers and observers (Boot, Menu, Palette, Header, Cursor, Scene, Edges, useOffscreenPause, UiProvider, useMotion with a `disposed` guard).
- **Budgets:** I ran `check-budgets.mjs` myself. Its classification is right: the three chunk is separate, and both motion chunks plus Pipeline3D count toward NFR-5, which is conservative. `dist/index.html` has a modulepreload only for vendor-react. The entry has no static gsap or three import.
- **Chunk gating at runtime:** at 1280 px with reduced motion, only index and vendor-react load and the frame stays `svg`. At 360 px with motion allowed, there is no three request (motion chunks load after the boot, as designed). At 1280 and 800 px with motion allowed, three loads and `data-mode` becomes `3d`.
- **3D overlay alignment at rest:** the projected `--px-i/--py-i` are 8/22/36/50/64/78/92 % × 50 %, identical to the static `toPercent`. The button centres sit 165 px apart on a 1184×403 frame. The canvas fills the padding box. The contract variables are removed on unmount.
- **3D lifecycle:** Edges dispose their tube geometries. The sim clamps dt to 50 ms. The watchdog ignores deltas over 250 ms (a resumed loop), degrades once (dpr 1, 12 packets), then fails over to SVG. Context loss calls `preventDefault` and fails over to SVG. ThreeBoundary catches render errors. The import races an 8 s timeout and clears the timer. `frameloop` is `never` while paused (10 % IntersectionObserver threshold, or the tab is hidden).
- **Keyboard under ScrollSmoother:** 36 Tab presses through hero, stepper, deployments and architecture keep `wrapper.scrollTop` at 0, with every focused element on screen (ScrollSmoother's `focusin` handler). Header link → `#history` lands the heading at 211 px with focus on `history-heading` and `aria-current` on History. Hero stage click → heading at 212 px with focus on `stage-tab-ux`, in both smoother and native modes. Skip link → `main` focused at top 0.
- **Hash landing:** `/#contact` with the boot and smoother lands the heading at 211 px with focus on it. `/#history` under reduced motion does the same. AC-8 and FR-2 hold.
- **Layout:** no horizontal overflow at 360/768/1024/1280/1600 (FR-4). At 360 px no interactive element is under 44 px (FR-117, NFR-20). Body text is 16 px or more and mono text 12 px or more (FR-5). Headline and first status row fit within 640 px at 360 wide (FR-50, bottom at 520).
- **Reduced-motion matrix (code):** no boot; LiveDot pulses only when `live && !reducedMotion`; SVG packets stay still unless `no-preference`; GSAP and three are never requested (runtime-verified); the global `animation:none` / `transition-duration:0` rule applies.
- **Dialogs:** the palette traps Tab, Escape closes it, focus returns to the opener or falls back to `#menu-button`, and "Go to" closes without restoring focus before `scrollToAnchor` focuses the heading. The menu traps Tab, closes on Escape and outside press, and returns focus to the button. `lockScroll` is reference counted and hands over correctly when the smoother attaches or detaches.
- **Content:** every number in `content.ts` traces to `resume.md`. The five testimonials are word for word (the ITC pull-quote matches the suggested pull-quote). There are no testimonial signature contacts, and the PDF exclusion follows A-PRD-1.
- **Static HTML:** canonical, OG, Twitter, JSON-LD and noscript are present before JS runs. The CSP does not break `vite dev`, which I rendered in headless Chrome: the React refresh preamble is injected before the meta CSP.
