# SUNSHINE — Astro + Headless WordPress

A complete, production-ready rebuild of **sunshine-lotionpump.com** as a static Astro
site with WordPress kept as a headless CMS. Elementor, Elementor Pro, jQuery and the
WordPress theme are gone; the content, URLs and SEO metadata are preserved 1:1.

```
WordPress (CMS only)  ──npm run sync──▶  src/data/*.json + src/content/**
                                              │
                                              ▼
                              Astro build (static, 115 pages)
                                              │
                                              ▼
                        Cloudflare Pages  +  /api/lead (Worker function)
```

## Quick start

```bash
npm install
npm run sync        # pull content from WordPress (read-only)
npm run build       # sync + build  → dist/
npm run preview     # serve dist/ locally
npm run check       # type check
npm run audit       # compare the build against the live site
```

`npm run build:offline` builds from the already-synced data without touching WordPress.

## What is in the box

| Area | Implementation |
|---|---|
| Content source | WordPress REST API (`/wp-json/wp/v2/*`), read at build time |
| Products | 57 items, 30 ACF fields each → typed content collection |
| Articles | 23 posts, original HTML body preserved |
| Landing pages | 13 hand-authored pages ported verbatim, CF7 forms swapped for one component |
| Product families | 8 category archives + `/products/` archive |
| Blog categories | `/category/blog/` + 4 child archives (legacy paths kept) |
| Lead forms | One `<LeadForm>` component → `/api/lead` → WordPress CF7 (email + Flamingo + HubSpot chain untouched) |
| SEO | Live Rank Math title/description/canonical/robots snapshot, JSON-LD, sitemap, robots.txt |
| Analytics | GTM + GA4 + Google Ads conversion helper, env-overridable |
| Redirects | `public/_redirects` (Cloudflare Pages) + `src/data/redirects.json` |

## Scripts

| Script | Purpose |
|---|---|
| `npm run sync` | Pull pages/posts/products/categories/media + live `<head>` SEO snapshot |
| `npm run build` | Sync, then build |
| `npm run preview` | Serve the build locally |
| `npm run check` | `astro check` (types) |
| `npm run audit` | Fetch the live site and diff page count / payload / requests |
| `node scripts/strip-bom.mjs` | Remove stray BOMs from source files |

## Project layout

```
scripts/     sync-wp.mjs (WP → static content) · audit.mjs · parity.mjs · strip-bom.mjs
src/
  config/    site.ts — single source of truth for brand, NAP, nav, tracking
  content/   posts/ products/ (collections) · landing/ pages/ (ported HTML)
  data/      registry.json seo.json product-categories.json post-categories.json
             redirects.json cf7.json media.json sync-report.json
  lib/       content.ts — build-time accessors
  layouts/   BaseLayout.astro (site chrome) · LpLayout.astro (bare, elementor_canvas equivalent)
  components/ Header Footer LeadForm ProductCard SpecGrid CtaBand FaqList Breadcrumbs
              BaseHead Tracking JsonLd
  pages/     index · about-us · contact-us · lotion-pump-manufacturer · products
             [slug].astro (all legacy root URLs) · product/[slug] · product-category/[slug]
             category/[...slug] · 404 · api/lead
public/      robots.txt · _redirects · _headers
docs/        ARCHITECTURE · MIGRATION · CONTENT-AUDIT · DEPLOYMENT
```

## Design decisions worth knowing

- **URL parity is the whole point.** Every legacy permalink is reproduced exactly, so no
  redirect is needed for 110 of 112 URLs. The two exceptions are listed in
  `docs/MIGRATION.md`.
- **Landing pages are ported, not rewritten.** They were hand-authored HTML with their own
  scoped CSS. The rebuild strips the Contact Form 7 markup and leaves a
  `<!--LEAD_FORM:source-->` marker; the form component renders markup that matches the
  landing page's existing `.wpcf7-form` / `.lp-form-field` class contract, so the design is
  untouched.
- **No runtime WordPress calls.** Pages are static. Only `/api/lead` is dynamic.
- **Images stay on the existing CDN** (`img.supcous.com`) and on WordPress uploads. They are
  served as plain `<img>` tags — no build-time image pipeline, no extra requests.
- **Company identity is centralised** in `src/config/site.ts`. The legacy site contradicted
  itself (three company names, two cities, four founding years); the rebuild publishes one
  canonical set and records every conflict in `docs/CONTENT-AUDIT.md`.
