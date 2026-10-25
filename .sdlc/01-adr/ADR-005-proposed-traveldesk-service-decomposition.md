# ADR-005 — Architecture showcase: a PROPOSED 16-service decomposition behind a data model, never presented as fact

**Status:** Proposed — **content is unconfirmed; owner must confirm or replace before launch** · 2026-10-25 · architect

## Context

FR-80..82 require an interactive diagram of TravelDesk with exactly 18 service nodes (Next.js front end, Spring Boot gateway, 16 domain services), 3 live integrations and 2 Phase-2 integrations. The résumé gives the counts, the front end, the gateway, the integrations and the PRD's scope list (travel requests, multi-level approvals, booking coordination, expense claims, OCR receipt capture, policy validation, reimbursement workflow, notifications, admin controls, multi-tenant), but not the 16 names or any edge (PRD Q-1). The PRD's rule is that every claim comes from the résumé. The orchestrator asked for a proposal so the section can be built and reviewed, clearly labelled, so the diagram never launches with invented facts by accident. FR-3 requires the diagram to accept the owner's answers without code changes.

## Options

1. **Leave the section empty until Q-1 is answered.** Honest but blocks build, design review and the ten-second test on the whole section.
2. **Build with generic placeholders ("Service 1…16").** Buildable, obviously fake, useless for judging layout density and label widths.
3. **Derive a proposal strictly from the résumé's scope nouns**, one service per noun, plus the minimum platform services implied by "multi-tenant from day one" and the three named integrations; carry a `status: 'proposed' | 'confirmed'` flag in the data file that renders an on-page banner and fails the launch check until confirmed.

## Decision

Option 3. The data file `src/data/traveldesk-architecture.ts` holds `{ status, groups, nodes, edges }`; the layout is computed by `lib/archLayout.ts` from that model, so the owner edits names and edges only. The proposal (16 nodes, detailed in `01-architecture.md` §D.1) maps 13 services to résumé nouns (travel request, approval workflow, booking coordination, expense claims, receipt capture & OCR, policy validation, reimbursement workflow, notifications, tenant management, HRIS adapter, travel vendor adapter, SAP finance adapter, admin & configuration) and marks 3 as inferences (identity & access, employee directory, audit & reporting) to be cut first. Phase-2 nodes connect only to the gateway because the résumé says nothing more. The file header and the architecture document both carry the sentence "PROPOSED — owner must confirm or replace before launch". While `status === 'proposed'` the section renders an amber banner "SERVICE NAMES PROPOSED — PENDING CONFIRMATION"; `scripts/check-confidential.sh` (the launch gate script) also fails if the built JS still contains the string `"proposed"` from this data file (the launch gate).

## Consequences

Good: the section can be designed, built, reviewed for density and accessibility, and demoed; the owner's answers drop in as data; the risk of shipping invented facts is handled structurally (banner + gate), not by memory.

Bad: the proposal might anchor the owner toward names that do not match the real system; mitigated by labelling each row with its derivation and by stating which three are inferences. If the real count is not 16, FR-80's "exactly 18" must be updated by the owner (the layout handles any count).

## Alternatives rejected and why

- Waiting: blocks too much for a question whose answer is pure data.
- Numbered placeholders: cannot be judged visually and would tempt a "fill in later" that never happens — the banner-plus-gate approach is safer than a blank.
