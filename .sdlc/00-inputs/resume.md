# Résumé — Harshal Saraogi (transcribed from public/Harshal_Saraogi_Resume.pdf, October 2026 version, replaced in repo 2026-10-25)
# Single source of truth for site content. Confidentiality rule: never print "PeopleStrong";
# say "the incumbent enterprise HRIS" / "HRIS vendor" instead.

**Headline:** Product Manager | AI-Native Builder-PM | Enterprise SaaS, Cloud Commerce & AI Platforms
**Location:** Delhi NCR, India · **Phone:** +91 84478 56889 · **Email:** saraogiharshal@gmail.com
**Web:** harshalsaraogi.com · LinkedIn: https://www.linkedin.com/in/harshal-saraogi-b07260194/ · GitHub (handle: letshackit)

## Summary
Product Manager with 5+ years across enterprise SaaS, cloud commerce, and AI platforms, currently
owning the Telco SaaS and AI-platform product lines at Paytm. "I build what I spec": designs,
prototypes, and ships production-grade enterprise platforms end to end using an agentic AI workflow
(Claude Code, Cursor, Codex) covering market research, PRDs, UX, Node.js/Next.js code, Jira and
Confluence, QA, and deployment — then hires and leads the engineering teams that scale them. Three
such platforms (TravelDesk, HRMS, BSS) are in UAT or active development at a 50,000-employee
organisation. PG in AI & Machine Learning, IIIT Bangalore.

## Experience

### Paytm (One97 Communications) · Noida · Jul 2025 – Present
- Product Manager I — Telco SaaS, Cloud Commerce & AI Platforms (Apr 2026 – Present)
- Associate Product Manager (Jul 2025 – Mar 2026) — promoted to PM I in 9 months
- Owns product strategy, technical scoping, and delivery for Paytm Telco SaaS initiatives — Cloud
  Commerce, Business Support System (BSS), TravelDesk, HRMS, and the AI Operations platform — from
  discovery through release, with engineering, infosec, finance, HR, and senior management.
- Runs an agentic product workflow: market research → PRD → UX design → working Node.js/Next.js
  prototype → Jira epics/stories + Confluence specs → QA/UAT, with Claude Code, Cursor, and Codex as
  the primary build tools. Working prototypes, not slide decks, are the alignment artifact.
- Leads execution for 16+ engineers across Kanban streams: Jira setup, acceptance criteria, release
  trackers, daily unblocking, infosec review gates, go-live planning.
- Leads technical scoping: API contracts, data models, service boundaries, NFRs, cloud deployment,
  performance/security requirements; defines QA coverage and UAT readiness per release.
- Scoped the AI Operations platform — chatbots, digital avatars, IVR journeys, bot configuration,
  conversation orchestration, RBAC, analytics/reporting, third-party integrations — and initiated
  evaluation of locally hosted Small Language Models and OCR pipelines for document processing
  (lower inference cost, data privacy, less dependency on external LLM APIs).

#### Flagship builds at Paytm (designed, prototyped, delivered end to end with the agentic workflow)

**TravelDesk — Corporate Travel & Expense Reimbursement Platform.** Conceived, architected, built
solo; in organisational UAT; Phase-1 production rollout targeted Jan 2027.
- 116-page master PRD: travel requests, multi-level approvals, booking coordination, expense claims,
  OCR receipt capture, policy validation, reimbursement workflow, notifications, admin controls.
  ~94 source stories consolidated into 56 Jira-ready stories across 10 epics.
- 18-microservice architecture: Next.js frontend, Spring Boot API gateway, 16 domain services;
  multi-tenant from day one; integrated with the enterprise HRIS, a corporate travel vendor
  (Quest2Travel), and SAP.
- Built and deployed the MVP solo with AI-assisted development; now leads a six-engineer post-MVP
  team (2 backend, 2 frontend, 2 QA) working agentically; mobile web app and Phase-2 integrations
  (EBIX forex, Recharge) scoped and sequenced around infosec review gates.

**HRMS — In-house Human Resource Management System.** Replacement for the incumbent enterprise
HRIS for ~50,000 employees; scoping and prototyping.
- 461-page, 13-module PRD benchmarked against Workday, Darwinbox and the incumbent; market study
  across 12+ vendors (Keka, greytHR, ZingHR, Zoho, Rippling, HiBob, BambooHR, Deel) to close scope
  for a modular, multi-tenant ecosystem designed to be productised beyond Paytm.
- India compliance scoped end to end (PF, ESI, PT, LWF, TDS, gratuity, Labour Codes, DPDP Act);
  gap analysis identified Performance Management as the critical-path module blocking Compensation
  Planning.
- Co-defined target architecture: modular-monolith core (Postgres, schema-per-module, transactional
  outbox, event bus) + five satellite services (notifications, document generation, payroll vendor
  adapter, AI assistant, analytics). Generated a configurable Configuration Engine and the
  "Obsidian Command" design system via Codex; UI prototype covers the core HR flows.

**BSS — Telco Business Support System.** In active development.
- Designed the complete product and UX, built the working Node.js prototype, set up Jira and
  Confluence; personally delivered ~60% of the build from local dev through deployment, then hired
  and onboarded a dedicated engineering team.

**Cloud Commerce — SaaS prototype for SAP-to-cloud migration (Paytm Telco).** Prototype delivered.
- 8-module working Node.js prototype in Cursor within 3 months; scoped 100+ APIs and integration
  touchpoints, service boundaries, admin/product modules — cut ~1 month of downstream
  discovery/build effort; became the reference design for the migration strategy.

### Hippo Innovations · Gurugram · Dec 2023 – Jul 2025 — Senior Project Associate, Product Development
- 50+ business use cases → PRDs, user journeys, roadmaps for 5+ cloud products (AWS, Google Cloud)
  built with React, Node.js, Angular, Vue.js teams.
- Owned delivery discovery → launch; introduced structured QA/UAT gates; backlog refinement, sprint
  planning, stakeholder reviews in Jira, Asana, Trello.
- Primary product contact for enterprise storefront clients incl. Amul and SBI Life; written client
  commendations.

### ANS Commerce (Flipkart Group) · Gurugram · Sep 2022 – Dec 2023
- Senior Associate Project Manager, Product Development (Jun 2023 – Dec 2023)
- Associate Project Manager, Web Applications & Product Delivery (Sep 2022 – May 2023) — promoted in 9 months
- Led roadmap execution, prioritisation, cross-functional delivery for in-house commerce platforms
  Kartify and Flipshop.
- PRDs for integrations and client programmes — Shop by Color, MoEngage, Bose, ITC Fiama D2C, Ekart
  Logistics — ideation to launch and in-market iteration.
- Delivery visibility via Jira + Confluence; recognised in writing by ITC, Ekart, Alma Mater.

### AdsRole · Noida · Jun 2021 – May 2022 — Assistant Manager, Product Delivery & Web Projects
- 20+ concurrent client programmes, 98% on-time completion; scope, milestones, QA checkpoints,
  acceptance criteria. Resourced designers/devs/content/analytics/QA; weekly calls with US, UK,
  Australian stakeholders.

## Skills
- **Product:** discovery, market research, MVP scoping, PRDs/BRDs, roadmaps, user journeys, user
  stories, acceptance criteria, prioritisation, launch planning, stakeholder governance
- **Technical:** system design, API design and contracts, data modelling, microservices and modular
  monoliths, NFRs, AWS, GCP, SAP-to-cloud migration, OCR pipelines, local SLMs
- **AI-native build:** Claude Code, Cursor, OpenAI Codex, prompt engineering, agentic development
  workflows, Node.js, Next.js, JavaScript, Python, PostgreSQL, MongoDB, MySQL
- **Delivery and tools:** Jira, Confluence, Figma, Kanban and Scrum, QA/UAT, release management,
  infosec review gates, GA4, GTM

## Education
- PG Program in Artificial Intelligence & Machine Learning — IIIT Bangalore (Nov 2023 – Aug 2025)
- Bachelor of Computer Applications — Asian School of Business, Noida (Aug 2019 – Apr 2022)
- Certifications: Foundations of Project Management (Google); Python for Data Science (IBM);
  Executive Certification in Cloud Computing (NIIT); ISO/IEC 27001 Information Security Associate
  (SkillFront); Google Analytics 360
- Research publication (from the current site, keep): "Blue Brain: The Stimulation Algorithm",
  ABS International Journal of Management,
  https://absjournal.abs.edu.in/ABS-Journal-Volume-9-isuue-2december-2021/article-5.pdf

## Client recognition
Written commendations from ITC (Fiama), Amul, Ekart (Flipkart), SBI Life, Alma Mater. Cleared
quotes are in `testimonials.md`. SBI Life may be named as a client but its quote must NOT appear.
