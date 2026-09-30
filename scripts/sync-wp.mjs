#!/usr/bin/env node
/**
 * sync-wp.mjs — pull the whole content model out of the legacy WordPress install
 * and materialise it as build-time content for Astro.
 *
 * Design notes
 * ------------
 *  - READ ONLY. This script never writes to WordPress.
 *  - WordPress stays the CMS. Astro reads it at build time (SSG).
 *  - Landing pages are ported verbatim (they were hand authored HTML) but their
 *    Contact Form 7 markup is replaced with `<!--LEAD_FORM:source-->` markers so
 *    Astro can render a single, unified lead form component.
 *  - Elementor-only pages are NOT pulled; they are re-authored as .astro pages
 *    (see docs/MIGRATION.md). They are listed in ELEMENTOR_PAGES below.
 *
 * Usage: node scripts/sync-wp.mjs [--no-seo]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WP = 'https://sunshine-lotionpump.com';
const API = `${WP}/wp-json/wp/v2`;
const SKIP_SEO = process.argv.includes('--no-seo');

const OUT = {
  posts: path.join(ROOT, 'src/content/posts'),
  products: path.join(ROOT, 'src/content/products'),
  landing: path.join(ROOT, 'src/content/landing'),
  pages: path.join(ROOT, 'src/content/pages'),
  data: path.join(ROOT, 'src/data'),
};

/** Pages that are rebuilt by hand in Astro — excluded from the generic page pipeline. */
const ELEMENTOR_PAGES = new Set([
  'home',
  'about-us',
  'contact-us',
  'lotion-pump-manufacturer',
]);

/** Landing pages: hand-authored HTML in WordPress, ported verbatim. */
const LANDING_TEMPLATE_SLUGS = new Set([
  'lotion-pump-manufacturer-landingpage',
  'lotion-pump-manufacturer-landingpage-v2',
  'lotion-pump-head-manufacturer-landingpage',
  'cream-pump-manufacturer-landingpage',
  'foam-pump-manufacturer-landingpage',
  'trigger-sprayer-manufacturer-landingpage',
  'fine-mist-sprayer-manufacturer-landingpage',
  'treatment-pump-manufacturer-landingpage',
  'disc-top-cap-manufacturer-landingpage',
  'nail-polish-pump-manufacturer-landingpage',
  'spray-pump-manufacturer-landingpage',
  'airless-pump-manufacturer-landingpage',
  'oem-private-label-pump-manufacturer-landingpage',
]);

/** Long-form SEO articles authored as plain HTML in WordPress (rendered with site chrome). */
const ARTICLE_PAGE_SLUGS = new Set(['pump-manufacturer-china']);

/** Legacy pages that must never be indexed again. */
const NOINDEX_SLUGS = new Set(['thank-you']);

/** Pages that only need an inline notice rendered (no <seo> overrides). */
const report = { fetched: {}, skipped: [], issues: [], redirects: [] };

// --------------------------------------------------------------------------- utils

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return await res.json();
    } catch (err) {
      if (i === tries - 1) throw err;
      await sleep(600 * (i + 1));
    }
  }
}

async function getText(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { accept: 'text/html' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (i === tries - 1) throw err;
      await sleep(600 * (i + 1));
    }
  }
}

async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return out;
}

const decodeEntities = (s = '') =>
  String(s)
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8220;/g, '\u201c')
    .replace(/&#8221;/g, '\u201d')
    .replace(/&#8230;/g, '…')
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));

/** WordPress stores "rendered" fields with HTML entities — undo that. */
const unRendered = (obj) => decodeEntities(obj?.rendered ?? '').trim();

/** Make every internal absolute URL root-relative so staging builds behave. */
function relativise(html) {
  return html
    .replace(/https?:\/\/(?:www\.)?sunshine-lotionpump\.com/gi, '')
    .replace(/https?:\/\/spraypump\.supcous\.com/gi, '');
}

/** Drop WordPress block comments / editor leftovers. */
function stripWpNoise(html) {
  return html
    .replace(/<!--\s*\/?wp:[\s\S]*?-->/g, '')
    .replace(/<p>\s*(?:&nbsp;|\s)*<\/p>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** HTML comes from markdown files; collapse indentation so markdown keeps it raw. */
function collapseForMarkdown(html) {
  return html.replace(/\s*\n\s*/g, ' ').replace(/>\s+</g, '><').trim();
}

const yamlScalar = (v) => {
  if (v === null || v === undefined) return '""';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `[${v.map(yamlScalar).join(', ')}]`;
  return JSON.stringify(String(v));
};

function frontmatter(obj) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    lines.push(`${k}: ${yamlScalar(v)}`);
  }
  lines.push('---');
  return lines.join('\n');
}

const slugToPath = (slug) => `/${slug}/`;

// --------------------------------------------------------------- CF7 form stripper

/** Contact Form 7 runtime metadata captured while stripping the LP markup. */
const cf7Meta = [];

/**
 * Remove rendered Contact Form 7 markup from a ported landing page and leave a
 * `<!--LEAD_FORM:source-->` marker. Returns { html, sources }.
 */
function stripCf7(html) {
  const sources = [];
  let out = '';
  let i = 0;
  const OPEN = /<div class="wpcf7\b/g;

  while (true) {
    OPEN.lastIndex = i;
    const m = OPEN.exec(html);
    if (!m) {
      out += html.slice(i);
      break;
    }
    const start = m.index;
    // walk forward with a div-depth counter
    let depth = 0;
    let j = start;
    const tagRe = /<div\b|<\/div>/g;
    tagRe.lastIndex = start;
    let t;
    while ((t = tagRe.exec(html))) {
      if (t[0] === '</div>') depth--;
      else depth++;
      if (depth === 0) {
        j = tagRe.lastIndex;
        break;
      }
    }
    if (j <= start) {
      // malformed — bail out of this block only
      out += html.slice(i, start + m[0].length);
      i = start + m[0].length;
      continue;
    }

    const block = html.slice(start, j);
    const before = html.slice(Math.max(0, start - 400), start);
    const source =
      (before.match(/data-lp-source="([^"]+)"/) || [])[1] ||
      (block.match(/name="lp-source"[^>]*value="([^"]*)"/) || [])[1] ||
      (block.match(/value="([^"]*)"[^>]*name="lp-source"/) || [])[1] ||
      (before.match(/id="([a-z0-9\-]*quote[a-z0-9\-]*)"/i) || [])[1] ||
      'landing';

    sources.push(source);
    out += html.slice(i, start) + `<!--LEAD_FORM:${source}-->`;
    i = j;

    // Capture the Contact Form 7 runtime contract so the Astro edge function
    // can talk to the WP endpoint without a hardcoded plugin version.
    const version = (block.match(/name="_wpcf7_version"[^>]*value="([^"]*)"/) || [])[1];
    const locale = (block.match(/name="_wpcf7_locale"[^>]*value="([^"]*)"/) || [])[1];
    const formId = (block.match(/name="_wpcf7"[^>]*value="([^"]*)"/) || [])[1];
    if (version || locale || formId) {
      cf7Meta.push({ formId, version, locale });
    }
  }

  return { html: out, sources };
}

// ----------------------------------------------------------------------- SEO fetch

function parseSeo(html) {
  const pick = (re) => {
    const m = html.match(re);
    return m ? decodeEntities(m[1]).trim() : undefined;
  };
  return {
    title: pick(/<title[^>]*>([\s\S]*?)<\/title>/i),
    description: pick(/<meta\s+name="description"\s+content="([^"]*)"/i),
    canonical: pick(/<link\s+rel="canonical"\s+href="([^"]*)"/i),
    robots: pick(/<meta\s+name="robots"\s+content="([^"]*)"/i),
    ogTitle: pick(/<meta\s+property="og:title"\s+content="([^"]*)"/i),
    ogDescription: pick(/<meta\s+property="og:description"\s+content="([^"]*)"/i),
    ogImage: pick(/<meta\s+property="og:image"\s+content="([^"]*)"/i),
    ogType: pick(/<meta\s+property="og:type"\s+content="([^"]*)"/i),
  };
}

// ---------------------------------------------------------------------------- main

async function main() {
  for (const dir of Object.values(OUT)) fs.mkdirSync(dir, { recursive: true });

  console.log('→ fetching taxonomies, media, content …');

  const [productCats, postCats, pages, posts, products, mediaPages] = await Promise.all([
    getJson(`${API}/product-category?per_page=100&_fields=id,name,slug,count,description,link`),
    getJson(`${API}/categories?per_page=100&_fields=id,name,slug,count,description,link,parent`),
    getJson(`${API}/pages?per_page=100&_fields=id,slug,title,content,excerpt,link,modified,parent,menu_order,template`),
    getJson(`${API}/posts?per_page=100&_fields=id,slug,title,content,excerpt,link,date,modified,categories,tags`),
    getJson(
      `${API}/product?per_page=100&_fields=id,slug,title,content,excerpt,link,modified,featured_media,menu_order,acf,product-category`,
    ),
    getJson(`${API}/media?per_page=100&_fields=id,source_url,alt_text,media_details&page=1`),
  ]);

  report.fetched = {
    pages: pages.length,
    posts: posts.length,
    products: products.length,
    productCategories: productCats.length,
    postCategories: postCats.length,
  };

  // ---- media (354 items → paginate)
  const media = [...mediaPages];
  for (let p = 2; p <= 4; p++) {
    try {
      const more = await getJson(
        `${API}/media?per_page=100&_fields=id,source_url,alt_text,media_details&page=${p}`,
      );
      if (!more.length) break;
      media.push(...more);
    } catch {
      break;
    }
  }
  const mediaMap = {};
  for (const m of media) {
    mediaMap[m.id] = {
      url: m.source_url,
      alt: decodeEntities(m.alt_text || ''),
      width: m.media_details?.width,
      height: m.media_details?.height,
    };
  }
  fs.writeFileSync(
    path.join(OUT.data, 'media.json'),
    JSON.stringify(mediaMap, null, 2),
    'utf8',
  );
  report.fetched.media = media.length;

  // ---- taxonomies
  fs.writeFileSync(
    path.join(OUT.data, 'product-categories.json'),
    JSON.stringify(
      productCats.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: decodeEntities(c.name),
        count: c.count,
        description: stripWpNoise(decodeEntities(c.description || '')),
      })),
      null,
      2,
    ),
    'utf8',
  );

  const postCatsClean = postCats.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: decodeEntities(c.name),
    count: c.count,
    parent: c.parent,
    description: stripWpNoise(decodeEntities(c.description || '')),
  }));
  fs.writeFileSync(
    path.join(OUT.data, 'post-categories.json'),
    JSON.stringify(postCatsClean, null, 2),
    'utf8',
  );
  const postCatById = new Map(postCatsClean.map((c) => [c.id, c]));

  // ---- posts
  const postIndex = [];
  for (const p of posts) {
    const cats = (p.categories || []).map((id) => postCatById.get(id)).filter(Boolean);
    const html = relativise(stripWpNoise(unRendered(p.content)));
    const internalScripts = (html.match(/<script/gi) || []).length;
    if (internalScripts) report.issues.push(`post ${p.slug}: ${internalScripts} inline <script>`);

    const fm = {
      id: p.id,
      slug: p.slug,
      title: decodeEntities(unRendered(p.title)),
      excerpt: stripWpNoise(decodeEntities(unRendered(p.excerpt))),
      date: p.date,
      modified: p.modified,
      categories: cats.map((c) => c.slug),
      categoryNames: cats.map((c) => c.name),
      heroImage:
        (html.match(/<img[^>]+src="([^"]+)"/i) || [])[1] || null,
    };
    fs.writeFileSync(
      path.join(OUT.posts, `${p.slug}.md`),
      `${frontmatter(fm)}\n\n${collapseForMarkdown(html)}\n`,
      'utf8',
    );
    postIndex.push({
      type: 'post',
      slug: p.slug,
      path: slugToPath(p.slug),
      title: fm.title,
      date: p.date,
      categories: fm.categories,
    });
  }

  // ---- products
  const productIndex = [];
  for (const p of products) {
    const acf = p.acf || {};
    const imgs = [
      acf.product_img_1,
      acf.product_img_2,
      acf.product_img_3,
      acf.product_img_4,
      acf.product_img_5,
    ]
      .map((id) => (id ? mediaMap[id] : null))
      .filter(Boolean);
    const catIds = (p['product-category'] || []).map(Number);
    const cats = productCats.filter((c) => catIds.includes(c.id));

    const fm = {
      id: p.id,
      slug: p.slug,
      title: decodeEntities(unRendered(p.title)),
      excerpt: stripWpNoise(decodeEntities(unRendered(p.excerpt))),
      modified: p.modified,
      categories: cats.map((c) => c.slug),
      categoryNames: cats.map((c) => decodeEntities(c.name)),
      image: imgs[0]?.url || null,
      imageAlt: imgs[0]?.alt || decodeEntities(unRendered(p.title)),
      gallery: imgs.slice(1).map((i) => i.url),
      video: acf.product_video || '',
      origin: acf.place_of_origin || '',
      brand: acf.brand_name || '',
      customOrder: acf.custom_order || '',
      oemOdm: acf.oemodm || '',
      modelNumber: acf.model_number || '',
      moq: acf.minimum_order_quantity || '',
      price: acf.price || '',
      packaging: acf.packaging_details || '',
      deliveryTime: acf.delivery_time || '',
      sample: acf.sample || '',
      paymentTerms: acf.payment_terms || '',
      supplyAbility: acf.supply_ability || '',
      material: acf.material || '',
      plasticType: acf.plastic_type || '',
      types: acf.types || '',
      usage: acf.usage || '',
      use: Array.isArray(acf.use) ? acf.use : [],
      characteristic: acf.characteristic || '',
      size: Array.isArray(acf.size) ? acf.size : [],
      closure: Array.isArray(acf.closure) ? acf.closure : [],
      color: acf.color || '',
      tubeLength: acf.tube_length || '',
      packing: acf.packing || '',
      leadTime: acf.lead_time || '',
    };

    const body = collapseForMarkdown(relativise(stripWpNoise(unRendered(p.content))));
    fs.writeFileSync(
      path.join(OUT.products, `${p.slug}.md`),
      `${frontmatter(fm)}\n\n${body}\n`,
      'utf8',
    );
    productIndex.push({
      type: 'product',
      slug: p.slug,
      path: `/product/${p.slug}/`,
      title: fm.title,
      categories: fm.categories,
      image: fm.image,
    });
  }

  // ---- pages: landing (verbatim) vs simple (raw html) vs elementor (skipped)
  const pageIndex = [];
  for (const p of pages) {
    if (ELEMENTOR_PAGES.has(p.slug)) {
      report.skipped.push({ slug: p.slug, reason: 'elementor — re-authored in Astro' });
      continue;
    }
    let html = stripWpNoise(unRendered(p.content));

    if (LANDING_TEMPLATE_SLUGS.has(p.slug)) {
      const { html: stripped, sources } = stripCf7(html);
      fs.writeFileSync(
        path.join(OUT.landing, `${p.slug}.html`),
        `${stripped.trim()}\n`,
        'utf8',
      );
      pageIndex.push({
        type: 'landing',
        slug: p.slug,
        path: slugToPath(p.slug),
        title: decodeEntities(unRendered(p.title)),
        leadForms: sources,
      });
      continue;
    }

    // simple content page → raw html file consumed by [slug].astro
    const hasForm = /<form|<input|<select/i.test(html);
    if (hasForm && p.slug !== 'thank-you') {
      const { html: stripped } = stripCf7(html);
      html = stripped;
      report.issues.push(`page ${p.slug}: raw form markup replaced with unified lead form`);
    }
    fs.writeFileSync(path.join(OUT.pages, `${p.slug}.html`), `${relativise(html).trim()}\n`, 'utf8');
    pageIndex.push({
      type: 'page',
      slug: p.slug,
      path: slugToPath(p.slug),
      title: decodeEntities(unRendered(p.title)),
      noindex: NOINDEX_SLUGS.has(p.slug),
      layout: ARTICLE_PAGE_SLUGS.has(p.slug) ? 'article' : 'simple',
    });
  }

  // ---- redirects (legacy duplicates + non-indexed artefacts)
  const redirects = [
    {
      from: '/lotion-pump-manufacturer-landingpage/',
      to: '/lotion-pump-manufacturer-landingpage-v2/',
      reason: 'duplicate v1 landing page — canonical v2 kept (v1 was already out of the sitemap)',
    },
    {
      from: '/elementor-1657/',
      to: '/',
      reason: 'Elementor draft artefact, already de-indexed',
    },
  ];
  fs.writeFileSync(
    path.join(OUT.data, 'redirects.json'),
    JSON.stringify(redirects, null, 2),
    'utf8',
  );

  // ---- Contact Form 7 runtime contract (used by /api/lead)
  const cf7Unique = [];
  for (const meta of cf7Meta) {
    if (!cf7Unique.some((m) => m.formId === meta.formId)) cf7Unique.push(meta);
  }
  fs.writeFileSync(
    path.join(OUT.data, 'cf7.json'),
    JSON.stringify(cf7Unique, null, 2),
    'utf8',
  );
  report.fetched.cf7 = cf7Unique;

  // ---- registry consumed by src/pages/[slug].astro
  const registry = [...pageIndex, ...postIndex];
  fs.writeFileSync(
    path.join(OUT.data, 'registry.json'),
    JSON.stringify(registry, null, 2),
    'utf8',
  );
  report.fetched.registry = registry.length;

  // ---- SEO parity snapshot from the live site
  if (!SKIP_SEO) {
    console.log('→ snapshotting live <head> for SEO parity …');
    // Pages re-authored in Astro (not in the registry) plus the archives that
    // have no registry entry of their own still need their live metadata.
    const extraPaths = [
      '/',
      '/products/',
      '/category/blog/',
      '/about-us/',
      '/contact-us/',
      '/lotion-pump-manufacturer/',
    ];
    const urls = [
      ...extraPaths,
      ...registry.map((r) => r.path),
      ...productIndex.map((p) => p.path),
      ...productCats.filter((c) => c.count > 0).map((c) => `/product-category/${c.slug}/`),
      ...postCatsClean.filter((c) => c.count > 0).map((c) => `/category/blog/${c.slug}/`),
    ];
    const seo = {};
    await pool(
      urls,
      6,
      async (u) => {
        try {
          const html = await getText(WP + u);
          seo[u] = parseSeo(html);
        } catch (err) {
          seo[u] = { error: String(err.message || err) };
          report.issues.push(`seo fetch failed for ${u}`);
        }
        return u;
      },
    );
    fs.writeFileSync(path.join(OUT.data, 'seo.json'), JSON.stringify(seo, null, 2), 'utf8');
    report.fetched.seo = Object.keys(seo).length;
  }

  fs.writeFileSync(
    path.join(OUT.data, 'sync-report.json'),
    JSON.stringify(report, null, 2),
    'utf8',
  );

  console.log('✓ sync complete');
  console.log(JSON.stringify(report.fetched, null, 2));
  if (report.issues.length) {
    console.log(`! ${report.issues.length} issue(s) — see src/data/sync-report.json`);
  }
}

main().catch((err) => {
  console.error('sync failed:', err);
  process.exit(1);
});
