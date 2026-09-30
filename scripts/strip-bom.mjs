import fs from 'node:fs';
import path from 'node:path';

const roots = ['src', 'scripts', 'public', '.'];
const exts = new Set(['.astro', '.ts', '.mjs', '.js', '.json', '.css', '.html', '.txt', '.md', '.yml', '.yaml']);
const skipDirs = new Set(['node_modules', 'dist', '.astro', '.git']);

let fixed = 0;
let scanned = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;
      walk(path.join(dir, entry.name));
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!exts.has(ext) && entry.name !== '_headers' && entry.name !== '_redirects') continue;
    const file = path.join(dir, entry.name);
    const buf = fs.readFileSync(file);
    scanned++;
    if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
      fs.writeFileSync(file, buf.subarray(3));
      console.log('BOM stripped:', file);
      fixed++;
    }
  }
}

for (const root of roots) {
  if (fs.existsSync(root)) walk(root);
}
console.log(`scanned ${scanned} files, stripped ${fixed} BOM(s)`);
