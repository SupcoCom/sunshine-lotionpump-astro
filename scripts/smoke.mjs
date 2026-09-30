import fs from 'node:fs';
const root = 'dist/client/';
function check(p, label) {
  const h = fs.readFileSync(root + p, 'utf8');
  const pick = (re) => (h.match(re) || [])[1];
  console.log('=== ' + label + ' (' + h.length + ' bytes) ===');
  console.log('  title :', pick(/<title>([^<]*)</));
  console.log('  desc  :', (pick(/<meta name="description" content="([^"]*)"/) || '').slice(0, 120));
  console.log('  canon :', pick(/<link rel="canonical" href="([^"]*)"/));
  console.log('  robots:', pick(/<meta name="robots" content="([^"]*)"/));
  console.log('  scripts(inline):', (h.match(/<script(?![^>]*src)/gi) || []).length,
    '| ld+json:', (h.match(/application\/ld\+json/g) || []).length,
    '| styles:', (h.match(/<link rel="stylesheet"/gi) || []).length);
  console.log('  h1    :', (pick(/<h1[^>]*>([\s\S]{0,90}?)<\/h1>/i) || '').replace(/<[^>]+>/g, '').trim());
  console.log('  imgs  :', (h.match(/<img/gi) || []).length, '| lazy:', (h.match(/loading="lazy"/g) || []).length);
  console.log('  leadforms:', (h.match(/data-lead-form/g) || []).length, '| lp-form-field:', (h.match(/lp-form-field/g) || []).length);
}
const targets = [
  ['index.html', 'HOME'],
  ['foam-pump-manufacturer-landingpage/index.html', 'LP foam-pump'],
  ['lotion-pump-manufacturer-landingpage-v2/index.html', 'LP v2'],
  ['pump-manufacturer-china/index.html', 'ARTICLE PAGE'],
  ['foam-pump-vs-lotion-pump/index.html', 'POST'],
  ['product/wholesale-foam-pump-28-custom-plastic-packaging-for-hand-wash-shampoo-sunshine/index.html', 'PRODUCT'],
  ['product-category/lotion-pump/index.html', 'PCAT'],
  ['category/blog/product-guides/index.html', 'CATEGORY'],
  ['lotion-pump-manufacturer/index.html', 'PILLAR'],
  ['about-us/index.html', 'ABOUT'],
  ['contact-us/index.html', 'CONTACT'],
  ['thank-you/index.html', 'THANK-YOU'],
  ['privacy-policy/index.html', 'PRIVACY'],
];
for (const [p, l] of targets) check(p, l);
