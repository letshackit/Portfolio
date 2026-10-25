# ADR-003 — Styling: plain CSS with custom-property tokens, one co-located CSS file per section

**Status:** Proposed (for the owner gate) · 2026-10-25 · architect

## Context

The repo's convention is plain CSS: a global `index.css` with a few custom properties and one CSS file per section under `src/components/styles/`, imported by the component. The revamp introduces a real design system (colour ramps, type scale, spacing, motion tokens, a reduced-motion override) that every section must share, plus animation hooks for GSAP/SplitText (`data-reveal`, generated `reveal-line` classes) and state classes toggled from JS (`is-hover`, `is-target`, `data-paused`, `data-entered`). Around 35 components, one page, one team.

## Options

1. **Plain CSS + tokens** (follow the grain). Tokens in `styles/tokens.css`; `base.css`, `grid.css`, `utilities.css`; one `Section.css` co-located with its component; class names prefixed by section (`.hero-`, `.deploy-`, `.arch-`). No build step, no new dependency, GSAP selectors trivial. Risk: global namespace collisions, mitigated by prefixes and a small component count.
2. **CSS Modules** (Vite built-in). Scoped class names; still plain CSS. Costs: every JS-toggled class and every GSAP/SplitText-generated class needs `:global()` or a `styles[...]` lookup; the `[data-*]` attribute hooks become the norm anyway; split between global tokens and modules adds ceremony.
3. **Tailwind.** Fast to write, but introduces a second vocabulary over the tokens, bloats JSX with the design system inline, and departs from the repo convention with no gain for ~12 distinct components.
4. **CSS-in-JS / vanilla-extract.** Runtime or build dependency, no benefit for a static single page.

## Decision

Option 1. Cascade order fixed in `styles/index.css`: `fonts.css`, `tokens.css`, `base.css`, `grid.css`, `utilities.css`; then each component imports its own `X.css`. Rules: every colour, size, duration and easing comes from a token (no hex outside `tokens.css`, enforced by review); class prefixes per component; state is expressed with `data-*` attributes or `is-*` classes; the reduced-motion override lives once in `tokens.css`; the focus ring lives once in `base.css` and is never overridden. CSS files move from `src/components/styles/` to sit beside their component — the "one CSS file per section" convention is kept; only the location changes, so a section's code and style are reviewed together.

## Consequences

Good: zero new dependencies; the implementer writes CSS exactly as the existing files do; GSAP and SplitText hooks need nothing special; tokens make the design system auditable in one file; `@media (prefers-reduced-motion)` is one block.

Bad: no scoping; a careless unprefixed class leaks. Review and the prefix rule carry that risk. Co-location changes the folder shape the README describes; the README is rewritten anyway.

## Alternatives rejected and why

- CSS Modules: scoping is not worth the friction with animation hooks on a 12-component page.
- Tailwind: convention break with no return.
- CSS-in-JS: runtime cost and a dependency for a static page.
