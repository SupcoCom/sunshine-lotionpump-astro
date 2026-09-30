# Deployment

## Target

**Cloudflare Pages** — the domain already sits behind Cloudflare, images are already on a CDN,
and the only dynamic route (`/api/lead`) runs as a Worker function via `@astrojs/cloudflare`.

## 1. Create the project

```bash
npx wrangler pages project create sunshine-lotionpump
```

or create it in the dashboard and note the project name.

## 2. Environment variables

| Variable | Value | Why |
|---|---|---|
| `GTM_CONTAINER_ID` | your real GTM id | Analytics. Until set, the site loads **no** GTM. |
| `GA4_MEASUREMENT_ID` | `G-8FBX0D4TKK` | GA4 pageview + `generate_lead` |
| `GOOGLE_ADS_ID` | `AW-18370250001` | Conversion tag fired on lead success |

These are read in `src/config/site.ts`. Until a real GTM id is configured the tracking component
renders nothing, so a preview build never pollutes production analytics.

## 3. Build settings

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Build output | `dist` |
| Node version | 22+ |

`npm run build` runs `scripts/sync-wp.mjs` first, so every deploy pulls the latest content from
WordPress automatically.

## 4. Rebuild on content change (recommended)

Add a WordPress hook that calls the Pages deploy hook whenever a product/page/post is published:

```php
// mu-plugin or Code Snippet — fires after any content publish
add_action( 'save_post', function ( $post_id ) {
    if ( wp_is_post_revision( $post_id ) ) return;
    wp_remote_post( 'https://api.cloudflare.com/client/v4/accounts/<ACCOUNT>/pages/projects/sunshine-lotionpump/deployments', [
        'headers' => [
            'Authorization' => 'Bearer <CLOUDFLARE_API_TOKEN>',
            'Content-Type'  => 'application/json',
        ],
    ] );
}, 20, 1 );
```

Without this, content changes go live on the next manual deploy.

## 5. Cutover checklist

1. Deploy to a preview domain and run Lighthouse on `/`, one LP, one product, one article.
2. Compare against the live site's CWV (the legacy numbers could not be captured here —
   PageSpeed Insights' keyless API is quota-blocked in this environment).
3. Submit `https://sunshine-lotionpump.com/sitemap-index.xml` in Search Console.
4. In Rank Math → Sitemap settings, **disable** the sitemaps once the Astro sitemap is verified.
5. Point DNS / the Cloudflare Pages custom domain at the new deployment.
6. Keep WordPress running — it is still the CMS, the image origin and the lead endpoint.
7. Verify one real inquiry end-to-end (form → email → Flamingo → HubSpot).

## 6. Optional: mirror images off WordPress

Product and article images currently load from `sunshine-lotionpump.com/wp-content/uploads/...`
and `img.supcous.com`. To remove the runtime dependency on WordPress:

1. Copy `wp-content/uploads/sites/2/` to a bucket (R2 / Cloudflare Images / the existing OSS).
2. Add a `src/scripts/rewrite-media-urls.mjs` step that rewrites the URLs in `src/content/**`.
3. Re-run `npm run build`.

## 7. Rollback

The legacy WordPress site is untouched. Reverting DNS to the previous origin restores it
immediately. Nothing in this project writes to WordPress.
