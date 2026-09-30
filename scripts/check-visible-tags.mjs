import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CLIENT = path.join(ROOT, 'dist/client');

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
})(CLIENT);

const decode = (s = '') =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#8217;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));

let total = 0;
for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  // drop script/style/noscript blocks — their content is not visible text
  html = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  // strip tags -> visible text
  const text = decode(html.replace(/<[^>]+>/g, ' '));
  const hits = [];
  for (const m of text.matchAll(/<\s*\/?\s*[a-zA-Z][a-zA-Z0-9-]*(?:\s[^<>]{0,80})?>/g)) {
    hits.push(m[0].replace(/\s+/g, ' ').trim());
  }
  if (hits.length) {
    total += hits.length;
    const page = path.relative(CLIENT, file).replace(/\\/g, '/');
    const uniq = [...new Set(hits)];
    console.log(`\n### ${page}  (${hits.length} hits)`);
    uniq.slice(0, 12).forEach((h) => console.log('    ' + h));
  }
}
console.log(`\n=== total visible tag-like text: ${total} ===`);
