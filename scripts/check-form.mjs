import fs from 'node:fs';
const h = fs.readFileSync('dist/client/index.html', 'utf8');
const i = h.indexOf('data-lead-form');
const seg = h.slice(i - 40, i + 2800);
const fields = [...seg.matchAll(/name="(your-name|your-email|phone|your-message)"[^>]*>/g)].map((m) =>
  m[0].replace(/\s+/g, ' '),
);
console.log('FORM FIELDS:');
fields.forEach((f) => console.log('  ' + f));
const labels = [...seg.matchAll(/>([^<]*(?:\*|\(optional\))[^<]*)</g)].map((m) => m[1].trim());
console.log('\nLABELS: ' + labels.join(' | '));
