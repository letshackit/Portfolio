# ADR-006 — Both interactive graphics use a DOM overlay as the single interaction and accessibility layer

**Status:** Proposed (for the owner gate) · 2026-10-25 · architect

## Context

Two graphics are interactive: the hero pipeline (3D on eligible desktops, SVG elsewhere; FR-58..62) and the TravelDesk architecture diagram (SVG; FR-84..89). Requirements: keyboard reach in order, visible focus, labels as text, hover/focus/click/tap behaviours, screen-reader text equivalents (a list of stages; a grouped list of services on every width), identical layout between the SVG and 3D hero renderers (FR-54), and Lighthouse Accessibility ≥ 95. WebGL has no accessibility tree. SVG `tabindex`/focus support is uneven (Safari), SVG `<text>` is blurry at fractional scales and cannot wrap, and drei's `Html` would be a third mechanism.

## Options

1. **Per-renderer accessibility:** SVG elements with `tabindex` and `<text>`, plus a hidden list for the 3D case, plus drei `Html` for labels in 3D. Three mechanisms, two sets of behaviours to keep equal.
2. **DOM overlay:** one `<ol>` of `<button>`s per graphic, absolutely positioned over the graphic from the same coordinates the renderer uses (static percentages for SVG; projected CSS variables for 3D). Labels are the buttons' text; tooltips/descriptions hang off the buttons; the graphic underneath is `aria-hidden`. For the architecture diagram, the same `<ol>` renders unpositioned as the grouped list on narrow screens.
3. **Canvas-only with ARIA on the canvas:** not viable for 7–23 distinct targets.

## Decision

Option 2. `hero/PipelineOverlay.tsx` and `architecture/ArchNodeList.tsx` are the only focusable things in their graphics. Contract: the renderer writes node positions as CSS custom properties on the frame element (`--px-i`, `--py-i` as percentages); buttons read them. Hover/focus state flows from the overlay into the renderer (ref for 3D, class for SVG). The SVG and canvas carry `aria-hidden="true"`; the SVG has `focusable="false"` and no `<text>`. Keyboard order equals DOM order equals pipeline order (hero) and group order (diagram).

## Consequences

Good: one implementation of keyboard, focus, tooltip, description and SR text per graphic regardless of renderer; crisp DOM text at every zoom; 200 % zoom and user stylesheets work; drei `Html` becomes unnecessary (supports ADR-001); the narrow-screen grouped list is the same component, so FR-89 ("screen readers always get the grouped list") is true by construction.

Bad: positions must be kept in sync — a projector step runs on tilt frames in 3D (7 nodes, negligible), and the overlay geometry must match the renderer's box exactly (`aspect-ratio` on the frame, `grid-area: 1/1` stacking). A renderer resize without a projector update would misplace labels for a frame; the projector runs on resize too.

## Alternatives rejected and why

- Per-renderer a11y: three mechanisms to keep equal; Safari SVG focus quirks; blurry SVG text.
- drei `Html`: a fourth positioning system and a dependency we otherwise drop.
