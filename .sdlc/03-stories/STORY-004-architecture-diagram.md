# STORY-004: Interactive TravelDesk architecture diagram
**Epic:** E2 Interactive visuals   **Points:** 5   **Serves:** FR-80..FR-87, FR-90
**Depends on:** STORY-002   **Build step:** 3

## User story
As a product or engineering leader, I want to explore TravelDesk services and their connections, so that I can judge how deeply Harshal reasons about systems.

## Requirements implemented (each owned by this story only)
FR-80..FR-87, FR-90  (9 ids)

## Files owned
src/lib/archLayout.ts, src/architecture/{ArchDiagram,ArchNodeList}.tsx(+css, wide mode), src/data/traveldesk-architecture.ts (status flag and banner), unit test for node counts

## Acceptance criteria
- **AC-1** Given the diagram at 1280 px, when I count service nodes, then there are exactly 18: 1 Next.js front end, 1 Spring Boot API gateway and 16 domain services; a unit test asserts 1+1+16 (FR-80).
- **AC-2** Given the diagram, when I read integration nodes, then 3 live nodes read "Enterprise HRIS", "Quest2Travel" and "SAP" (FR-81, FR-83), and "EBIX forex" and "Recharge" are dashed and labelled "Phase 2" (FR-82).
- **AC-3** Given the build output and source, when I grep traveldesk-architecture.ts for the HRIS vendor name (any case, with or without space), then there are 0 matches (FR-83).
- **AC-4** Given the pointer, when I hover a node or focus it, then its edges and the nodes at their other ends light up, and every other node and edge dims (FR-84).
- **AC-5** Given a highlighted node, when it is hovered or focused, then a caption shows its name and one-line role (FR-85).
- **AC-6** Given the keyboard, when I Tab into the diagram, then focus visits front end, gateway, domain services, then integrations; Escape clears the highlight (FR-86).
- **AC-7** Given a touch device or touch emulation, when I tap a node it highlights as in FR-84 and when I tap empty space the highlight clears (FR-87).
- **AC-8** Given reduced motion, when I change highlight, then it changes instantly and no edge shows flowing motion (FR-90).
- **AC-9** Given a 360 px window, when I open Architecture, then no horizontal scroll appears (FR-4 stays green) and the grouped list from STORY-002 is shown instead of the diagram (FR-88 remains with STORY-002).
- **AC-10** Given the data file has status "proposed", when the page loads, then an on-page banner reads that service names are proposed and the launch gate script fails; with status "confirmed" the banner is gone and the gate passes.

## Out of scope
Any requirement id not listed above (each id has exactly one owning story; see .sdlc/03-backlog.md). No edits to main, no push, no deploy. Nothing that prints the HRIS vendor name outside the résumé PDF.

## Technical notes
Architecture D.1-D.3, ADR-005, ADR-006, build step 3. OPEN OWNER ITEM Q-1: the 16 domain service names and edges are not in the résumé; the file ships a labelled PROPOSED decomposition with status "proposed". Owner must confirm or replace the names, then set status "confirmed". This blocks launch (STORY-009), not build. Decision owner: architect/owner, not story-writer.
Source of truth for numbers and claims: .sdlc/00-inputs/resume.md and testimonials.md. Requirement ownership: .sdlc/01-architecture.md A.5.

## Definition of done
- [ ] Code committed on branch revamp/mission-control, not pushed
- [ ] Every AC above executed (browser or terminal) with real output recorded in the handoff block
- [ ] `npm run lint`, `npx tsc -b` and `npm run build` report 0 errors
- [ ] API contract: n/a (static site, no API)
- [ ] Docs/runbook updated where behaviour or scripts changed
- [ ] Reviewed by code-reviewer and (user-facing) ux-reviewer
