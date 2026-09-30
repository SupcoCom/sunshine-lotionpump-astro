import fs from 'node:fs';
const T = process.env.TEMP + '/opencode/';
const ls = (f) => [...(fs.readFileSync(T + f, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g) || [])].map((m) => m[1]);
const live = new Set([
  ...ls('sm-page.xml'),
  ...ls('sm-post.xml'),
  ...ls('sm-product.xml'),
  ...ls('sm-pcat.xml'),
  ...ls('category-sitemap.xml'),
]);
const mine = new Set(
  [...fs.readFileSync('dist/client/sitemap-0.xml', 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]),
);
const onlyLive = [...live].filter((u) => !mine.has(u));
const onlyMine = [...mine].filter((u) => !live.has(u));
console.log('live sitemap URL count :', live.size);
console.log('built sitemap URL count:', mine.size);
console.log('\n--- MISSING from rebuild (must be 0) ---');
onlyLive.forEach((u) => console.log('  ', u));
console.log('\n--- EXTRA in rebuild ---');
onlyMine.forEach((u) => console.log('  ', u));
