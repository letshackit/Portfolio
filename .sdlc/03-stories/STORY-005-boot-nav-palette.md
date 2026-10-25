# STORY-005: Boot screen, command palette, mobile menu, native scrolling, cursor
**Epic:** E3 Interaction layer   **Points:** 8   **Serves:** FR-9, FR-15..FR-18, FR-20..FR-23, FR-27..FR-45, FR-112, NFR-30
**Depends on:** STORY-002   **Build step:** 4

## User story
As a hiring manager using a keyboard, I want to skip the boot, open the command palette, copy the email and jump to any section, so that I reach what I need in a few keystrokes.

## Requirements implemented (each owned by this story only)
FR-9, FR-15..FR-18, FR-20..FR-23, FR-27..FR-45, FR-112, NFR-30  (30 ids)

## Files owned
src/lib/{scroll,session,clipboard}.ts, src/boot/BootScreen.tsx(+css), src/palette/{CommandPalette,commands}.ts(x)(+css), src/ui/{Toast,Cursor}.tsx, src/nav/MobileMenu.tsx, src/providers/UiProvider.tsx (active section), src/App.tsx (boot gate, hash landing, #top sentinel), src/contact/Contact.tsx (copy button wiring)

## Acceptance criteria
- **AC-1** Given a new browser session without reduced motion, when I open the site, then a full-screen mono boot log prints its lines one after another; each line is a fact from content.boot.lines (FR-15, FR-19 data from STORY-001).
- **AC-2** Given the boot screen, when I time it, then it ends no later than 2 s after it appears, without waiting for any chunk (FR-16).
- **AC-3** Given the boot screen, when I press any key, click or tap, then it ends at once (FR-17).
- **AC-4** Given the boot screen, when it mounts, then a visible "Skip" button holds focus first; at 360 px lines wrap inside the screen and Skip is at least 44 x 44 px (FR-18, FR-22).
- **AC-5** Given the boot has ended, when I reload or return in the same session, then it does not show again; sessionStorage holds one key (hs.boot), there are no cookies and no other storage (FR-20, NFR-30).
- **AC-6** Given reduced motion on, when I open the site, then the boot screen never appears (FR-21).
- **AC-7** Given the boot ends, when I press Tab, then focus is at the start of the page and the next Tab reaches "Skip to content" (FR-23).
- **AC-8** Given the address ends in #deployments, when the boot ends, then the page lands on that section (FR-2 landing).
- **AC-9** Given scrolling, when a section is in view, then its header link is visibly marked and has aria-current="location" (FR-27).
- **AC-10** Given I activate a header link, when the page moves, then keyboard focus is on that section heading (FR-28); with reduced motion the jump is instant (FR-31).
- **AC-11** Given a 360 px window, when I view the header, then the section links are behind a menu button and the bar is at most 64 px tall (FR-29).
- **AC-12** Given the menu is open, when I pick a link, press Escape or tap the button again, then it closes and focus returns to the menu button; with reduced motion it opens with no animation (FR-30, FR-31).
- **AC-13** Given any point on the page, when I press Cmd+K (macOS) or Ctrl+K, then the palette opens; pressing again closes it; the header palette button also opens it on touch (FR-32, FR-33).
- **AC-14** Given the palette is open, when I read its list, then it holds exactly 11 commands: 8 "Go to" (one per anchor), "Download résumé", "Copy email", "Open LinkedIn" (FR-34).
- **AC-15** Given the palette, when I type "RESUME" then only matching commands remain, and for "zzz" it shows "No matching command" (FR-35).
- **AC-16** Given the palette, when I press Down, Up and Enter, then the highlight moves and Enter runs the highlighted command (FR-36).
- **AC-17** Given the palette, when I press Escape, then it closes and focus returns to the element that had it before (FR-37).
- **AC-18** Given the palette is open, when I press Tab repeatedly and try to scroll, then focus stays inside and the page does not scroll; the accessibility tree shows a dialog named "Command palette" (FR-38).
- **AC-19** Given "Copy email", when I run it, then the clipboard holds saraogiharshal@gmail.com and "Email copied" shows for at least 2 s and is announced via a live region (FR-39). The Contact copy button does the same (FR-112).
- **AC-20** Given the clipboard is blocked (deny permission or stub writeText to reject), when I run "Copy email", then the palette shows the address as selectable text and a "Write an email" link (FR-40).
- **AC-21** Given "Download résumé", when I run it, then Harshal_Saraogi_Resume.pdf downloads under that file name from the site origin (FR-41).
- **AC-22** Given "Open LinkedIn", when I run it, then https://www.linkedin.com/in/harshal-saraogi-b07260194/ opens in a new tab with noopener noreferrer (FR-42).
- **AC-23** Given a "Go to" command, when I run it, then the palette closes and behaviour equals the matching header link, including focus on the heading (FR-43).
- **AC-24** Given a 360 px window, when I open the palette, then it fills the screen width and every command row is at least 44 px tall (FR-44); with reduced motion it opens and closes with no animation (FR-45).
- **AC-25** Given a mouse on a wide screen without reduced motion, when I move the pointer, then the custom cursor shows; with touch emulation or reduced motion the system cursor shows and the cursor does not mount (FR-9).

## Out of scope
Any requirement id not listed above (each id has exactly one owning story; see .sdlc/03-backlog.md). No edits to main, no push, no deploy. Nothing that prints the HRIS vendor name outside the résumé PDF.

## Technical notes
Architecture E.1-E.5, A.5 rows FR-15..45, ADR-002 (scroll seam; native mode only in this step), build step 4. Walk-through is PRD launch check 5.
Source of truth for numbers and claims: .sdlc/00-inputs/resume.md and testimonials.md. Requirement ownership: .sdlc/01-architecture.md A.5.

## Definition of done
- [ ] Code committed on branch revamp/mission-control, not pushed
- [ ] Every AC above executed (browser or terminal) with real output recorded in the handoff block
- [ ] `npm run lint`, `npx tsc -b` and `npm run build` report 0 errors
- [ ] API contract: n/a (static site, no API)
- [ ] Docs/runbook updated where behaviour or scripts changed
- [ ] Reviewed by code-reviewer and (user-facing) ux-reviewer
