import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5185,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
