import { defineConfig } from 'vite';

// base relativa: dist/ funciona en GitHub Pages bajo cualquier subruta, sin servidor propio.
export default defineConfig({
  base: './',
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 1200 },
});
