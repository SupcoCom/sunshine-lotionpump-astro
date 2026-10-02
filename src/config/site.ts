/**
 * Single source of truth for brand / NAP / nav / tracking.
 *
 * NOTE ON DATA QUALITY (see docs/CONTENT-AUDIT.md):
 * The legacy WordPress site contradicts itself about the company identity
 * (names, city, founding year, tenure). Values below are the *majority* variant
 * used across the live site. Every conflicting value found on the old site is
 * recorded in `DATA_CONFLICTS` so the owner can confirm a single truth.
 * Nothing here has been invented — every value exists verbatim on the old site.
 */

export const SITE = {
  url: 'https://sunshine-lotionpump.com',
  name: 'SUNSHINE',
  legalName: 'Ningbo Sunshine Plastic Industry Co., Ltd.',
  brand: 'SUNSHINE',
  tagline: 'Custom Cosmetic Pump Manufacturer',
  shortDescription:
    'B2B manufacturer of cosmetic dispensing pumps — lotion pumps, fine mist sprayers, foam pumps and trigger sprayers.',
  locale: 'en_US',
  lang: 'en',
  established: '2018',
  logo: 'https://admin.sunshine-lotionpump.com/wp-content/uploads/sites/2/2026/04/SunShine-Logo.png',
  favicon: 'https://admin.sunshine-lotionpump.com/wp-content/uploads/sites/2/2026/04/favicon.ico',
  cdnHost: 'img.supcous.com',
} as const;

export const CONTACT = {
  email: 'info@sunshine-lotionpump.com',
  phoneDisplay: '+86-158-8850-3691',
  phoneHref: 'tel:+8615888503691',
  phoneAlt: '+86 15757418802',
  whatsappDisplay: '+86-158-8850-3691',
  whatsappHref: 'https://wa.me/8615888503691',
  // TODO(owner 2026-10-01): city confirmed as Yuyao by the owner, but the street
  // line below is the legacy Cixi/Zhouxiang one inherited from the old site
  // (Zhouxiang is a town in Cixi). Needs the real Yuyao street address.
  addressLines: [
    '1109 Huancheng South Road, Zhouxiang Town',
    'Yuyao City, Ningbo City, Zhejiang Province, China',
  ],
  addressOneLine:
    '1109 Huancheng South Road, Zhouxiang Town, Yuyao City, Ningbo City, Zhejiang Province, China',
  hours: 'Mon – Fri: 08:30 – 18:00 CST · Sat: 09:00 – 13:00 CST',
  responseTime: 'Within 24 hours',
} as const;

/** Lead intake. All forms post to /api/lead which proxies to WordPress + CF7. */
export const LEAD = {
  /** WP CF7 form id that owns the existing email + Flamingo + HubSpot chain. */
  wpFormId: 2575,
  /** Where the Astro edge function forwards submissions. */
  wpEndpoint: 'https://admin.sunshine-lotionpump.com/wp-json/contact-form-7/v1/contact-forms',
  successPath: '/thank-you/',
  minMs: 1500,
} as const;

/**
 * Analytics — mirrors the live site, which loads gtag.js directly (no GTM).
 * The conversion label is the one already verified on the legacy WordPress pages.
 */
export const TRACKING = {
  ga4Id: 'G-8FBX0D4TKK',
  googleAdsId: 'AW-18370250001',
  conversionLabel: 'AW-18370250001/HC1NCLmest4cEJGKz7dE',
} as const;

export type NavLink = { label: string; href: string };
export type NavGroup = { label: string; href?: string; children?: NavLink[] };

/** Mirrors the live menu 1:1 (URLs verified against the rendered header, 2026-09-30). */
export const NAV: NavGroup[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Products',
    children: [
      { label: 'All Products', href: '/products/' },
      { label: 'Lotion Pump', href: '/product-category/lotion-pump/' },
      { label: 'Cream Pump', href: '/product-category/cream-pump/' },
      { label: 'Trigger Sprayers', href: '/product-category/trigger-sprayers/' },
      { label: 'Fine Mist Sprayer', href: '/product-category/fine-mist-sprayer/' },
      { label: 'Treatment Pump', href: '/product-category/treatment-pump/' },
      { label: 'Disc Top Cap', href: '/product-category/disc-top-cap/' },
      { label: 'Nail Polish Pump', href: '/product-category/nail-polish-pump/' },
      { label: 'Foam Pump', href: '/product-category/foam-pump/' },
    ],
  },
  {
    label: "Buyer's Guide",
    children: [
      { label: 'Lotion Pump Guide', href: '/lotion-pump-quality-testing/' },
      { label: 'Fine Mist Sprayer Guide', href: '/fine-mist-sprayer/' },
      { label: 'Disc Top Cap Guide', href: '/disc-top-cap-flip-top-cap-buyers-guide/' },
      { label: 'Foam Pump Guide', href: '/foam-pump-everything-brands-need-to-know/' },
    ],
  },
  {
    label: 'Blog',
    children: [
      { label: 'Product Comparisons', href: '/category/blog/product-comparisons/' },
      { label: 'Product Guides', href: '/category/blog/product-guides/' },
      { label: 'Sourcing & Manufacturing', href: '/category/blog/sourcing-manufacturing/' },
      { label: 'Technical Specifications', href: '/category/blog/technical-specifications/' },
    ],
  },
  { label: 'About Us', href: '/about-us/' },
  { label: 'Contact Us', href: '/contact-us/' },
];

/** Product family ordering used by the home page filter + footer. */
export const PRODUCT_CATEGORIES = [
  { slug: 'lotion-pump', label: 'Lotion Pump' },
  { slug: 'cream-pump', label: 'Cream Pump' },
  { slug: 'trigger-sprayers', label: 'Trigger Sprayer' },
  { slug: 'fine-mist-sprayer', label: 'Fine Mist Sprayer' },
  { slug: 'disc-top-cap', label: 'Disc Top Cap' },
  { slug: 'treatment-pump', label: 'Treatment Pump' },
  { slug: 'nail-polish-pump', label: 'Nail Polish Pump' },
  { slug: 'foam-pump', label: 'Foam Pump' },
] as const;

/**
 * Values that appear on the legacy site in more than one version.
 *
 * RESOLVED 2026-10-01 by the owner: founding year = 2018, city = Yuyao,
 * MOQ = 5,000 pcs. The conflicts below are kept as an audit trail; the
 * `resolution` field records what was decided.
 */
export const DATA_CONFLICTS = [
  {
    field: 'legal entity name',
    kept: 'Ningbo Sunshine Plastic Industry Co., Ltd.',
    others: ['Ningbo Shaoshuai Plastic Industry Co., Ltd.'],
    where: 'about-us body, contact-us body vs. home body + footer',
    resolution: 'unresolved — still needs the business licence to confirm',
  },
  {
    field: 'city',
    kept: 'Yuyao, Ningbo',
    others: ['Cixi, Ningbo'],
    where: 'about-us + contact-us bodies vs. home body + footer',
    resolution: 'owner confirmed Yuyao (2026-10-01). Street address still shows the legacy Cixi/Zhouxiang line — needs updating.',
  },
  {
    field: 'year founded',
    kept: '2018',
    others: ['2005', '2010', '2015'],
    where: 'home hero "SINCE 2018" vs. about counter "2010" vs. home counter from-value 2015 vs. about counter "2005"',
    resolution: 'owner confirmed 2018 (2026-10-01). Retire the 2005/2010/2015 counters.',
  },
  {
    field: 'years in business',
    kept: 'since 2018',
    others: ['7+ years', '14+ years'],
    where: 'home "7+ Years" vs. about "Over 14+ years"',
    resolution: 'owner confirmed 2018 (2026-10-01). Compute any "X+ years" claim from 2018.',
  },
  {
    field: 'MOQ',
    kept: '5,000 pcs',
    others: ['10,000 pcs'],
    where: 'home meta description said 10,000; ABOUT_STATS said 5,000',
    resolution: 'owner confirmed 5,000 pcs (2026-10-01). Site-wide single value.',
  },
  {
    field: 'factory floor',
    kept: '7,000 m²',
    others: [],
    where: 'consistent — home + about both say 7,000 m²',
    resolution: 'no conflict',
  },
  {
    field: 'annual output',
    kept: '50M+ units',
    others: [],
    where: 'about + home both say 50M+',
    resolution: 'no conflict',
  },
] as const;

export const TRUST_STATS = [
  { label: 'Year Founded', value: '2018' },
  { label: 'Factory Staff', value: '50+' },
  { label: 'Factory Floor', value: '7,000 m²' },
] as const;

export const ABOUT_STATS = [
  { label: 'Established', value: '2018' },
  { label: 'Factory Floor', value: '7,000 m²' },
  { label: 'Units / Year', value: '50M+' },
  { label: 'MOQ', value: '5,000 pcs' },
] as const;
