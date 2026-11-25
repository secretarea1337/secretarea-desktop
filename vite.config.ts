import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const pkgJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')
  ) as {version?: string};
  const APP_VERSION = pkgJson.version || '1.0.0';

  return {
    base: './',
    define: {
      __APP_VERSION__: JSON.stringify(APP_VERSION),
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'inject-production-csp',
        apply: 'build',
        transformIndexHtml() {
          const csp = [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "img-src 'self' data: blob: https: http:",
            "media-src 'self' data: blob: https: http:",
            "frame-src https://*.youtube.com https://*.youtube-nocookie.com https://trocador.app",
            "connect-src 'self' https:",
            "object-src 'none'",
            "base-uri 'self'",
          ].join('; ');
          return [
            {
              tag: 'meta',
              attrs: {
                'http-equiv': 'Content-Security-Policy',
                content: csp,
              },
              injectTo: 'head',
            },
          ];
        },
      },
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
