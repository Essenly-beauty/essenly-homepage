// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://essenly.beauty',

  // These pages were absorbed into the one-page landing as anchor sections.
  // The routes are kept because they are already indexed and linked from
  // elsewhere; on a static build Astro emits an HTML redirect for each.
  // The trade page became the homepage, so /wholesale is gone as a route but is
  // the most linked-to URL on the site — it redirects rather than 404s. The
  // inquiry form is the old /contact's destination now; there is no #contact
  // section on this layout.
  redirects: {
    '/product': '/#product',
    '/contact': '/#inquiry',
    '/wholesale': '/#inquiry',
  },

  integrations: [
    sitemap({
      // /thank-you is a post-submit page, and the three redirects above are not
      // destinations in their own right.
      filter: (page) =>
        !['/thank-you', '/product', '/contact', '/wholesale'].some((path) =>
          page.includes(path)
        ),
    }),
  ],
});
