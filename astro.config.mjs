import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

export default defineConfig({
  // o export const prerender = false en cada endpoint
  output: 'server',
  adapter: netlify()
});