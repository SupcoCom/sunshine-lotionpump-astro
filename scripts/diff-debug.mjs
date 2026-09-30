import fs from 'node:fs';
const LIVE = 'https://sunshine-lotionpump.com';
const targets = ['/', '/products/', '/category/blog/', '/lotion-pump-manufacturer/', '/thank-you/'];
const decode = (v = '') =>
  v.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#039;|&#8217;/g, "'").replace(/&#8211;|&#8212;/g, '–')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d))).trim();
for (const url of targets) {
  const liveHtml = await (await fetch(LIVE + url)).text();
  const file = 'dist/client' + url.replace(/\/$/, '') + '/index.html';
  const builtHtml = fs.readFileSync(file, 'utf8');
  const pick = (h, re) => decode((h.match(re) || [])[1]);
  for (const [name, re] of [
    ['title', /<title>([^<]*)</i],
    ['robots', /<meta name="robots" content="([^"]*)"/i],
    ['desc', /<meta name="description" content="([^"]*)"/i],
  ]) {
    const l = pick(liveHtml, re);
    const b = pick(builtHtml, re);
    if (l !== b) {
      console.log(`${url} ${name}`);
      console.log('  live :', JSON.stringify(l));
      console.log('  built:', JSON.stringify(b));
    }
  }
}
