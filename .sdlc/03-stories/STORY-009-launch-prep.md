# STORY-009: Launch prep: SEO assets, confidentiality gate, hosting files, Lighthouse
**Epic:** E6 Launch   **Points:** 5   **Serves:** FR-122, FR-125..FR-126, FR-129..FR-131, FR-133, FR-143, NFR-11, NFR-23..NFR-24, NFR-28, NFR-32
**Depends on:** STORY-008   **Build step:** 7

## User story
As the owner, I want a launch candidate with correct search and share previews, no confidential text and host files ready, so that I can approve the pull request and deploy it myself.

## Requirements implemented (each owned by this story only)
FR-122, FR-125..FR-126, FR-129..FR-131, FR-133, FR-143, NFR-11, NFR-23..NFR-24, NFR-28, NFR-32  (13 ids)

## Files owned
scripts/{check-confidential.sh,write-sitemap.mjs,lighthouse.sh}, public/{robots.txt,_headers,404.html,favicon.svg,apple-touch-icon.png,og-image.png,sitemap.xml}, index.html (CSP meta), README.md, .sdlc/reports/

## Acceptance criteria
- **AC-1** Given a production build, when I run scripts/check-confidential.sh, then it exits 0 with 0 matches (case-insensitive, with and without a space) for the HRIS vendor name in src/, scripts/, index.html and the build output, and 0 matches for the SBI Life quote author name (as listed in testimonials.md) and for letshackit.netlify.app (FR-131, FR-133, FR-130). public/Harshal_Saraogi_Resume.pdf is excluded by owner decision and is not flagged (FR-143).
- **AC-2** Given the script, when I plant the forbidden string in a scratch copy of src/, then the script exits non-zero.
- **AC-3** Given the build output, when I grep for key=, token and analytics, then nothing is found (NFR-28).
- **AC-4** Given sitemap.xml after `npm run build`, when I open it, then it lists exactly one URL, https://harshalsaraogi.com/, with lastmod equal to the build date (FR-125).
- **AC-5** Given robots.txt, when I read it, then it allows all crawlers, names https://harshalsaraogi.com/sitemap.xml and has no rules for removed folders (FR-126).
- **AC-6** Given og-image.png, when I inspect it, then it is 1200 x 630, under 300 kB, referenced by an absolute https://harshalsaraogi.com URL with og:image:alt; twitter:image matches (FR-122).
- **AC-7** Given the head of index.html, when I inspect it, then an SVG favicon, an Apple touch icon and a theme-color equal to the graphite background exist (FR-129).
- **AC-8** Given README.md, when I read it, then it names https://harshalsaraogi.com as the live site and grep for letshackit.netlify.app finds 0 matches in the repo (FR-130).
- **AC-9** Given _headers and the CSP meta, when I read them, then scripts are allowed only from the site origin and HTTPS is enforced; on the host, requesting /nope returns HTTP 404 not 200 (NFR-32, NFR-24; host-dependent, human action, A-8, Q-5).
- **AC-10** Given the live URL, when I run Lighthouse mobile, then Performance at least 90, Accessibility at least 95, Best Practices at least 95, SEO 100 (NFR-11); and Google Rich Results Test finds a valid Person with no errors (NFR-23).
- **AC-11** Given the launch gate, when I check content.ts, then the architecture status is "confirmed" (Q-1 answered by owner) and the owner has approved the OG image and favicon (A-6); otherwise the story is blocked, not done.
- **AC-12** Given public/Harshal_Saraogi_Resume.pdf, when I check it, then it is the October 2026 file as supplied by the owner (FR-143).

## Out of scope
Any requirement id not listed above (each id has exactly one owning story; see .sdlc/03-backlog.md). No edits to main, no push, no deploy. Nothing that prints the HRIS vendor name outside the résumé PDF.

## Technical notes
Architecture F.3-F.6, G.1, build step 7, A-PRD-1 (PDF excluded). Human actions: DNS, HTTPS, 404 rule, redirects, deploy (Q-5). Agents never deploy.
Source of truth for numbers and claims: .sdlc/00-inputs/resume.md and testimonials.md. Requirement ownership: .sdlc/01-architecture.md A.5.

## Definition of done
- [ ] Code committed on branch revamp/mission-control, not pushed
- [ ] Every AC above executed (browser or terminal) with real output recorded in the handoff block
- [ ] `npm run lint`, `npx tsc -b` and `npm run build` report 0 errors
- [ ] API contract: n/a (static site, no API)
- [ ] Docs/runbook updated where behaviour or scripts changed
- [ ] Reviewed by code-reviewer and (user-facing) ux-reviewer
