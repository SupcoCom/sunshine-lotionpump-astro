# Migration notes — legacy WordPress → Astro rebuild

## URL parity

The rebuild reproduces **112 of 112** URLs that were in the legacy sitemaps. Verified by
`node scripts/parity.mjs` (compares `dist/client/sitemap-0.xml` against the five live
sitemap files).

| Legacy URL | Rebuild |
|---|---|
| `/` | `src/pages/index.astro` (re-authored) |
| `/about-us/` `contact-us/` `lotion-pump-manufacturer/` | re-authored as Astro pages |
| `/products/` | `src/pages/products.astro` (new, fixes a broken H1) |
| `/product/<slug>/` × 57 | `src/pages/product/[slug].astro` |
| `/product-category/<slug>/` × 8 | `src/pages/product-category/[slug].astro` |
| `/category/blog/` + `/category/blog/<slug>/` × 4 | `src/pages/category/[...slug].astro` |
| `/<post-slug>/` × 23 | `src/pages/[slug].astro` |
| `/<landing-slug>/` × 13 | `src/pages/[slug].astro` (ported HTML) |
| `/privacy-policy/` `/thank-you/` | `src/pages/[slug].astro` |

## The only two redirects

| From | To | Why |
|---|---|---|
| `/lotion-pump-manufacturer-landingpage/` | `/lotion-pump-manufacturer-landingpage-v2/` | v1 was already `noindex` and absent from the sitemap; v2 is the canonical page |
| `/elementor-1657/` | `/` | Elementor draft artefact, already de-indexed |

Both are in `public/_redirects` (Cloudflare Pages) and mirrored in `src/data/redirects.json`.
The rebuild also serves the v1 URL with `noindex` as a safety net.

## What changed for the better

- **Payload.** Home page HTML drops from 248 KB to ~71 KB, and the ~600 KB of Elementor/jQuery
  CSS+JS is gone. No jQuery, no `frontend.min.js`, no per-page Elementor CSS files.
- **Requests.** One stylesheet, zero render-blocking third-party scripts on first paint
  (GTM is the only external script and is async).
- **Heading hierarchy.** The `/products/` archive had an H1 that printed a random product title;
  it now has a real one.
- **Metadata.** The privacy policy description was `Last updated: August 19, 2026`; it is now a
  real description.
- **Company identity.** One legal name, one city, one founding year (see `CONTENT-AUDIT.md`).
- **Internal linking.** Blog posts link to their category archives; the footer links to
  `/products/`.

## What did not change

- Every URL, slug and trailing slash.
- Every product's 30 ACF fields and every article's body copy.
- The lead pipeline: CF7 form 2575 → WP Mail SMTP (QQ) → Flamingo → HubSpot sync snippet.
- Google Ads final URLs and the `AW-18370250001` conversion tag.
- The landing pages' visual design.

## Known limitations

1. **Images still come from WordPress.** `img.supcous.com` and
   `sunshine-lotionpump.com/wp-content/uploads/...` are referenced directly. If WordPress goes
   down, images break. See `docs/DEPLOYMENT.md` for the R2 mirror option.
2. **Content edits need a rebuild.** Publishing a product in wp-admin does not update the site
   until `npm run build` runs. Wire a webhook (see `docs/DEPLOYMENT.md`).
3. **The LP inline scripts are preserved verbatim.** They include a `window.wpcf7` guard that is
   now dead code but harmless. The FAQ accordion and quote-scroll behaviour they provide still
   works.
4. **Rank Math's sitemap is still active on WordPress.** Once the Astro site is live, disable
   Rank Math's sitemaps so there is not a duplicate. Until then both point at the same URLs.
5. **No live Core Web Vitals comparison yet.** PageSpeed Insights' keyless API is quota-blocked
   in this environment. Run a Lighthouse pass on the deployed URL before cutover.
