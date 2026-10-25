# STORY-001: Foundation: clean-up, tokens, fonts, content file, build gates
**Epic:** E0 Foundation   **Points:** 5   **Serves:** FR-3..FR-5, FR-10..FR-13, FR-19, FR-93, FR-105, FR-108, FR-119..FR-121, FR-123..FR-124, FR-127..FR-128, FR-132, FR-134..FR-142, NFR-9, NFR-13..NFR-14, NFR-16, NFR-27, NFR-29, NFR-33..NFR-34
**Depends on:** none   **Build step:** 0

## User story
As the owner, I want a clean repository with the design tokens, self-hosted fonts, a single content file written from resume.md, and automated build gates, so that every later step builds on verified ground and no unsupported claim can enter.

## Requirements implemented (each owned by this story only)
FR-3..FR-5, FR-10..FR-13, FR-19, FR-93, FR-105, FR-108, FR-119..FR-121, FR-123..FR-124, FR-127..FR-128, FR-132, FR-134..FR-142, NFR-9, NFR-13..NFR-14, NFR-16, NFR-27, NFR-29, NFR-33..NFR-34  (36 ids)

## Files owned
package.json, vite.config.ts, eslint.config.js, index.html (head, meta, JSON-LD, noscript), src/config.ts, src/data/content.types.ts, src/data/content.ts, src/data/traveldesk-architecture.ts (status proposed), src/styles/{tokens,base,grid,utilities,fonts}.css, public/fonts/*, scripts/check-budgets.mjs; deletions per PRD FR-136..138

## Acceptance criteria
- **AC-1** Given the branch after this step, when I run `ls src/components/Character public/models public/draco public/images "src/applemodel.glb" "src/model.glb" "src/normal suit.glb" public/Akash_Malhotra.pdf test.js src/components/TechStack.tsx src/components/WorkImage.tsx src/data/boneData.ts`, then every path reports "No such file" (FR-136, FR-137, FR-138).
- **AC-2** Given package.json, when I search it for `@react-three/cannon`, `@react-three/rapier`, `@react-three/postprocessing` and `@vercel/analytics`, then there are 0 matches (FR-139).
- **AC-3** Given package.json and src/, when I list every dependency and grep src/ and index.html/scripts for an import of each, then every listed package is imported at least once (FR-140).
- **AC-4** Given a clean checkout, when I run `npm run lint` and `npx tsc -b`, then both report 0 errors (NFR-33).
- **AC-5** Given a clean checkout, when I run `npm run build`, then it exits 0 (NFR-34).
- **AC-6** Given a build, when I run `node scripts/check-budgets.mjs`, then it prints sizes and exits 0 only if the built folder including the résumé PDF is under 5 MB (FR-141 is owned by the script; the final numbers are re-read in STORY-009).
- **AC-7** Given src/data/content.ts, when I list every numeral in it and search resume.md for each, then 100% appear in resume.md; and a search for "30%", "25%", "60% fewer", "50% web traffic", "Cisco", "fintech" and "B2C" finds 0 matches (FR-142). "60%" appears only in the BSS "about 60% of the build delivered personally" claim.
- **AC-8** Given content.ts, when I search it for the HRIS vendor name (case-insensitive, with and without a space), the SBI Life quote author name (as listed in testimonials.md), "@" other than saraogiharshal@gmail.com, and any phone number other than +91 84478 56889, then there are 0 matches; "SBI Life" occurs exactly once, in the Hippo Innovations entry (FR-132, FR-134, FR-135, FR-108).
- **AC-9** Given content.ts recognition entries, when I diff each quote against testimonials.md, then quote text is word for word, with shortening only by ellipsis, and no field exists for logo, screenshot, phone or email (FR-105, FR-108).
- **AC-10** Given content.ts, when I read the capabilities, then each group lists exactly the résumé skills from the PRD Content table, no additions (FR-93); and boot.lines holds the six proposed boot lines, each a fact from the file (FR-19).
- **AC-11** Given tokens.css, when I open it, then --g-0 is #0B0C0E, cyan and amber exist as separate token families, and no colour or size literal exists outside tokens.css (FR-10, FR-11, FR-12). Contrast of every text/background token pair is at least 4.5:1 and control borders and focus at least 3:1, computed with a script (NFR-13, NFR-14).
- **AC-12** Given the type scale at a 360 px window, when I inspect computed styles on body text and a mono label, then body is at least 16 px and mono at least 12 px (FR-5). Geist is applied to body and Geist Mono to labels (FR-13), and font files load from the site origin with a fallback font showing while they load (NFR-9).
- **AC-13** Given a 360 px window on the empty page, when I scroll horizontally, then document.documentElement.scrollWidth equals clientWidth (FR-4).
- **AC-14** Given the DevTools network panel on load, when the page finishes, then every request is to the same origin (NFR-29); grep of src/ for `outline: none` and `outline: 0` finds 0 matches, and base.css has a :focus-visible rule of at least 2 px (NFR-16).
- **AC-15** Given the built dist (scratch outDir), when I view index.html source with JavaScript disabled, then it contains canonical, title and description within 60/160 characters, og:type website, og:url, og:title, og:description, og:site_name, og:locale en_IN, twitter:card summary_large_image, a JSON-LD Person with the PRD "Search" fields, and a noscript block with name, positioning line, email, LinkedIn and résumé link (FR-119..121, FR-123, FR-124, FR-127, FR-128, FR-120).
- **AC-16** Given the build output folder, when I list files, then there is no server code, no runtime secret and no .env file (NFR-27).
- **AC-17** Given the entry chunk in the build, when I gzip it, then the JavaScript loaded before any 3D chunk is at most 300 kB

## Out of scope
Any requirement id not listed above (each id has exactly one owning story; see .sdlc/03-backlog.md). No edits to main, no push, no deploy. Nothing that prints the HRIS vendor name outside the résumé PDF.

## Technical notes
Architecture sections 0, A.4, A.5, B.1-B.3, F.1-F.3, F.2 clean-up list, G.2 dependencies, ADR-003, ADR-004. NFR-5 is owned by STORY-007; the check in the last AC is an early-warning only.
Source of truth for numbers and claims: .sdlc/00-inputs/resume.md and testimonials.md. Requirement ownership: .sdlc/01-architecture.md A.5.

## Definition of done
- [ ] Code committed on branch revamp/mission-control, not pushed
- [ ] Every AC above executed (browser or terminal) with real output recorded in the handoff block
- [ ] `npm run lint`, `npx tsc -b` and `npm run build` report 0 errors
- [ ] API contract: n/a (static site, no API)
- [ ] Docs/runbook updated where behaviour or scripts changed
- [ ] Reviewed by code-reviewer and (user-facing) ux-reviewer
