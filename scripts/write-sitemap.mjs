// Writes sitemap.xml with exactly one address and today's date as lastmod (FR-125).
// Writes public/sitemap.xml (committed) and dist/sitemap.xml when dist/ exists, so a build always carries the build date.
import { existsSync, writeFileSync } from 'node:fs';

const SITE = 'https://harshalsaraogi.com/';
const lastmod = new Date().toISOString().slice(0, 10);
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>
</urlset>
`;

const root = new URL('../', import.meta.url);
const targets = [new URL('public/sitemap.xml', root)];
if (existsSync(new URL('dist/', root))) targets.push(new URL('dist/sitemap.xml', root));
for (const t of targets) {
  writeFileSync(t, xml);
  console.log(`wrote ${t.pathname.replace(root.pathname, '')} (lastmod ${lastmod})`);
}
