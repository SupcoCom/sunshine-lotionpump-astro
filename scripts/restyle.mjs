import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.astro', '.git', 'skills'].includes(entry.name)) continue;
      walk(full);
      continue;
    }
    if (/\.(astro|ts|css|tsx)$/.test(entry.name)) files.push(full);
  }
})(path.join(ROOT, 'src'));

// order matters: longest / most specific first
const MAP = [
  ['brand-700', 'brand-strong'],
  ['brand-600', 'brand'],
  ['brand-50', 'brand-soft'],
  ['accent-600', 'accent-strong'],
  ['accent-500', 'accent'],
  ['accent-400', 'accent-bright'],
];

let changed = 0;
for (const file of files) {
  let s = fs.readFileSync(file, 'utf8');
  const before = s;
  for (const [from, to] of MAP) s = s.split(from).join(to);
  if (s !== before) {
    fs.writeFileSync(file, s, 'utf8');
    changed++;
    console.log('updated', path.relative(ROOT, file));
  }
}
console.log(`\nfiles changed: ${changed}`);
