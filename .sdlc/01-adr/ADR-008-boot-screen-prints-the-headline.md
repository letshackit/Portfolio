# ADR-008 — The boot screen ends by printing the headline, so first-visit LCP is not deferred to the hero

**Status:** Proposed (for the owner gate) · 2026-10-25 · architect

## Context

FR-15/16 require a full-screen boot log on the first visit of a session, ending within 2 s. NFR-2 (an "our decision" requirement) caps LCP at 2.5 s on Lighthouse mobile; NFR-1 caps FCP at 1.5 s (brief). Lighthouse always runs with a fresh session, so it always sees the boot. If the hero headline is the first large text block to paint, LCP ≈ JS-ready (~0.8–1.0 s on the simulated mobile profile) + boot duration (~1.7 s) ≈ 2.5–2.7 s: a likely miss. Lighthouse takes the largest text block painted; a block that is later enlarged is not re-evaluated, and `opacity: 0` elements are ignored, so a trick that pre-renders invisible text does not work.

## Options

1. **Shorten the boot to ~1.2 s.** Reduces the miss but makes the log unreadable and still leaves LCP ≈ 2.1–2.3 s with no margin.
2. **Make the boot screen's log the largest text block** by rendering it as one big `<pre>`. Fragile (depends on viewport and line count) and makes the log read as a wall rather than lines arriving.
3. **End the boot by printing the headline itself in display type** (eyebrow + headline as a `<p class="display">`, not an `<h1>`) at ~1.05 s, so the LCP element is painted at ≈ JS-ready + 1.05 s ≈ 1.9–2.1 s; the hero's real `<h1>` then paints the same text at the same size and is not larger, so LCP does not move. The console "boots into" its positioning line, which also helps the ten-second test: a visitor reads the positioning before the hero appears.
4. **Drop the boot screen.** Removes the risk and a brief-level feature the owner approved.

## Decision

Option 3. Timeline: lines at 0–750 ms, headline echo fades in at 1050 ms (200 ms), screen fades at 1500 ms, gone by 1700 ms. The echo is `aria-hidden` and not a heading (FR-47). The boot screen is a separate `role="dialog"` with the Skip button focused; the hero beneath already holds the real headline. Measurement: `scripts/lighthouse.sh` on a fresh profile; the honest metric is first-visit LCP. If the live measurement still misses 2.5 s, the fallback is to lower the boot total to 1.4 s (lines 120 ms apart, echo at 800 ms) before anything else is touched.

## Consequences

Good: a ~0.5 s LCP gain on first visits without shortening the log; the positioning line is shown twice in the first two seconds; no change for returning visitors or reduced-motion visitors (no boot).

Bad: the hero entrance after the boot repeats text the visitor has just read (mitigated by the crossfade: the echo and the hero headline sit in roughly the same place, so it reads as the console settling, not as a repeat); the boot screen carries a dependency on the display type scale; one more element to keep in sync with `content.hero.headline` (it reads the same field).

## Alternatives rejected and why

- Shorter boot alone: not enough margin and a worse boot.
- Big-`<pre>` trick: fragile and ugly.
- Dropping the boot: discards an approved feature; kept as the last-resort fallback if the live LCP cannot be met any other way, to be decided by the owner, not the implementer.
