import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5189,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
