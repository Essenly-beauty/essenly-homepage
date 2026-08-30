// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://essenly.beauty',

  // These pages were absorbed into the one-page landing as anchor sections.
  // The routes are kept because they are already indexed and linked from
  // elsewhere; on a static build Astro emits an HTML redirect for each.
  // /wholesale is deliberately absent: it is a real page again, at
  // src/pages/wholesale.astro.
  redirects: {
    '/product': '/#product',
    '/contact': '/#contact',
  },

  integrations: [
    sitemap({
      // /thank-you is a post-submit page, and the two redirects above are not
      // destinations in their own right.
      filter: (page) =>
        !['/thank-you', '/product', '/contact'].some((path) =>
          page.includes(path)
        ),
    }),
  ],
});
