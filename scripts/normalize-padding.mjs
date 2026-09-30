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
    if (entry.name.endsWith('.astro')) files.push(full);
  }
})(path.join(ROOT, 'src/pages'));

// Normalise section-level vertical padding to the DESIGN.md scale
// (96px desktop / 56px mobile). Single pass, only on <section> opening tags.
const SECTION_RE = /<section\b[^>]*>/g;

let changed = 0;
for (const file of files) {
  let s = fs.readFileSync(file, 'utf8');
  const before = s;
  s = s.replace(SECTION_RE, (tag) =>
    tag
      .replace(/\bpy-(8|10|12|14|16)\b/g, 'py-14 md:py-24')
      .replace(/\bpb-14\b/g, 'pb-14 md:pb-24'),
  );
  if (s !== before) {
    fs.writeFileSync(file, s, 'utf8');
    changed++;
    console.log('updated', path.relative(ROOT, file));
  }
}
console.log(`\nfiles changed: ${changed}`);
