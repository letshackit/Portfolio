# Backlog: harshalsaraogi.com "Mission Control"

Source: .sdlc/00-prd.md (143 FR, 34 NFR, amendments A-PRD-1..3), .sdlc/01-architecture.md A.5 and L. Stories are build steps 0..7 plus an Integration story between 6 and 7. Every id maps to exactly one story (script-checked: 0 duplicates, 0 unmapped, 0 unknown).

## Epic tree
- E0 Foundation: STORY-001
- E1 Readable page: STORY-002
- E2 Interactive visuals: STORY-003 (SVG pipeline), STORY-004 (architecture diagram), STORY-007 (3D hero)
- E3 Interaction layer: STORY-005
- E4 Motion: STORY-006
- E5 Integration and hardening: STORY-008
- E6 Launch: STORY-009

## Stories
| Story | Step | Title | Points | Depends on | Ids |
|---|---|---|---|---|---|
| STORY-001 | 0 | Foundation: clean-up, tokens, fonts, content file, build gates | 5 | none | 36 |
| STORY-002 | 1 | Readable console: every section as plain content (M1) | 8 | STORY-001 | 49 |
| STORY-003 | 2 | Pipeline drawn in SVG, stage stepper tabs, badges and pulses | 5 | STORY-002 | 13 |
| STORY-004 | 3 | Interactive TravelDesk architecture diagram | 5 | STORY-002 | 9 |
| STORY-005 | 4 | Boot screen, command palette, mobile menu, native scrolling, cursor | 8 | STORY-002 | 30 |
| STORY-006 | 5 | Motion chunk, gated ScrollSmoother, reveals, reduced-motion matrix | 5 | STORY-005 | 7 |
| STORY-007 | 6 | 3D hero graph with SVG fallback, lazy gate and watchdog | 8 | STORY-003 | 8 |
| STORY-008 | 6.5 | Integration: whole-page performance, accessibility and browser sweep | 5 | STORY-004, STORY-006, STORY-007 | 12 |
| STORY-009 | 7 | Launch prep: SEO assets, confidentiality gate, hosting files, Lighthouse | 5 | STORY-008 | 13 |

Total: 9 stories, 54 points. No story is over 8 points.

## Sprint sequence
1. Sprint 1: STORY-001 (gate: lint + tsc + build + budgets).
2. Sprint 2: STORY-002 (milestone M1 readable console).
3. Sprint 3: STORY-003, STORY-004 and STORY-005 in parallel (disjoint file lists); then STORY-006 after STORY-005 and STORY-007 after STORY-003 (risky 3D work starts as soon as its dependency lands; STORY-007 carries the NFR-5/6 size risk).
4. Sprint 4: STORY-008 Integration (needs 004, 006, 007), then STORY-009 Launch prep.

## Open owner items
- **Q-1 (service names)**: 16 TravelDesk domain service names and edges are PROPOSED (ADR-005), status "proposed". Carried on STORY-004; blocks launch in STORY-009, not build.
- Approve the architect-proposed copy (B.7), the OG image and favicon (A-6), and name the host (Q-5). NFR-24 and NFR-32 depend on host features (A-8). FR-143 is a file the owner supplied; it ships as supplied.
- NFR-2 (LCP) is at risk on first visit by design of FR-15 (ADR-008, R-1); measured in STORY-008.

## Traceability: requirement to story
| Requirement | Story |
|---|---|
| FR-1 | STORY-002 |
| FR-2 | STORY-002 |
| FR-3 | STORY-001 |
| FR-4 | STORY-001 |
| FR-5 | STORY-001 |
| FR-6 | STORY-006 |
| FR-7 | STORY-006 |
| FR-8 | STORY-006 |
| FR-9 | STORY-005 |
| FR-10 | STORY-001 |
| FR-11 | STORY-001 |
| FR-12 | STORY-001 |
| FR-13 | STORY-001 |
| FR-14 | STORY-006 |
| FR-15 | STORY-005 |
| FR-16 | STORY-005 |
| FR-17 | STORY-005 |
| FR-18 | STORY-005 |
| FR-19 | STORY-001 |
| FR-20 | STORY-005 |
| FR-21 | STORY-005 |
| FR-22 | STORY-005 |
| FR-23 | STORY-005 |
| FR-24 | STORY-002 |
| FR-25 | STORY-002 |
| FR-26 | STORY-002 |
| FR-27 | STORY-005 |
| FR-28 | STORY-005 |
| FR-29 | STORY-005 |
| FR-30 | STORY-005 |
| FR-31 | STORY-005 |
| FR-32 | STORY-005 |
| FR-33 | STORY-005 |
| FR-34 | STORY-005 |
| FR-35 | STORY-005 |
| FR-36 | STORY-005 |
| FR-37 | STORY-005 |
| FR-38 | STORY-005 |
| FR-39 | STORY-005 |
| FR-40 | STORY-005 |
| FR-41 | STORY-005 |
| FR-42 | STORY-005 |
| FR-43 | STORY-005 |
| FR-44 | STORY-005 |
| FR-45 | STORY-005 |
| FR-46 | STORY-002 |
| FR-47 | STORY-002 |
| FR-48 | STORY-002 |
| FR-49 | STORY-002 |
| FR-50 | STORY-002 |
| FR-51 | STORY-007 |
| FR-52 | STORY-007 |
| FR-53 | STORY-007 |
| FR-54 | STORY-007 |
| FR-55 | STORY-003 |
| FR-56 | STORY-003 |
| FR-57 | STORY-007 |
| FR-58 | STORY-003 |
| FR-59 | STORY-003 |
| FR-60 | STORY-003 |
| FR-61 | STORY-003 |
| FR-62 | STORY-003 |
| FR-63 | STORY-002 |
| FR-64 | STORY-002 |
| FR-65 | STORY-003 |
| FR-66 | STORY-003 |
| FR-67 | STORY-002 |
| FR-68 | STORY-002 |
| FR-69 | STORY-003 |
| FR-70 | STORY-002 |
| FR-71 | STORY-002 |
| FR-72 | STORY-002 |
| FR-73 | STORY-003 |
| FR-74 | STORY-002 |
| FR-75 | STORY-002 |
| FR-76 | STORY-002 |
| FR-77 | STORY-002 |
| FR-78 | STORY-002 |
| FR-79 | STORY-003 |
| FR-80 | STORY-004 |
| FR-81 | STORY-004 |
| FR-82 | STORY-004 |
| FR-83 | STORY-004 |
| FR-84 | STORY-004 |
| FR-85 | STORY-004 |
| FR-86 | STORY-004 |
| FR-87 | STORY-004 |
| FR-88 | STORY-002 |
| FR-89 | STORY-002 |
| FR-90 | STORY-004 |
| FR-91 | STORY-002 |
| FR-92 | STORY-002 |
| FR-93 | STORY-001 |
| FR-94 | STORY-002 |
| FR-95 | STORY-002 |
| FR-96 | STORY-006 |
| FR-97 | STORY-002 |
| FR-98 | STORY-002 |
| FR-99 | STORY-002 |
| FR-100 | STORY-002 |
| FR-101 | STORY-002 |
| FR-102 | STORY-006 |
| FR-103 | STORY-002 |
| FR-104 | STORY-002 |
| FR-105 | STORY-001 |
| FR-106 | STORY-002 |
| FR-107 | STORY-002 |
| FR-108 | STORY-001 |
| FR-109 | STORY-002 |
| FR-110 | STORY-002 |
| FR-111 | STORY-002 |
| FR-112 | STORY-005 |
| FR-113 | STORY-002 |
| FR-114 | STORY-002 |
| FR-115 | STORY-002 |
| FR-116 | STORY-002 |
| FR-117 | STORY-002 |
| FR-118 | STORY-003 |
| FR-119 | STORY-001 |
| FR-120 | STORY-001 |
| FR-121 | STORY-001 |
| FR-122 | STORY-009 |
| FR-123 | STORY-001 |
| FR-124 | STORY-001 |
| FR-125 | STORY-009 |
| FR-126 | STORY-009 |
| FR-127 | STORY-001 |
| FR-128 | STORY-001 |
| FR-129 | STORY-009 |
| FR-130 | STORY-009 |
| FR-131 | STORY-009 |
| FR-132 | STORY-001 |
| FR-133 | STORY-009 |
| FR-134 | STORY-001 |
| FR-135 | STORY-001 |
| FR-136 | STORY-001 |
| FR-137 | STORY-001 |
| FR-138 | STORY-001 |
| FR-139 | STORY-001 |
| FR-140 | STORY-001 |
| FR-141 | STORY-001 |
| FR-142 | STORY-001 |
| FR-143 | STORY-009 |
| NFR-1 | STORY-008 |
| NFR-2 | STORY-008 |
| NFR-3 | STORY-008 |
| NFR-4 | STORY-008 |
| NFR-5 | STORY-007 |
| NFR-6 | STORY-007 |
| NFR-7 | STORY-007 |
| NFR-8 | STORY-008 |
| NFR-9 | STORY-001 |
| NFR-10 | STORY-008 |
| NFR-11 | STORY-009 |
| NFR-12 | STORY-008 |
| NFR-13 | STORY-001 |
| NFR-14 | STORY-001 |
| NFR-15 | STORY-008 |
| NFR-16 | STORY-001 |
| NFR-17 | STORY-002 |
| NFR-18 | STORY-006 |
| NFR-19 | STORY-008 |
| NFR-20 | STORY-002 |
| NFR-21 | STORY-002 |
| NFR-22 | STORY-008 |
| NFR-23 | STORY-009 |
| NFR-24 | STORY-009 |
| NFR-25 | STORY-008 |
| NFR-26 | STORY-008 |
| NFR-27 | STORY-001 |
| NFR-28 | STORY-009 |
| NFR-29 | STORY-001 |
| NFR-30 | STORY-005 |
| NFR-31 | STORY-002 |
| NFR-32 | STORY-009 |
| NFR-33 | STORY-001 |
| NFR-34 | STORY-001 |

Uncovered requirements: none. Orphan stories: none.
