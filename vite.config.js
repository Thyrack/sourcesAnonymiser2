import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [
    viteSingleFile(),
    {
      name: 'no-module',
      transformIndexHtml(html) {
        return html
          .replace(/<script type="module" crossorigin/g, '<script')
          .replace(/<link rel="modulepreload" [^>]*>/g, '');
      }
    }
  ],
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    brotliSize: false,
    modulePreload: false,
    rollupOptions: {
      output: {
        format: 'iife',
        manualChunks: undefined,
        inlineDynamicImports: true,
      },
    },
  },
});
