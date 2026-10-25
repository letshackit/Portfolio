# ADR-002 — Keep GSAP ScrollSmoother, gated to desktop pointer devices, behind a single scroll seam

**Status:** Proposed (for the owner gate) · 2026-10-25 · architect

## Context

The brief lists GSAP ScrollSmoother, ScrollTrigger and SplitText as "keep" (hard constraints). The PRD limits smooth scrolling to wide screens with a mouse or trackpad and no reduced motion (FR-8), requires instant jumps under reduced motion (FR-31), and requires section links and palette commands to move focus to the section heading (FR-28, FR-43) with a keyboard-reachable page (NFR-15). ScrollSmoother works by fixing a wrapper and translating the content, which can desynchronise native focus scrolling, `scrollIntoView`, hash jumps and in-page find. Measured cost: ~4.8 kB gz on top of ScrollTrigger. Verified in the installed source: ScrollSmoother listens to `focusin` and centres off-screen focused elements, with an `onFocusIn` hook to veto it.

## Options

1. **Native scrolling only** (`scroll-behavior: smooth`, ScrollTrigger for reveals). Zero a11y risk, simplest, −5 kB. Breaks the brief's "keep" constraint; loses the inertial feel the owner has today.
2. **ScrollSmoother everywhere** as today (`smooth: 1.7`, `effects: true`). Maximal feel; worst for touch devices (fights native momentum) and for reduced motion; the current site already pauses it awkwardly behind the loader.
3. **ScrollSmoother gated and isolated.** Create it only when `isDesktop && pointerFine && !reducedMotion`, with `smooth: 0.8`, `effects: false`, `normalizeScroll: false`; route every programmatic scroll and scroll lock through `lib/scroll.ts`, which also implements the native path; use tweens for jumps so completion is observable; focus headings with `preventScroll`.

## Decision

Option 3. ScrollSmoother is created in `lib/motion.ts` (which only loads without reduced motion) and registered with `lib/scroll.ts`. Nothing else in the codebase references the smoother. Jumps use `gsap.to(smoother, { scrollTop })` with `onComplete` → `heading.focus({ preventScroll: true })`; `lockScroll` pauses the smoother while dialogs are open; `onFocusIn` returns `false` while a dialog is open; `refresh()` is called after content height changes. Touch devices, tablets without a fine pointer, and reduced-motion visitors get native scrolling with `scroll-margin-top` on sections.

## Consequences

Good: honours the brief; the inertial feel survives on the device class where it reads as quality; keyboard behaviour is backed by ScrollSmoother's own `focusin` handling plus our guard; the decision can be reversed by deleting one `create` call because `scroll.ts` already runs in native mode on most devices.

Bad: two scroll models to test (QA must run the keyboard walk-through in both); `position: fixed` elements must live outside the wrapper (Header, palette, boot, cursor, toast do); IntersectionObserver-based active-section detection depends on transformed boxes (works, but worth a check); any future scroll-aware feature must go through the seam.

## Alternatives rejected and why

- Native only: cleanest, but violates a hard constraint; it remains the documented fallback and the behaviour on every non-desktop device.
- Lenis or other smooth-scroll libraries: another dependency for the same trade-offs.
- ScrollSmoother `normalizeScroll: true`: fixes some mobile address-bar jitter but hijacks touch scrolling; unnecessary because touch gets native scroll.
