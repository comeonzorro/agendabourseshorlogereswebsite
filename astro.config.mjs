import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.lagenda-des-bourses-horlogeres.com',
  trailingSlash: 'never',
  integrations: [
    sitemap({
      customPages: ['https://www.lagenda-des-bourses-horlogeres.com/tirage-au-sort'],
    }),
  ],
});
