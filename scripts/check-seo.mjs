import fs from 'node:fs';
const seo = JSON.parse(fs.readFileSync('src/data/seo.json', 'utf8'));
const rows = Object.entries(seo);
console.log('total', rows.length);
console.log('--- missing description ---');
rows.filter(([, v]) => !v.description).forEach(([k]) => console.log(' ', k));
console.log('--- short (<70) or suspicious descriptions ---');
rows
  .filter(([, v]) => v.description && v.description.length < 70)
  .forEach(([k, v]) => console.log(' ', k, '=>', JSON.stringify(v.description)));
console.log('--- missing title ---');
rows.filter(([, v]) => !v.title).forEach(([k]) => console.log(' ', k));
console.log('--- noindex pages ---');
rows.filter(([, v]) => (v.robots || '').includes('noindex')).forEach(([k, v]) => console.log(' ', k, '=>', v.robots));
console.log('--- errors ---');
rows.filter(([, v]) => v.error).forEach(([k, v]) => console.log(' ', k, v.error));
