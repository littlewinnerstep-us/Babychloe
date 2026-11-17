import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function stripCrossOriginPlugin() {
  return {
    name: 'strip-crossorigin',
    transformIndexHtml(html) {
      return html.replace(/ crossorigin/g, '');
    },
  };
}

export default defineConfig({
  plugins: [react(), stripCrossOriginPlugin()],
  base: './',
  build: {
    assetsInlineLimit: 4096,
  },
});
