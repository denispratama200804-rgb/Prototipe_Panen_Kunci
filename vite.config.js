import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const SUPABASE_URL = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || 'https://bmuthjyibkrcqyygjcxe.supabase.co';
  const SUPABASE_SECRET_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || '';

  // Inisialisasi client admin di sisi server Node.js jika secret key tersedia
  const adminSupabase = SUPABASE_SECRET_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
    : null;

  return {
    root: './',
    publicDir: 'public',
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    plugins: [
      {
        name: 'admin-panel-and-supabase-proxy',
        configureServer(server) {
          // 1. Rewrite URL untuk admin_panel
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

          // 2. Server Proxy untuk operasi database Supabase jika client terhalang RLS
          server.middlewares.use('/api/supabase-proxy', async (req, res) => {
            res.setHeader('Content-Type', 'application/json');

            if (req.method === 'POST') {
              let bodyStr = '';
              req.on('data', chunk => { bodyStr += chunk; });
              req.on('end', async () => {
                try {
                  const parsed = JSON.parse(bodyStr || '{}');
                  const { action, table, data, id } = parsed;

                  if (action === 'insert' && table === 'users') {
                    const { data: inserted, error } = await adminSupabase
                      .from('users')
                      .insert(data)
                      .select()
                      .single();

                    if (error) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ success: false, error: error.message }));
                    } else {
                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: true, data: inserted }));
                    }
                    return;
                  }

                  if (action === 'update' && table === 'users' && id) {
                    const { data: updated, error } = await adminSupabase
                      .from('users')
                      .update(data)
                      .eq('id', id)
                      .select()
                      .single();

                    if (error) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ success: false, error: error.message }));
                    } else {
                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: true, data: updated }));
                    }
                    return;
                  }

                  res.statusCode = 400;
                  res.end(JSON.stringify({ success: false, error: 'Aksi tidak didukung' }));
                } catch (err) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: err.message }));
                }
              });
              return;
            }

            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
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
  };
});
