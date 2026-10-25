// Gzip budgets after `vite build` (NFR-5, NFR-6, NFR-8, FR-141). Prints the table either way; exits 1 when a budget is exceeded.
// Numbers mirror BUDGET in src/config.ts; keep both in step.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const KB = 1024;
const BUDGET = {
  jsBeforeThreeGz: 300 * KB, // NFR-5
  threeChunkGz: 400 * KB, // NFR-6
  narrowFirstLoadGz: 1024 * KB, // NFR-8
  distTotal: 5 * 1024 * KB, // FR-141
  entryWarnGz: 120 * KB, // early warning (R-1, R-5)
};

const dist = new URL('../dist', import.meta.url).pathname;
if (!existsSync(dist)) {
  console.error('dist/ not found. Run `vite build` first.');
  process.exit(1);
}

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );

const files = walk(dist);
const gz = (path) => gzipSync(readFileSync(path), { level: 9 }).length;
const fmt = (n) => `${(n / KB).toFixed(1)} kB`;
const rel = (p) => relative(dist, p);

const assets = files.filter((f) => /[\\/]assets[\\/].+\.(js|css)$/.test(f));
const rows = assets.map((f) => ({ file: rel(f), raw: statSync(f).size, gz: gz(f) }));
const js = rows.filter((r) => r.file.endsWith('.js'));
const isThree = (r) => /(^|[\\/])three-[^\\/]*\.js$/.test(r.file);
const isEntry = (r) => /(^|[\\/])index-[^\\/]*\.js$/.test(r.file);

const jsBeforeThree = js.filter((r) => !isThree(r)).reduce((s, r) => s + r.gz, 0);
const threeChunk = js.filter(isThree).reduce((s, r) => s + r.gz, 0);
const entry = js.filter(isEntry).reduce((s, r) => s + r.gz, 0);

const firstLoadJs = js.filter((r) => isEntry(r) || /vendor-react-|motion-/.test(r.file));
const css = rows.filter((r) => r.file.endsWith('.css'));
const fixedFirstLoad = ['index.html', 'favicon.svg', 'fonts/geist-latin-wght-normal.woff2', 'fonts/geist-mono-latin-wght-normal.woff2']
  .map((n) => join(dist, n))
  .filter(existsSync);
const narrowFirstLoad =
  [...firstLoadJs, ...css].reduce((s, r) => s + r.gz, 0) +
  fixedFirstLoad.reduce((s, f) => s + (f.endsWith('.woff2') ? statSync(f).size : gz(f)), 0);

const distTotal = files.reduce((s, f) => s + statSync(f).size, 0);

console.log('Asset                                         raw        gzip');
for (const r of rows.sort((a, b) => b.gz - a.gz)) {
  console.log(`${r.file.padEnd(40)} ${fmt(r.raw).padStart(12)} ${fmt(r.gz).padStart(11)}`);
}
console.log('');

const checks = [
  { name: 'NFR-5  JS before the 3D chunk (gzip)', value: jsBeforeThree, limit: BUDGET.jsBeforeThreeGz },
  { name: 'NFR-6  3D chunk (gzip)', value: threeChunk, limit: BUDGET.threeChunkGz },
  { name: 'NFR-8  narrow-screen first load (gzip)', value: narrowFirstLoad, limit: BUDGET.narrowFirstLoadGz },
  { name: 'FR-141 dist/ total (raw)', value: distTotal, limit: BUDGET.distTotal },
];

let failed = false;
for (const c of checks) {
  const ok = c.value <= c.limit;
  if (!ok) failed = true;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name.padEnd(42)} ${fmt(c.value).padStart(10)} / ${fmt(c.limit)}`);
}
const warn = entry > BUDGET.entryWarnGz;
console.log(`${warn ? 'WARN' : 'info'}  entry chunk (gzip, early-warning line)${' '.repeat(5)} ${fmt(entry).padStart(10)} / ${fmt(BUDGET.entryWarnGz)}`);

process.exit(failed ? 1 : 0);
