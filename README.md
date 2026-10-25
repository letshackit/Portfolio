# harshalsaraogi.com

Personal site of Harshal Saraogi, an AI-native builder and Product Manager open to Forward Deployed Engineer roles. Live site: [https://harshalsaraogi.com](https://harshalsaraogi.com).

The page is built as a "mission control" console: a hero pipeline (seven stages, from research to deploy) with moving packets, a stepper, deployment cards, an interactive TravelDesk architecture diagram, capabilities, history, recognition and contact. One page, no backend, no analytics, no cookies.

## Stack

- React 18 and TypeScript (strict), built with Vite.
- Plain CSS with design tokens (`src/styles/tokens.css`); no CSS framework.
- React Three Fiber and Three.js for the 3D hero on capable desktops, loaded as a separate chunk. Phones, reduced-motion visitors and browsers without WebGL get the SVG version.
- GSAP, loaded only when motion is allowed.
- Geist and Geist Mono, self-hosted in `public/fonts`.
- Vitest and Testing Library for unit and DOM tests.

## Getting started

```sh
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `tsc -b`. |
| `npm run build` | Type-check and production build into `dist/`. |
| `npm test` | Vitest, once. |
| `npm run budgets` | Gzip size budgets on `dist/` (`scripts/check-budgets.mjs`). |
| `npm run sitemap` | Writes `sitemap.xml` (one address, today as `lastmod`) into `public/` and `dist/`. |
| `npm run check:confidential` | Launch gate: scans `src/`, `scripts/`, `index.html`, `public/` and `dist/` for confidential strings, the retired host name and tracker or secret patterns. The résumé PDF is excluded by owner decision. Add `--launch` (`sh scripts/check-confidential.sh --launch`) to also fail while the architecture is still proposed. |
| `npm run verify` | Lint, type-check, build, sitemap, budgets and the confidentiality check, in that order. |
| `npm run lighthouse` | Builds to a scratch folder, serves it with `vite preview` and runs Lighthouse (mobile). Needs Chrome. Reports go to `.sdlc/reports/`. The local score is a proxy; judge on the live URL. |
| `sh scripts/make-og.sh` | Re-renders `public/og-image.png` (from `scripts/og-image.svg`) and `public/apple-touch-icon.png` with headless Chrome. Only needed when the artwork changes. |

## Editing the content

All copy lives in one typed file, `src/data/content.ts`, written from the résumé. Every number on the site must also appear in the résumé. The `<title>`, meta description, Open Graph tags, JSON-LD and the `<noscript>` text in `index.html` are kept in step with it by hand.

The résumé PDF is `public/Harshal_Saraogi_Resume.pdf` and ships exactly as supplied.

## The "service names proposed" banner

The résumé gives the TravelDesk counts (a front end, a gateway, 16 domain services, 3 live and 2 Phase-2 integrations) but not the service names or the connections. The names in `src/data/traveldesk-architecture.ts` are a proposal derived from the résumé's scope list, and while `status: 'proposed'` the architecture section shows an amber banner: "SERVICE NAMES PROPOSED — PENDING CONFIRMATION". See `.sdlc/01-adr/ADR-005-proposed-traveldesk-service-decomposition.md`.

To confirm: edit the node names and edges in that file to match the real system, set `status: 'confirmed'`, and run `sh scripts/check-confidential.sh --launch`. The banner disappears and the launch gate passes. The layout adapts to any node count.

## Deploy

The site is the static `dist/` folder, so any static host works.

1. `npm run verify` (and `npm test`).
2. Deploy `dist/`. `public/_headers` carries the security and cache headers for Netlify and Cloudflare Pages (use `vercel.json` `headers` on Vercel). `public/404.html` is served with a 404 status for unknown paths; do not add a single-page-app rewrite, because the site has one route.
3. On the host: point `harshalsaraogi.com` at it, enable HTTPS, and redirect `www` to the apex.
4. Run Lighthouse (mobile) against the live URL. Targets: Performance 90, Accessibility 95, Best Practices 95, SEO 100.

Deploying is a human action; nothing in this repository deploys itself.

## Licence

See `LICENSE`.
