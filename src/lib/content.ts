/**
 * Build-time content accessors.
 *
 * Everything here comes from `src/data/*.json` + `src/content/**`, produced by
 * `npm run sync` (WordPress REST → static files). Rendering never calls WordPress.
 *
 * JSON is imported statically and HTML via `import.meta.glob` so that route
 * modules resolve correctly no matter where the bundler relocates them
 * (a `node:fs` + `process.cwd()` read does not survive the server build).
 */
import { SITE } from '@/config/site';
import registryJson from '@/data/registry.json';
import seoJson from '@/data/seo.json';
import productCategoriesJson from '@/data/product-categories.json';
import postCategoriesJson from '@/data/post-categories.json';
import redirectsJson from '@/data/redirects.json';

export type RouteType = 'page' | 'post' | 'landing';

export interface RouteEntry {
  type: RouteType;
  slug: string;
  path: string;
  title: string;
  layout?: 'simple' | 'article';
  date?: string;
  categories?: string[];
  categoryNames?: string[];
  leadForms?: string[];
  noindex?: boolean;
}

export interface SeoEntry {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  error?: string;
}

export interface ProductCategory {
  id: number;
  slug: string;
  name: string;
  count: number;
  description: string;
}

export interface PostCategory {
  id: number;
  slug: string;
  name: string;
  count: number;
  parent: number;
  description: string;
}

export interface Redirect {
  from: string;
  to: string;
  reason: string;
}

export const registry = registryJson as RouteEntry[];
export const seoSnapshot = seoJson as Record<string, SeoEntry>;
export const productCategories = productCategoriesJson as ProductCategory[];
export const postCategories = postCategoriesJson as PostCategory[];
export const redirects = redirectsJson as Redirect[];

/** Raw HTML authored in WordPress and ported verbatim. */
const portableHtml = import.meta.glob('../content/{landing,pages}/*.html', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function keyFor(kind: 'landing' | 'pages', slug: string): string {
  return `../content/${kind}/${slug}.html`;
}

export function readPortableHtml(kind: 'landing' | 'pages', slug: string): string {
  return portableHtml[keyFor(kind, slug)] ?? '';
}

export const LEAD_MARKER = /<!--LEAD_FORM:([a-z0-9\-]+)-->/g;

export interface HtmlChunk {
  kind: 'html' | 'lead';
  html?: string;
  source?: string;
}

/** Split ported landing HTML into raw chunks interleaved with lead-form slots. */
export function splitLeadMarkers(html: string): HtmlChunk[] {
  const chunks: HtmlChunk[] = [];
  let last = 0;
  for (const match of html.matchAll(LEAD_MARKER)) {
    const idx = match.index ?? 0;
    if (idx > last) chunks.push({ kind: 'html', html: html.slice(last, idx) });
    chunks.push({ kind: 'lead', source: match[1] });
    last = idx + match[0].length;
  }
  if (last < html.length) chunks.push({ kind: 'html', html: html.slice(last) });
  return chunks.filter((c) => c.kind === 'lead' || (c.html ?? '').trim().length > 0);
}

/**
 * Manual SEO corrections.
 *
 * Everything else is a 1:1 copy of the metadata WordPress/Rank Math was serving,
 * so rankings do not move. These entries fix values that were objectively broken
 * on the legacy site (e.g. the privacy policy description was the literal string
 * "Last updated: August 19, 2026").
 */
const SEO_OVERRIDES: Record<string, Partial<SeoEntry>> = {
  '/privacy-policy/': {
    description:
      'How SUNSHINE Plastic collects, uses and protects the information you share when requesting a quotation for cosmetic pumps, sprayers and dispensers.',
  },
  '/products/': {
    title: 'Cosmetic Pump Products | Lotion, Foam, Mist & Trigger Pumps',
    description:
      'Browse cosmetic dispensing pumps and closures — lotion pumps, foam pumps, fine mist sprayers, trigger sprayers, disc caps and treatment pumps. MOQ 10,000 pcs, factory direct.',
    robots: 'index, follow',
  },
};

/** SEO metadata for a path, as it was live on WordPress (plus manual corrections). */
export function seoFor(routePath: string): SeoEntry {
  const base = seoSnapshot[routePath] ?? {};
  return { ...base, ...(SEO_OVERRIDES[routePath] ?? {}) };
}

/** WordPress page/post titles often carry a redundant brand suffix. */
export function stripBrand(title: string): string {
  return title
    .replace(/\s*[|\-–—]\s*SUNSHINE\s*(China|B2B Plastic Packaging)?\s*$/i, '')
    .replace(/\s*\|\s*SUNSHINE\s*$/i, '')
    .trim();
}

export function absolute(pathname: string): string {
  return new URL(pathname, SITE.url).toString();
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Legacy `robots` meta string → boolean pair. */
export function robotsFlags(robots?: string): { index: boolean; follow: boolean } {
  const value = (robots ?? '').toLowerCase();
  return {
    index: !value.includes('noindex'),
    follow: !value.includes('nofollow'),
  };
}

export const PRODUCT_SPEC_FIELDS: Array<[string, string]> = [
  ['material', 'Material'],
  ['plasticType', 'Plastic Type'],
  ['size', 'Size'],
  ['closure', 'Closure'],
  ['color', 'Color'],
  ['characteristic', 'Characteristic'],
  ['tubeLength', 'Tube Length'],
  ['types', 'Types'],
  ['usage', 'Usage'],
  ['moq', 'MOQ'],
  ['leadTime', 'Lead Time'],
  ['sample', 'Sample'],
  ['packaging', 'Packaging'],
  ['packing', 'Packing'],
  ['paymentTerms', 'Payment Terms'],
  ['supplyAbility', 'Supply Ability'],
  ['deliveryTime', 'Delivery Time'],
  ['oemOdm', 'OEM/ODM'],
  ['customOrder', 'Custom Order'],
  ['price', 'Price'],
  ['modelNumber', 'Model Number'],
  ['origin', 'Place of Origin'],
  ['brand', 'Brand'],
];

export function specRows(product: Record<string, unknown>): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  for (const [key, label] of PRODUCT_SPEC_FIELDS) {
    const raw = product[key];
    const value = Array.isArray(raw) ? raw.join(', ') : typeof raw === 'string' ? raw : '';
    if (value && value.trim()) rows.push([label, value.trim()]);
  }
  if (Array.isArray(product.use) && product.use.length) {
    rows.push(['Applications', (product.use as string[]).join(', ')]);
  }
  return rows;
}
