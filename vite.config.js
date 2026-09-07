import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: './',
  publicDir: 'public',
  plugins: [
    {
      name: 'admin-panel-rewrite',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url ? req.url.split('?')[0] : '';
          if (url === '/admin_panel') {
            res.writeHead(302, { Location: '/admin_panel/' });
            res.end();
            return;
          }
          if (url === '/admin_panel/') {
            req.url = '/admin_panel/index.html';
          }
          next();
        });
      }
    }
  ],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin_panel/index.html')
      }
    }
  }
});
