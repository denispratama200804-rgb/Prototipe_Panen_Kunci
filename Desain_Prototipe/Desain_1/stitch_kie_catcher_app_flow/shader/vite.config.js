import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5187,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
