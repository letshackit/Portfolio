# ADR-007 — GSAP and all motion code live in a chunk that is loaded after first paint and never under reduced motion

**Status:** Proposed (for the owner gate) · 2026-10-25 · architect

## Context

FR-6 says that with reduced motion nothing moves and all text is visible at load; FR-7 says text is never hidden waiting for an animation, even if the animation code fails to load; FR-14 says nothing moves unless it stands for work. NFR-1/4 want a small, non-blocking start. GSAP core + ScrollTrigger + ScrollSmoother + SplitText measure 53 kB gz. The current site imports GSAP statically, hides headline text before SplitText runs, and animates decoratively.

## Options

1. **Static import of GSAP**, guard each animation with a reduced-motion check. Simple; 53 kB and plugin registration on every load; reduced-motion correctness depends on remembering every guard.
2. **Dynamic `import('./lib/motion')` after first paint, only when `!reducedMotion`.** Reduced-motion visitors never download GSAP; FR-6 becomes structural; FR-7 is enforced by rule: nothing in CSS pre-hides text, and `motion.ts` sets `from` states only at the moment it animates. Cost: ScrollSmoother is installed a few hundred milliseconds after hydration (hidden by the boot screen on first visit; otherwise harmless), and the hero entrance must be CSS, not GSAP.
3. **No GSAP; CSS-only motion.** Loses SplitText line reveals and ScrollSmoother, both "keep" items in the brief.

## Decision

Option 2. `App` calls `import('./lib/motion')` in an effect when `prefs.reducedMotion` is false; the module registers plugins, creates the smoother (if eligible, ADR-002), binds `[data-reveal]` elements, and builds the timeline-draw ScrollTrigger. CSS owns the hero entrance, live-dot pulses, SVG packet motion (`offset-path`), and every open/close transition; GSAP owns scroll-linked and text-split motion only. A `prefers-reduced-motion` change to `reduce` mid-visit calls `dispose()`.

## Consequences

Good: −53 kB and zero animation work for reduced-motion visitors; TBT at start is lower on every device; FR-6/7 are hard to break by accident; GSAP failures degrade to a static page rather than hidden text.

Bad: two motion systems (CSS, GSAP) with a documented split; a brief window before the smoother exists where native scrolling applies (unnoticeable in practice); the reveal code must never be written as "hidden by default".

## Alternatives rejected and why

- Static import: simpler but puts FR-6 on discipline rather than structure, and loads GSAP for visitors who asked for no motion.
- CSS-only: violates the brief's keep list.
