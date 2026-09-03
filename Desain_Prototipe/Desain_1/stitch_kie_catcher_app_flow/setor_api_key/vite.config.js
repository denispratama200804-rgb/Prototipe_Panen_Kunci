import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5184,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
