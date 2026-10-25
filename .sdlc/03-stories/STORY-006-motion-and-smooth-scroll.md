# STORY-006: Motion chunk, gated ScrollSmoother, reveals, reduced-motion matrix
**Epic:** E4 Motion   **Points:** 5   **Serves:** FR-6..FR-8, FR-14, FR-96, FR-102, NFR-18
**Depends on:** STORY-005   **Build step:** 5

## User story
As a hiring manager on a desktop with a mouse, I want smooth scrolling and tasteful reveals, and a visitor with reduced motion to see nothing move, so that the page feels crafted and never excludes anyone.

## Requirements implemented (each owned by this story only)
FR-6..FR-8, FR-14, FR-96, FR-102, NFR-18  (7 ids)

## Files owned
src/lib/{motion,reveal,visibility}.ts, src/providers/PrefsProvider.tsx, src/ui/Section.tsx (reveal hooks), src/history/TimelineEntry css (line draw), tokens.css reduced-motion block, lib/scroll.ts (ScrollSmoother mode)

## Acceptance criteria
- **AC-1** Given reduced motion on, when I open the site and load every route state, then no element moves, fades, slides or types; all text is visible at load; the Network panel shows no motion chunk and no GSAP request (FR-6, NFR-18).
- **AC-2** Given reduced motion off and the motion chunk blocked in DevTools, when the page loads, then all text is still visible (FR-7).
- **AC-3** Given a wide screen, a mouse or trackpad and no reduced motion, when I scroll, then smooth scrolling is active; given a 360 px window, touch emulation or reduced motion, then the browser scrolls natively (FR-8).
- **AC-4** Given smooth scrolling is active, when I run the keyboard walk-through (Tab, Enter on header links, Escape in the palette), then focus and anchor jumps still work (ADR-002, risk R-3).
- **AC-5** Given Capabilities, when I scroll, then only an optional reveal moves it; with reduced motion there is no reveal (FR-96).
- **AC-6** Given Deployment history without reduced motion, when it scrolls into view, then the timeline line draws; with reduced motion the line is fully drawn at load (FR-102).
- **AC-7** Given every moving thing on the page, when I list it, then each stands for work happening, a visitor action or the boot log; there is no decorative motion (FR-14).
- **AC-8** Given reveals, when the section content is measured before and after, then there is no layout shift from the reveal (feeds NFR-3 in STORY-008).

## Out of scope
Any requirement id not listed above (each id has exactly one owning story; see .sdlc/03-backlog.md). No edits to main, no push, no deploy. Nothing that prints the HRIS vendor name outside the résumé PDF.

## Technical notes
Architecture B.5, E.4, ADR-002, ADR-007, build step 5. PRD launch check 7. ScrollSmoother stays behind lib/scroll.ts so removal is one file.
Source of truth for numbers and claims: .sdlc/00-inputs/resume.md and testimonials.md. Requirement ownership: .sdlc/01-architecture.md A.5.

## Definition of done
- [ ] Code committed on branch revamp/mission-control, not pushed
- [ ] Every AC above executed (browser or terminal) with real output recorded in the handoff block
- [ ] `npm run lint`, `npx tsc -b` and `npm run build` report 0 errors
- [ ] API contract: n/a (static site, no API)
- [ ] Docs/runbook updated where behaviour or scripts changed
- [ ] Reviewed by code-reviewer and (user-facing) ux-reviewer
