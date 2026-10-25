# ADR-001 — Hero pipeline rendering: React Three Fiber + three, no drei, SVG twin elsewhere

**Status:** Proposed (for the owner gate) · 2026-10-25 · architect

## Context

The approved concept puts a live 3D graph of the seven-stage pipeline in the hero on wide screens (brief §2, FR-51, FR-52), degrading to a drawn SVG on narrow screens, under reduced motion, without WebGL, and while the 3D code loads (FR-54..57). Budgets: ≤ 300 kB gz before the 3D chunk (NFR-5), ≤ 400 kB gz for the 3D chunk (NFR-6), loaded only after hero text and only when eligible (NFR-7). Seven stage nodes must be keyboard-reachable with labels in both renderers (FR-58..62). The scene is small: 7 nodes, 6 edges, ~13 moving packets, a pointer tilt.

Measured on the installed versions (gzip): React alone 45 kB; React + plain three minimal scene 162 kB (three ≈ 117 kB); React + R3F minimal scene 262 kB (three + R3F ≈ 217 kB); + drei `Line`/`Html` 270 kB. The 100 kB gap between plain three and R3F exists because R3F calls `extend(THREE)` and so retains every three class; tree-shaking cannot remove them.

## Options

1. **Pure SVG everywhere, no 3D.** 0 kB extra, one renderer, simplest a11y. Gives up the approved concept's depth cue and pointer tilt on desktop; the owner chose 3D explicitly.
2. **2D canvas.** ~4 kB, but hand-written hit-testing, DPR handling and no depth; strictly worse than SVG for this scene.
3. **Plain three, imperative.** ~117 kB. Smallest 3D. Costs: renderer lifecycle, resize, DPR, context loss, dispose and a hand-rolled bridge from React hover/focus state into the scene — roughly 300 lines of imperative code that the sonnet-tier implementer must get right, with no framework help for pausing (`frameloop`) or cleanup.
4. **R3F + three, no drei.** ~217 kB. Declarative scene, `useFrame`, automatic resize/DPR/dispose, `frameloop="never"` for NFR-10, React refs for hover state. 100 kB more than option 3 on a lazy, gated chunk that never reaches phones or reduced-motion visitors. Named in the brief.
5. **R3F + drei.** +8 kB for `Line` and `Html`. `Line` (Line2) is replaced by tube geometry; `Html` by the DOM overlay that accessibility requires anyway. drei pins three/R3F versions and adds upgrade friction.

## Decision

Option 4. React Three Fiber with three only. drei, three-stdlib and postprocessing are removed. Edges are `TubeGeometry` with additive glow tubes; packets are one `InstancedMesh`; the pointer tilt rotates the root group; node screen positions are projected each tilt frame into CSS variables that a DOM overlay consumes (ADR-006). The SVG twin (`PipelineSvg`) is the renderer for every non-eligible case and the placeholder during load, sharing one geometry source (`lib/pipelineLayout.ts`) so the two renderers occupy identical space.

Loading gate order: wide screen → not reduced motion → not `saveData` → `document.fonts.ready` → idle → WebGL probe → `import()` with an 8 s race. Any failure, context loss or watchdog bail returns to the SVG silently.

## Consequences

Good: fits NFR-6 with 1.8× margin (forecast ~223 kB); the implementer writes ~250 lines of declarative scene; pause/resume and cleanup are framework features; the choice is confined to `src/components/hero/three/*` and reversible by replacing that folder behind the `Pipeline3DProps` contract.

Bad: 100 kB of three that nothing uses is downloaded by desktop visitors; R3F 8's dependency set (react-reconciler, zustand, its-fine, suspend-react, react-use-measure) rides in the chunk; two renderers must be kept visually aligned (mitigated by the single layout source and the CSS-variable projector).

## Alternatives rejected and why

- SVG-only: contradicts the owner's approved concept; kept as the fallback renderer, so nothing is lost if 3D is later removed.
- Plain three: cheaper by 100 kB but moves lifecycle and state-bridging risk onto the implementer; if the chunk budget ever tightens below ~230 kB this is the first move, and the props contract already allows it.
- drei: not worth 8 kB plus version coupling for two components we replace.
