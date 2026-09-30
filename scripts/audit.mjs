#!/usr/bin/env node
/**
 * audit.mjs — compare the Astro build against the live WordPress site.
 *
 * Fetches a representative sample of legacy URLs and reports, per page:
 *   status · HTML bytes · stylesheets · scripts · images · title · description · canonical
 * plus a site-wide payload summary. Run after `npm run build`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIVE = 'https://sunshine-lotionpump.com';

const SAMPLES = [
  ['/', 'home'],
  ['/products/', 'products archive'],
  ['/about-us/', 'about'],
  ['/contact-us/', 'contact'],
  ['/lotion-pump-manufacturer/', 'pillar article'],
  ['/foam-pump-manufacturer-landingpage/', 'landing page'],
  ['/lotion-pump-manufacturer-landingpage-v2/', 'landing page v2'],
  ['/product/wholesale-foam-pump-28-custom-plastic-packaging-for-hand-wash-shampoo-sunshine/', 'product'],
  ['/product-category/lotion-pump/', 'product category'],
  ['/category/blog/', 'blog parent'],
  ['/category/blog/product-guides/', 'blog category'],
  ['/foam-pump-vs-lotion-pump/', 'article'],
  ['/privacy-policy/', 'privacy'],
  ['/thank-you/', 'thank-you'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchLive(url) {
  const res = await fetch(LIVE + url, { headers: { accept: 'text/html' } });
  const html = await res.text();
  return { status: res.status, html };
}

function metrics(html) {
  const pick = (re) => (html.match(re) || [])[1];
  const decode = (value = '') =>
    value
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;|&#8217;/g, "'")
      .replace(/&#8211;|&#8212;/g, '–')
      .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
      .trim();
  return {
    bytes: Buffer.byteLength(html, 'utf8'),
    stylesheets: (html.match(/<link[^>]+rel=["']stylesheet["']/gi) || []).length,
    scripts: (html.match(/<script/gi) || []).length,
    externalScripts: (html.match(/<script[^>]+src=["']/gi) || []).length,
    images: (html.match(/<img/gi) || []).length,
    title: decode(pick(/<title>([^<]*)</i)),
    description: decode(pick(/<meta name="description" content="([^"]*)"/i)),
    canonical: pick(/<link rel="canonical" href="([^"]*)"/i),
    robots: decode(pick(/<meta name="robots" content="([^"]*)"/i)),
  };
}

const rows = [];
let liveTotal = 0;
let builtTotal = 0;

for (const [url, label] of SAMPLES) {
  const file = path.join(ROOT, 'dist/client', url.replace(/\/$/, ''), 'index.html');
  const built = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  const live = await fetchLive(url).catch(() => null);
  await sleep(120);

  const b = built ? metrics(built) : null;
  const l = live ? metrics(live.html) : null;
  if (b) builtTotal += b.bytes;
  if (l) liveTotal += l.bytes;

  rows.push({ url, label, built: b, live: l, status: live?.status });
}

const fmt = (n) => (n === null ? '—' : n > 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`);
const delta = (b, l) => (b === null || l === null ? '—' : `${(((b - l) / l) * 100).toFixed(0)}%`);

console.log('\n=== Astro rebuild vs live WordPress ===\n');
for (const row of rows) {
  console.log(`${row.url}  (${row.label})  [live ${row.status}]`);
  console.log(
    `  payload   live ${fmt(row.live?.bytes)}  →  built ${fmt(row.built?.bytes)}  (${delta(row.built?.bytes, row.live?.bytes)})`,
  );
  console.log(
    `  requests  live ${row.live?.stylesheets}L/${row.live?.scripts}S/${row.live?.images}I  →  built ${row.built?.stylesheets}L/${row.built?.scripts}S/${row.built?.images}I`,
  );
  console.log(
    `  title     ${row.built?.title === row.live?.title ? 'MATCH' : 'DIFF '}  ${row.built?.title ?? '—'}`,
  );
  console.log(
    `  canonical ${row.built?.canonical === row.live?.canonical ? 'MATCH' : 'DIFF '}  ${row.built?.canonical ?? '—'}`,
  );
  console.log(
    `  robots    ${row.built?.robots === row.live?.robots ? 'MATCH' : 'DIFF '}  ${row.built?.robots ?? '—'}`,
  );
  console.log('');
}

console.log(`sample payload total: live ${fmt(liveTotal)} → built ${fmt(builtTotal)}`);
console.log(
  `built pages: ${fs.readdirSync(path.join(ROOT, 'dist/client'), { recursive: true }).filter((f) => f.endsWith('.html')).length}`,
);
