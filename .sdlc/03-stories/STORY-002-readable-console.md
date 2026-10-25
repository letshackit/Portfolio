# STORY-002: Readable console: every section as plain content (M1)
**Epic:** E1 Readable page   **Points:** 8   **Serves:** FR-1..FR-2, FR-24..FR-26, FR-46..FR-50, FR-63..FR-64, FR-67..FR-68, FR-70..FR-72, FR-74..FR-78, FR-88..FR-89, FR-91..FR-92, FR-94..FR-95, FR-97..FR-101, FR-103..FR-104, FR-106..FR-107, FR-109..FR-111, FR-113..FR-117, NFR-17, NFR-20..NFR-21, NFR-31
**Depends on:** STORY-001   **Build step:** 1

## User story
As a recruiter on a phone, I want to read the whole site as plain, correct content and reach the résumé and contact details, so that I get the positioning, history and a way to contact Harshal without any motion or 3D.

## Requirements implemented (each owned by this story only)
FR-1..FR-2, FR-24..FR-26, FR-46..FR-50, FR-63..FR-64, FR-67..FR-68, FR-70..FR-72, FR-74..FR-78, FR-88..FR-89, FR-91..FR-92, FR-94..FR-95, FR-97..FR-101, FR-103..FR-104, FR-106..FR-107, FR-109..FR-111, FR-113..FR-117, NFR-17, NFR-20..NFR-21, NFR-31  (49 ids)

## Files owned
src/app/Shell.tsx, src/App.tsx (minimal), src/main.tsx, src/nav/{Header,SkipLink}.tsx(+css), src/ui/{Section,SectionHeading,Button,Chip,StatusBadge,ExternalLink}.tsx, src/hero/{Hero,StatusStrip}.tsx(+css), src/how/{HowIWork,StagePanel}.tsx, src/deployments/*, src/architecture/{Architecture,ArchNodeList}.tsx (grouped list), src/capabilities/*, src/history/{History,TimelineEntry,Education}.tsx, src/recognition/{Recognition,QuoteCard}.tsx, src/contact/{Contact,Footer}.tsx

## Acceptance criteria
- **AC-1** Given the page at 1280 px, when I read the DOM order, then sections are: hero, How I work, Deployments, Architecture, Capabilities, Deployment history, Recognition, Contact, with ids #top, #how-i-work, #deployments, #architecture, #capabilities, #history, #recognition, #contact (FR-1, FR-2).
- **AC-2** Given landmarks, when I run axe and count regions, then there is exactly one header, one nav, one main, one footer; each section has one h2; the hero headline is the only h1; heading levels never skip (NFR-17, FR-47). html lang is "en" and svg/decorative graphics carry aria-hidden while meaningful ones have text alternatives (NFR-21).
- **AC-3** Given the header at 1280 px, when I inspect it, then it is position fixed, holds the name linking to #top, links to the seven sections after the hero and a palette button (button may be inert until STORY-005) (FR-24, FR-25).
- **AC-4** Given a fresh load, when I press Tab once, then focus lands on "Skip to content" and activating it moves focus to main (FR-26).
- **AC-5** Given the hero, when I read it, then order is eyebrow, headline "Embedded with the enterprise. Shipping with AI agents.", one-sentence sub-line, status strip with exactly the three items from the PRD Content (DEPLOYED, PLATFORMS, TEAM) in Geist Mono, then buttons "See deployments" (to #deployments) and "Download résumé" (FR-46, FR-48, FR-49).
- **AC-6** Given a 360 x 640 window, when the page loads, then the headline and the first status item are fully visible with no scroll (FR-50).
- **AC-7** Given How I work at any width in this step, when I read it, then all 7 stages appear in order as a list with every panel visible, text matching the PRD table exactly, and the line "Claude Code · Cursor · Codex" appears once (FR-63, FR-64, FR-67, FR-68).
- **AC-8** Given Deployments, when I count cards, then there are 5 in order TravelDesk, HRMS, BSS, Cloud Commerce, AI Operations platform, no carousel, no sideways swipe, no auto-advance; each shows name, one-liner, badge with one of UAT / In development / Prototype delivered / Scoping, chips and metrics as in the PRD table (FR-70, FR-71, FR-72, FR-76).
- **AC-9** Given a card, when I activate "Details", then its bullets show and aria-expanded flips true; opening a second card leaves the first open; cards start closed; TravelDesk has a "See the architecture" link to #architecture (FR-74, FR-75, FR-78).
- **AC-10** Given a 360 px window, when I view Deployments, Capabilities, History and Recognition, then each stacks in a single column and there is no horizontal scroll (FR-77, FR-95, FR-101, FR-109, FR-4).
- **AC-11** Given Architecture, when I read it, then it shows the PRD facts including "multi-tenant from day one" and "built and deployed solo" (FR-91) and a grouped list of front end, gateway, domain services, integrations present in the DOM at every width; activating an entry shows what it connects to (FR-88, FR-89). The PROPOSED banner is visible (see STORY-004 Q-1).
- **AC-12** Given Capabilities, when I read it, then there are four groups (Product, Technical, AI-native build, Delivery and tools) side by side at 1280 px, each with one proof line linking to #deployments, #architecture, #how-i-work, #history respectively (FR-92, FR-94, FR-95).
- **AC-13** Given Deployment history, when I read it, then 4 employers appear newest first with title, company, location, dates and 2-3 highlights; "Promoted in 9 months" markers appear on the Paytm and ANS Commerce entries only; the education block shows 2 degrees, 5 certifications and 1 publication whose link opens the journal PDF in a new tab (FR-97, FR-98, FR-99, FR-100). At 360 px dates sit above titles (FR-101).
- **AC-14** Given Recognition, when I read it, then exactly 5 quotes appear in order ITC, Whites, Amul, Ekart, Alma Mater Store, each with the attribution and context label from the PRD table; ITC shows the pull-quote with a "Read the full note" button revealing the full text; Ekart shows the 3 chosen bullets then the closing sentence; no logo, screenshot, phone or email appears; each is a figure/blockquote/figcaption (FR-103, FR-104, FR-106, FR-107, FR-108, FR-110).
- **AC-15** Given Contact, when I read it, then it shows the amber "Open to Forward Deployed Engineer roles" badge with a live dot, a mailto link for saraogiharshal@gmail.com, LinkedIn and GitHub links, the call link and "Delhi NCR, India", a "Download résumé" button, and a footer with name, current year and "Back to top" (FR-111, FR-113, FR-114, FR-115, FR-116). The copy button belongs to STORY-005.
- **AC-16** Given every link with target _blank, when I inspect it, then it has rel containing noopener and noreferrer, and only ui/ExternalLink.tsx renders target _blank (NFR-31).
- **AC-17** Given a 360 px window, when I measure every link, button and control, then each is at least 44 x 44 px, and Contact controls too (NFR-20, FR-117).
- **AC-18** Given the keyboard only, when I Tab through the page, then every control is reachable, focus is always visible, and no horizontal scroll appears at 360 px.
- **AC-19** Given the page, when I search visible strings against the content file, then no visible string literal exists outside src/data/content.ts except structural ARIA labels (see STORY-001 AC on content).

## Out of scope
Any requirement id not listed above (each id has exactly one owning story; see .sdlc/03-backlog.md). No edits to main, no push, no deploy. Nothing that prints the HRIS vendor name outside the résumé PDF.

## Technical notes
Architecture A.1, A.4, B.4, B.6, B.7 (per-section layouts), build step 1 in L, ADR-006. Design tokens only; plain CSS per ADR-003. Motion, 3D and palette are not built here.
Source of truth for numbers and claims: .sdlc/00-inputs/resume.md and testimonials.md. Requirement ownership: .sdlc/01-architecture.md A.5.

## Definition of done
- [ ] Code committed on branch revamp/mission-control, not pushed
- [ ] Every AC above executed (browser or terminal) with real output recorded in the handoff block
- [ ] `npm run lint`, `npx tsc -b` and `npm run build` report 0 errors
- [ ] API contract: n/a (static site, no API)
- [ ] Docs/runbook updated where behaviour or scripts changed
- [ ] Reviewed by code-reviewer and (user-facing) ux-reviewer
