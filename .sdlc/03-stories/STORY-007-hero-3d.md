# STORY-007: 3D hero graph with SVG fallback, lazy gate and watchdog
**Epic:** E2 Interactive visuals   **Points:** 8   **Serves:** FR-51..FR-54, FR-57, NFR-5..NFR-7
**Depends on:** STORY-003   **Build step:** 6

## User story
As a hiring manager on a laptop, I want a 3D pipeline that fades in behind the hero text with amber packets travelling research to deploy, so that the first screen shows the workflow working.

## Requirements implemented (each owned by this story only)
FR-51..FR-54, FR-57, NFR-5..NFR-7  (8 ids)

## Files owned
src/hero/three/{Pipeline3D,Nodes,Edges,Packets,packetSim,...}.tsx, src/hero/PipelineFrame.tsx (gate, ErrorBoundary, timeout, contextlost, crossfade), vite.config.ts manualChunks, scripts/check-budgets.mjs thresholds

## Acceptance criteria
- **AC-1** Given a wide screen with WebGL and no reduced motion, when the hero text is on screen, then the 3D chunk starts downloading only afterwards (after fonts ready and idle); the headline and status strip render before it (FR-53, NFR-7).
- **AC-2** Given the 3D graph is ready, when I look at the hero, then it shows 7 stage nodes in order joined left to right, and amber packets move along edges from research toward deploy (FR-51, FR-52).
- **AC-3** Given the swap from SVG to 3D, when I record layout shift, then no other content moves, nodes do not jump at rest, and CLS from the swap is 0 (FR-54).
- **AC-4** Given a 360 px window, reduced motion on, or WebGL disabled, when I load the page, then the 3D chunk is never requested (NFR-7); with WebGL disabled or the chunk blocked or throwing, the SVG stays and no error message appears (FR-57).
- **AC-5** Given a weak GPU or a lost context (simulate with the WEBGL_lose_context extension), when it happens, then the watchdog returns to the SVG silently.
- **AC-6** Given `node scripts/check-budgets.mjs` on the build, when it runs, then JavaScript loaded before the 3D chunk is at most 300 kB gzip (NFR-5) and the 3D chunk at most 400 kB gzip (NFR-6); forecast is about 223 kB.
- **AC-7** Given the 3D graph, when I press Tab, hover or click a node, then the overlay behaviours from STORY-003 (FR-58..62) still work unchanged.

## Out of scope
Any requirement id not listed above (each id has exactly one owning story; see .sdlc/03-backlog.md). No edits to main, no push, no deploy. Nothing that prints the HRIS vendor name outside the résumé PDF.

## Technical notes
Architecture C.1-C.6, H.2, ADR-001, ADR-007, build step 6. FR-51..57 are the PRD hero rows; FR-55/56/58..62 are owned by STORY-003.
Source of truth for numbers and claims: .sdlc/00-inputs/resume.md and testimonials.md. Requirement ownership: .sdlc/01-architecture.md A.5.

## Definition of done
- [ ] Code committed on branch revamp/mission-control, not pushed
- [ ] Every AC above executed (browser or terminal) with real output recorded in the handoff block
- [ ] `npm run lint`, `npx tsc -b` and `npm run build` report 0 errors
- [ ] API contract: n/a (static site, no API)
- [ ] Docs/runbook updated where behaviour or scripts changed
- [ ] Reviewed by code-reviewer and (user-facing) ux-reviewer
