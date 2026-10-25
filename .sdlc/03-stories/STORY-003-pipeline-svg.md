# STORY-003: Pipeline drawn in SVG, stage stepper tabs, badges and pulses
**Epic:** E2 Interactive visuals   **Points:** 5   **Serves:** FR-55..FR-56, FR-58..FR-62, FR-65..FR-66, FR-69, FR-73, FR-79, FR-118
**Depends on:** STORY-002   **Build step:** 2

## User story
As a hiring manager on any device, I want to see and click the 7-stage pipeline in the hero and have it open the matching stage, so that I understand the workflow in seconds.

## Requirements implemented (each owned by this story only)
FR-55..FR-56, FR-58..FR-62, FR-65..FR-66, FR-69, FR-73, FR-79, FR-118  (13 ids)

## Files owned
src/lib/pipelineLayout.ts, src/hero/{PipelineSvg,PipelineOverlay,PipelineFrame}.tsx(+css, SVG-only mode), src/how/Stepper.tsx (tabs mode), src/providers/UiProvider.tsx (selectedStage), src/ui/{StatusBadge,LiveDot}.tsx

## Acceptance criteria
- **AC-1** Given a 360 px window without reduced motion, when the hero loads, then a drawn pipeline with 7 labelled stage nodes in order (Research, PRD, UX, Prototype, Jira and Confluence, QA and UAT, Deploy) shows with amber packets moving, and no 3D file is requested (FR-55, FR-58).
- **AC-2** Given reduced motion on, when the hero loads, then the drawing is shown with still packets and nothing animates (FR-56).
- **AC-3** Given a stage node, when I hover it or move focus to it, then a tooltip shows the stage name and its one-line artifact from the How I work table (FR-59).
- **AC-4** Given a stage node, when I click it or press Enter, then the page moves to #how-i-work with that stage selected (FR-60).
- **AC-5** Given the keyboard, when I Tab through the hero, then all 7 stage nodes receive focus in pipeline order (FR-61).
- **AC-6** Given a screen reader or the accessibility tree, when I inspect the hero graphic, then the SVG is aria-hidden and an ordered list of the 7 stages is exposed instead (FR-62).
- **AC-7** Given How I work at 1280 px, when the page loads, then Stage 1 is selected and its panel shows; selecting another stage shows its panel (FR-65). Left and Right arrows move between stages, selection follows, and the roles are tablist/tab/tabpanel (FR-66).
- **AC-8** Given reduced motion, when I change the selected stage, then the panel swaps instantly with no transition (FR-69).
- **AC-9** Given the Deployments badges, when I inspect them, then "UAT" and "In development" are amber with a live dot and "Prototype delivered" and "Scoping" are not amber (FR-73).
- **AC-10** Given reduced motion on, when I view the Deployments and Contact live dots, then no dot pulses (FR-79, FR-118).
- **AC-11** Given without reduced motion, when I time a live dot, then it pulses no faster than 0.6 Hz (see NFR-22 check in STORY-008).

## Out of scope
Any requirement id not listed above (each id has exactly one owning story; see .sdlc/03-backlog.md). No edits to main, no push, no deploy. Nothing that prints the HRIS vendor name outside the résumé PDF.

## Technical notes
Architecture C.1, C.2, C.4, C.5, B.5 motion system, ADR-006, build step 2. Stepper narrow mode (list) already exists from STORY-002; tabs mode applies on wide screens only.
Source of truth for numbers and claims: .sdlc/00-inputs/resume.md and testimonials.md. Requirement ownership: .sdlc/01-architecture.md A.5.

## Definition of done
- [ ] Code committed on branch revamp/mission-control, not pushed
- [ ] Every AC above executed (browser or terminal) with real output recorded in the handoff block
- [ ] `npm run lint`, `npx tsc -b` and `npm run build` report 0 errors
- [ ] API contract: n/a (static site, no API)
- [ ] Docs/runbook updated where behaviour or scripts changed
- [ ] Reviewed by code-reviewer and (user-facing) ux-reviewer
