import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  /*
   * MapLibre must not be pre-bundled.
   *
   * It starts its tile worker with `new Worker(new URL('./maplibre-gl-worker',
   * import.meta.url))`. Vite's dependency optimizer rewrites the module into
   * .vite/deps/ but does not emit the worker beside it, so that URL 404s in dev
   * — the map constructs, the worker never starts, and `load` never fires: a
   * blank paper rectangle with no route and no markers, and no error in the
   * console to explain it. Excluding it serves the package's own ESM, where the
   * relative worker URL resolves. Production builds are unaffected (Rollup
   * emits the worker), but the exclusion is harmless there.
   */
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
