import fs from 'node:fs';
const targets = [
  ['dist/client/index.html', 'HOME'],
  ['dist/client/foam-pump-vs-lotion-pump/index.html', 'POST'],
  ['dist/client/foam-pump-manufacturer-landingpage/index.html', 'LP'],
  ['dist/client/pump-manufacturer-china/index.html', 'ARTICLE PAGE'],
  ['dist/client/lotion-pump-manufacturer/index.html', 'PILLAR'],
];
for (const [file, label] of targets) {
  const h = fs.readFileSync(file, 'utf8');
  const imgTags = [...h.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const imgSrc = imgTags.map((t) => (t.match(/\bsrc=["']([^"']+)["']/i) || [])[1]).filter(Boolean);
  const absImg = imgSrc.filter((u) => u.startsWith('http'));
  const relImg = imgSrc.filter((u) => u.startsWith('/'));
  const links = [...h.matchAll(/<a\b[^>]*?\bhref=["']([^"']+)["']/gi)].map((m) => m[1]);
  const absLink = links.filter((u) => u.startsWith('http'));
  const relLink = links.filter((u) => u.startsWith('/'));
  console.log('=== ' + label + ' ===');
  console.log('  img src : total=' + imgSrc.length + '  absolute=' + absImg.length + '  relative=' + relImg.length);
  console.log('  a href  : total=' + links.length + '  absolute=' + absLink.length + '  relative=' + relLink.length);
  if (relImg.length) console.log('  REL IMG: ' + relImg.slice(0, 3).join(' | '));
  if (absLink.length) console.log('  ABS LINK: ' + absLink.slice(0, 3).join(' | '));
}
