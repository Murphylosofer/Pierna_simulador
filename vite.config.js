import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Un solo archivo autocontenido: funciona en GitHub Pages, abierto como archivo y como artifact.
// La entrada es app.html porque index.html (en la raíz) es la página ya compilada que sirve GitHub Pages.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 3000, rollupOptions: { input: 'app.html' } },
});
