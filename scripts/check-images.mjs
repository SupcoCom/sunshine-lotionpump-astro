#!/usr/bin/env node
/**
 * Check every image referenced by the built site.
 * Walks dist/client, collects <img src> / srcset / og:image / JSON-LD image URLs,
 * dedupes, then reports HTTP status for each.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLIENT = path.join(ROOT, 'dist/client');

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
})(CLIENT);

const found = new Map(); // url -> Set<page>

function add(url, page) {
  if (!url) return;
  if (!found.has(url)) found.set(url, new Set());
  found.get(url).add(page);
}

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const page = path.relative(CLIENT, file).replace(/\\/g, '/');

  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const src = (tag.match(/\bsrc=["']([^"']+)["']/i) || [])[1];
    add(src, page);
    for (const s of tag.matchAll(/\bsrcset=["']([^"']+)["']/gi)) {
      for (const part of s[1].split(',')) {
        const url = part.trim().split(/\s+/)[0];
        add(url, page);
      }
    }
    const dataSrc = (tag.match(/\bdata-src=["']([^"']+)["']/i) || [])[1];
    add(dataSrc, page);
  }
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    if (/property=["']og:image["']/i.test(tag) || /name=["']twitter:image["']/i.test(tag)) {
      add((tag.match(/content=["']([^"']+)["']/i) || [])[1], page);
    }
  }
  for (const m of html.matchAll(/"image"\s*:\s*"([^"]+)"/g)) add(m[1], page);
  for (const m of html.matchAll(/"image"\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"/g)) add(m[1], page);
  // CSS url(...) references (inline styles + <style> blocks)
  for (const m of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) add(m[1], page);
}

const urls = [...found.keys()].sort();
console.log(`pages scanned : ${files.length}`);
console.log(`unique images  : ${urls.length}\n`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function check(url) {
  // relative URL → resolve against the site
  const absolute = url.startsWith('http') ? url : new URL(url, 'https://sunshine-lotionpump.com/').toString();
  try {
    const res = await fetch(absolute, { method: 'GET', headers: { range: 'bytes=0-0' } });
    const buf = await res.arrayBuffer();
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
    const cfChallenge = res.status === 403 && text.includes('Attention Required');
    return {
      url,
      absolute,
      status: res.status,
      cfChallenge,
      type: res.headers.get('content-type') || '',
    };
  } catch (error) {
    return { url, absolute, status: 0, cfChallenge: false, type: String(error.message || error) };
  }
}

const results = [];
const CONCURRENCY = 8;
let cursor = 0;
const runners = Array.from({ length: CONCURRENCY }, async () => {
  while (cursor < urls.length) {
    const i = cursor++;
    results[i] = await check(urls[i]);
    if (i % 25 === 0) await sleep(50);
  }
});
await Promise.all(runners);

const broken = results.filter((r) => r.status < 200 || r.status >= 400);
const realBroken = broken.filter((r) => !r.cfChallenge);
const cfBlocked = broken.filter((r) => r.cfChallenge);
const ok = results.filter((r) => r.status >= 200 && r.status < 400);

console.log(`OK    : ${ok.length}`);
console.log(`BROKEN: ${realBroken.length}  (Cloudflare-challenge blocked: ${cfBlocked.length})\n`);

if (realBroken.length) {
  console.log('=== BROKEN IMAGES (real) ===');
  for (const r of realBroken) {
    const pages = [...found.get(r.url)].slice(0, 4);
    console.log(`  [${r.status}] ${r.url}`);
    console.log(`         on: ${pages.join(', ')}${found.get(r.url).size > 4 ? ` +${found.get(r.url).size - 4} more` : ''}`);
  }
}

if (cfBlocked.length) {
  console.log('\n=== CLOUDFLARE-CHALLENGE BLOCKED (need a browser to verify) ===');
  for (const r of cfBlocked) console.log(`  ${r.url}`);
}

// also flag images that are referenced but were never reachable at all
const byHost = {};
for (const r of results) {
  let host = 'relative';
  try {
    host = new URL(r.absolute).host;
  } catch {}
  byHost[host] = byHost[host] || { ok: 0, broken: 0 };
  if (r.status >= 200 && r.status < 400) byHost[host].ok++;
  else byHost[host].broken++;
}
console.log('\n=== BY HOST ===');
for (const [host, counts] of Object.entries(byHost).sort()) {
  console.log(`  ${host.padEnd(40)} ok=${counts.ok} broken=${counts.broken}`);
}
