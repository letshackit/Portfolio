# Brief — harshalsaraogi.com revamp

## Who this site is for
Harshal Saraogi is a Product Manager at Paytm who builds what he specs using an agentic AI
workflow (Claude Code, Cursor, Codex). He is positioning for **Forward Deployed Engineer (FDE)**
roles. A visitor must understand within ten seconds: *this person embeds with an enterprise,
understands the problem, and ships working software fast, with AI agents, then hands it to a team.*

Audience, in priority order: (1) FDE / solutions-engineering hiring managers at AI companies,
(2) product and engineering leaders, (3) recruiters skimming on a phone.

## The approved concept: "Mission Control"
The site is an operator's console for an AI-native builder. The hero is a live visualisation of his
real working pipeline — research → PRD → UX → prototype → Jira/Confluence → QA/UAT → deploy — with
"packets" of work flowing through it. Everything that moves on the page represents work happening.
No decorative motion.

Owner's decisions (final, 2026-10-25):
1. Concept: Mission Control, FDE framing, with flows/pipelines shown explicitly.
2. Palette: electric cyan for structure (systems, data, edges) + warm amber for agent activity
   (running states, live badges, moving packets). Near-black graphite base, NOT navy.
   Geist for body, Geist Mono for all labels, status lines, metrics, captions.
3. **Confidentiality:** never print the name "PeopleStrong". Describe it as "the incumbent
   enterprise HRIS" / "an HRIS vendor" and still show what was done (replacement scoped for
   ~50,000 employees, integration built, etc.). Everything else in the résumé is cleared.
4. Testimonials: five are cleared for publication as text quotes; one (SBI Life) is NOT — see
   `testimonials.md`. Never publish the screenshots, phone numbers or email addresses.
5. Canonical domain: **https://harshalsaraogi.com** (meta tags, sitemap, robots, JSON-LD).
   The old Netlify URL in the README is retired.

## Required sections (from the approved brainstorm)
1. Boot screen (replaces "Loading 47% / Welcome"): mono boot log, < 2 s, skippable.
2. Hero: FDE positioning line + mono status strip (currently deployed at Paytm Telco SaaS;
   3 platforms in UAT/dev; 16+ engineers led) + the 3D pipeline graph (React Three Fiber).
   Degrades to animated SVG on mobile / reduced-motion.
3. How I work: the pipeline as an interactive stepper; each stage shows the real artifact
   (116-page PRD; 94 → 56 stories across 10 epics; working Node/Next prototype; Jira+Confluence;
   QA/UAT and infosec gates).
4. Deployments (replaces the carousel): TravelDesk, HRMS, BSS, Cloud Commerce, AI Operations
   platform. Each: status badge (UAT / in development / prototype delivered / scoping), stack
   chips, headline metrics, expandable detail.
5. Architecture showcase: interactive SVG of TravelDesk's 18-service system (Next.js front,
   Spring Boot gateway, 16 domain services, HRIS / travel vendor / SAP integrations). Hover a
   node → its edges light up.
6. Capability matrix: Product / Technical / AI-native build / Delivery (replaces the physics spheres).
7. Deployment history: career timeline, both nine-month promotions called out.
8. Recognition: the five cleared testimonials.
9. Contact: restyled; "open to Forward Deployed Engineer roles" badge; resume download.
10. Command palette (Cmd/Ctrl+K): jump to section, download resume, copy email, open LinkedIn.

Phase 2 (NOT in scope now): "ask the agent" chat via Claude API — needs a backend.

## Hard constraints
- Keep: Vite, React 18, TypeScript strict, GSAP (ScrollSmoother, ScrollTrigger, SplitText —
  all in the core package now), custom cursor concept, single content file pattern (`src/data/`).
- Remove: the encrypted 3D avatar and its loader/decrypt code, Rapier/cannon/postprocessing
  physics scene, the four unused .glb files, the leftover `Akash_Malhotra.pdf`, `test.js`.
- Static hosting (Netlify-style). No server, no secrets, no analytics keys in source.
- Mobile first-class: every section readable at 360 px; 3D never blocks content on mobile.
- Accessibility: keyboard reachable nav + palette, visible focus, `prefers-reduced-motion`
  honoured everywhere, contrast ≥ 4.5:1 on body text.
- Performance target: first contentful paint < 1.5 s on a mid-range phone; main JS < 300 kB gz
  before the lazily-loaded 3D chunk.
- Lint and `tsc -b` must be clean at the end (currently 18 lint errors; the rebuild clears them).
