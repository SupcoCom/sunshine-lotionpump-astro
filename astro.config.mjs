// @ts-check
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

/**
 * URLs the legacy site asked search engines not to index (or that are not pages).
 * Read from the synced dataset so the sitemap can never claim a noindex URL.
 */
function noindexPaths() {
  try {
    const file = fileURLToPath(new URL('./src/data/seo.json', import.meta.url));
    const seo = JSON.parse(fs.readFileSync(file, 'utf8'));
    return new Set(
      Object.entries(seo)
        .filter(([, value]) => String(value?.robots ?? '').includes('noindex'))
        .map(([path]) => path),
    );
  } catch {
    return new Set();
  }
}

/**
 * Architecture decision record (see docs/ARCHITECTURE.md):
 * - Content source : WordPress REST API (read-only, at build time)
 * - Rendering      : static-first (SSG). Only /api/lead is dynamic (edge function).
 * - Hosting        : Cloudflare Pages/Workers (site already sits behind Cloudflare)
 * - Tablet of truth: URL parity with the legacy WordPress permalinks (trailing slash)
 */
export default defineConfig({
  site: 'https://sunshine-lotionpump.com',
  output: 'static',
  trailingSlash: 'always',
  adapter: cloudflare({ imageService: 'compile' }),
  integrations: [
    sitemap({
      // never advertise a noindex URL (thank-you, legacy duplicates, 404)
      filter: (page) => {
        const { pathname } = new URL(page);
        if (/\/(thank-you|404)\/$/.test(pathname)) return false;
        return !noindexPaths().has(pathname);
      },
      changefreq: 'weekly',
      priority: 0.7,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
  image: {
    // Product photography lives on the existing OSS/CDN
    domains: ['img.supcous.com'],
  },
  build: {
    // Inline all CSS into HTML to remove the render-blocking stylesheet request.
    // This site is small enough that the ~15KiB CSS is worth inlining for a faster LCP.
    inlineStylesheets: 'always',
  },
  compressHTML: true,
});
