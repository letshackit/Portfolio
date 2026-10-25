# STORY-008: Integration: whole-page performance, accessibility and browser sweep
**Epic:** E5 Integration and hardening   **Points:** 5   **Serves:** NFR-1..NFR-4, NFR-8, NFR-10, NFR-12, NFR-15, NFR-19, NFR-22, NFR-25..NFR-26
**Depends on:** STORY-004, STORY-006, STORY-007   **Build step:** Integration (between 6 and 7)

## User story
As the owner, I want all pieces proven to work together on one build, so that the launch step starts from a verified candidate.

## Requirements implemented (each owned by this story only)
NFR-1..NFR-4, NFR-8, NFR-10, NFR-12, NFR-15, NFR-19, NFR-22, NFR-25..NFR-26  (12 ids)

## Files owned
No new feature files. Fixes land in the file that owns the failing requirement. Adds test evidence under .sdlc/reports/ and any Playwright/axe test files under tests/

## Acceptance criteria
- **AC-1** Given a local production preview and Lighthouse mobile defaults, when I run it, then FCP is under 1.5 s (NFR-1), LCP at most 2.5 s (NFR-2; on first visit the boot headline is the LCP element; ADR-008, risk R-1), CLS at most 0.1 (NFR-3) and TBT at most 200 ms (NFR-4).
- **AC-2** Given a 360 px mobile first load, when I sum transferred bytes excluding the résumé PDF, then the total is at most 1 MB (NFR-8).
- **AC-3** Given the packets, live dots and 3D graph, when I scroll their section off-screen or hide the tab, then their animation pauses (check animation play state, requestAnimationFrame counts) (NFR-10).
- **AC-4** Given axe on the page at 360, 768 and 1280 px, when I run it, then 0 serious or critical violations and WCAG 2.2 AA manual checks pass (NFR-12).
- **AC-5** Given the keyboard only, when I run the PRD launch check 5 walk-through in both smooth-scroll and native modes, then every control works, Tab order follows visual order, and focus is always visible (NFR-15).
- **AC-6** Given a 1280 px window at 200% browser zoom, when I use every section, then no content or function is lost (NFR-19).
- **AC-7** Given a recording of every animation, when I analyse it, then nothing flashes more than 3 times in one second (NFR-22).
- **AC-8** Given the 360 px walk-through (launch check 6) and reduced-motion walk-through (launch check 7), when I run both on the whole page, then no section scrolls sideways, all text is readable without zoom, nothing moves by itself and no 3D file downloads.
- **AC-9** Given the current and previous major Chrome, Edge, Firefox, Samsung Internet, and Safari on macOS and iOS, when I load the site, then it works fully (NFR-25).
- **AC-10** Given scripts disabled and an old-browser emulation without WebGL, motion or modern CSS, when I load the site, then text, links and the résumé download still work (NFR-26).
- **AC-11** Given findings, when any AC fails, then a defect is filed against the owning story and not fixed silently here.

## Out of scope
Any requirement id not listed above (each id has exactly one owning story; see .sdlc/03-backlog.md). No edits to main, no push, no deploy. Nothing that prints the HRIS vendor name outside the résumé PDF.

## Technical notes
Architecture F.6 (scripts/lighthouse.sh), H.1, H.2, K, G.1 risks R-1..R-5. This story adds no scope; it is the gate between feature work and launch prep.
Source of truth for numbers and claims: .sdlc/00-inputs/resume.md and testimonials.md. Requirement ownership: .sdlc/01-architecture.md A.5.

## Definition of done
- [ ] Code committed on branch revamp/mission-control, not pushed
- [ ] Every AC above executed (browser or terminal) with real output recorded in the handoff block
- [ ] `npm run lint`, `npx tsc -b` and `npm run build` report 0 errors
- [ ] API contract: n/a (static site, no API)
- [ ] Docs/runbook updated where behaviour or scripts changed
- [ ] Reviewed by code-reviewer and (user-facing) ux-reviewer
