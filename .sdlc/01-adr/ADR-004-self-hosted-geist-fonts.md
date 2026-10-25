# ADR-004 — Fonts: self-host Geist and Geist Mono as vendored latin-subset variable woff2 files

**Status:** Proposed (for the owner gate) · 2026-10-25 · architect

## Context

The brief fixes Geist for body text and Geist Mono for labels (decision 2, FR-13). The current site loads Geist from Google Fonts, which breaks NFR-29 (no third-party requests during load) and the CSP (NFR-32). NFR-9 requires fonts served from `harshalsaraogi.com` with a fallback shown while they load. NFR-1/3 want a small, preloadable, layout-stable font path. Measured file sizes: Vercel's `geist` npm package ships full-charset variable files (Geist 69.6 kB, Geist Mono 71.1 kB); fontsource's `@fontsource-variable/geist{,-mono}` 5.3.0 ship per-subset variable files, latin = 29.4 kB and 23.1 kB. The site's copy uses only latin characters plus a handful of punctuation (· — – … quotes ↑ ↓ ›).

## Options

1. **Vendor the two latin variable woff2 files into `public/fonts/`** with hand-written `@font-face` (`font-display: swap`, latin `unicode-range`), metric-matched local fallbacks (`size-adjust`, `ascent-override`) and `<link rel="preload">` in `index.html`. 52 kB, stable URLs, no package.
2. **Depend on `@fontsource-variable/geist` and `-mono`** and import their CSS. Versioned via npm, but Vite copies every subset file into `dist/` (fine for the 5 MB cap, ~250 kB) and the hashed asset URLs make preloading from `index.html` impractical.
3. **Depend on `geist` (Vercel)** and reference its full-charset files. 2.7× the bytes for glyphs never used.
4. **Google Fonts** — forbidden by NFR-29 and the CSP.

## Decision

Option 1. Copy `geist-latin-wght-normal.woff2` and `geist-mono-latin-wght-normal.woff2` from fontsource 5.3.0 into `public/fonts/` together with `OFL.txt` and a `README.md` naming the source package and version. `styles/fonts.css` declares both faces with weight range 100–900 (the design uses 400/500/600), `font-display: swap`, the latin `unicode-range`, and two fallback faces with metric overrides so the swap does not shift layout. `index.html` preloads Geist Mono first (it paints the boot screen) then Geist. No italic files: the design uses no italics.

Glyph rule that follows: only characters inside the latin range may be typed; `→ ● ▮ ⏎ ≥ ⌘` are drawn with SVG/CSS or replaced by words (`CMD`, `ENTER`).

## Consequences

Good: 52 kB total, two requests, preloadable, cacheable for a year (`immutable`), no runtime dependency, no CSP exception, FR-140 unaffected. Updating fonts is a file copy and a version note.

Bad: the version is tracked by hand (no `npm outdated` signal); non-latin text would fall back (none exists); the glyph rule must be remembered when writing new copy.

## Alternatives rejected and why

- fontsource as a dependency: convenient but defeats preloading and copies unused subsets.
- Vercel `geist` package: wastes ~90 kB.
- Google Fonts: policy violation.
