import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(fs.readFileSync(path.resolve('./package.json'), 'utf8'));
const BUILD_VERSION = pkg.version || '1.0.5';
const BUILD_TIMESTAMP = new Date().toISOString();

function stripCrossOriginPlugin() {
  return {
    name: 'strip-crossorigin',
    transformIndexHtml(html) {
      return html.replace(/ crossorigin/g, '');
    },
  };
}

function writeVersionManifestPlugin() {
  return {
    name: 'write-version-manifest',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify(
          {
            version: BUILD_VERSION,
            buildTimestamp: BUILD_TIMESTAMP,
          },
          null,
          2
        ),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), stripCrossOriginPlugin(), writeVersionManifestPlugin()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(BUILD_VERSION),
    __BUILD_TIMESTAMP__: JSON.stringify(BUILD_TIMESTAMP),
  },
  build: {
    assetsInlineLimit: 4096,
  },
});
