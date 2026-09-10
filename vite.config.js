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

            if (req.method === 'GET') {
              try {
                if (adminSupabase) {
                  const url = req.url || '';
                  if (url.includes('type=api_keys')) {
                    const { data: rawKeys, error } = await adminSupabase
                      .from('api_keys')
                      .select('*, users:user_id(id, name, email)')
                      .order('created_at', { ascending: false });

                    if (error) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ success: false, error: error.message }));
                    } else {
                      const keys = (rawKeys || []).map(row => {
                        let domainStatus = row.status;
                        let errorMessage = row.error_message || '';
                        if (errorMessage.startsWith('__PENDING__')) {
                          domainStatus = 'pending';
                          errorMessage = errorMessage.replace('__PENDING__', '');
                        }
                        return {
                          id: row.id,
                          keyString: row.key_string,
                          userId: row.user_id,
                          userName: row.users?.name || 'Pengguna',
                          userEmail: row.users?.email || '-',
                          status: domainStatus,
                          rewardAmount: Number(row.reward_amount) || 3000,
                          credits: Number(row.credits) || 80,
                          errorMessage: errorMessage,
                          createdAt: row.created_at,
                          source: 'supabase'
                        };
                      });
                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: true, data: keys }));
                    }
                    return;
                  }

                  if (url.includes('type=config')) {
                    const { data: cfgRow, error } = await adminSupabase
                      .from('users')
                      .select('avatar')
                      .eq('id', '00000000-0000-0000-0000-000000000001')
                      .maybeSingle();

                    if (error) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ success: false, error: error.message }));
                    } else {
                      let config = null;
                      if (cfgRow && cfgRow.avatar) {
                        try {
                          config = typeof cfgRow.avatar === 'string' ? JSON.parse(cfgRow.avatar) : cfgRow.avatar;
                        } catch (_) {}
                      }
                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: true, config }));
                    }
                    return;
                  }

                  const { data: users, error } = await adminSupabase
                    .from('users')
                    .select('*')
                    .order('created_at', { ascending: false });

                  if (error) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ success: false, error: error.message }));
                  } else {
                    const cleanUsers = (users || []).filter(u => u.role !== 'system_config' && !u.email?.includes('system_config'));
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true, data: cleanUsers }));
                  }
                } else {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: 'SUPABASE_SECRET_KEY belum diatur di .env' }));
                }
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: e.message }));
              }
              return;
            }

            if (req.method === 'POST') {
              let bodyStr = '';
              req.on('data', chunk => { bodyStr += chunk; });
              req.on('end', async () => {
                try {
                  const parsed = JSON.parse(bodyStr || '{}');
                  const { action, table, data, id } = parsed;

                  if (action === 'get_system_config') {
                    if (adminSupabase) {
                      const { data: cfgRow, error } = await adminSupabase
                        .from('users')
                        .select('avatar')
                        .eq('id', '00000000-0000-0000-0000-000000000001')
                        .maybeSingle();

                      if (error) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ success: false, error: error.message }));
                      } else {
                        let config = null;
                        if (cfgRow && cfgRow.avatar) {
                          try {
                            config = typeof cfgRow.avatar === 'string' ? JSON.parse(cfgRow.avatar) : cfgRow.avatar;
                          } catch (_) {}
                        }
                        res.statusCode = 200;
                        res.end(JSON.stringify({ success: true, config }));
                      }
                    } else {
                      res.statusCode = 500;
                      res.end(JSON.stringify({ success: false, error: 'SUPABASE_SECRET_KEY belum diatur di .env' }));
                    }
                    return;
                  }

                  if (action === 'save_system_config' && data) {
                    if (adminSupabase) {
                      const configJson = typeof data === 'string' ? data : JSON.stringify(data);
                      const { data: saved, error } = await adminSupabase
                        .from('users')
                        .upsert({
                          id: '00000000-0000-0000-0000-000000000001',
                          name: 'System Config',
                          email: 'system_config@panenkunci.internal',
                          role: 'system_config',
                          avatar: configJson,
                          is_verified: true,
                          updated_at: new Date().toISOString()
                        })
                        .select()
                        .single();

                      if (error) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ success: false, error: error.message }));
                      } else {
                        res.statusCode = 200;
                        res.end(JSON.stringify({ success: true, data: saved }));
                      }
                    } else {
                      res.statusCode = 500;
                      res.end(JSON.stringify({ success: false, error: 'SUPABASE_SECRET_KEY belum diatur di .env' }));
                    }
                    return;
                  }

                  if (action === 'get_users' || (action === 'select' && table === 'users')) {
                    if (adminSupabase) {
                      const { data: users, error } = await adminSupabase
                        .from('users')
                        .select('*')
                        .order('created_at', { ascending: false });

                      if (error) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ success: false, error: error.message }));
                      } else {
                        const cleanUsers = (users || []).filter(u => u.role !== 'system_config' && !u.email?.includes('system_config'));
                        res.statusCode = 200;
                        res.end(JSON.stringify({ success: true, data: cleanUsers }));
                      }
                    } else {
                      res.statusCode = 500;
                      res.end(JSON.stringify({ success: false, error: 'SUPABASE_SECRET_KEY belum diatur di .env' }));
                    }
                    return;
                  }

                  if (action === 'get_api_keys' || (action === 'select' && table === 'api_keys')) {
                    if (adminSupabase) {
                      const { data: rawKeys, error } = await adminSupabase
                        .from('api_keys')
                        .select('*, users:user_id(id, name, email)')
                        .order('created_at', { ascending: false });

                      if (error) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ success: false, error: error.message }));
                      } else {
                        const keys = (rawKeys || []).map(row => {
                          let domainStatus = row.status;
                          let errorMessage = row.error_message || '';
                          if (errorMessage.startsWith('__PENDING__')) {
                            domainStatus = 'pending';
                            errorMessage = errorMessage.replace('__PENDING__', '');
                          }
                          return {
                            id: row.id,
                            keyString: row.key_string,
                            userId: row.user_id,
                            userName: row.users?.name || 'Pengguna',
                            userEmail: row.users?.email || '-',
                            status: domainStatus,
                            rewardAmount: Number(row.reward_amount) || 3000,
                            credits: Number(row.credits) || 80,
                            errorMessage: errorMessage,
                            createdAt: row.created_at,
                            source: 'supabase'
                          };
                        });
                        res.statusCode = 200;
                        res.end(JSON.stringify({ success: true, data: keys }));
                      }
                    } else {
                      res.statusCode = 500;
                      res.end(JSON.stringify({ success: false, error: 'SUPABASE_SECRET_KEY belum diatur di .env' }));
                    }
                    return;
                  }

                  if (action === 'get_transactions' || (action === 'select' && table === 'transactions')) {
                    if (adminSupabase) {
                      let query = adminSupabase
                        .from('transactions')
                        .select('*')
                        .order('created_at', { ascending: false });

                      const targetUserId = parsed.userId || parsed.user_id;
                      if (targetUserId) {
                        query = query.eq('user_id', targetUserId);
                      }

                      const { data: txs, error } = await query;

                      if (error) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ success: false, error: error.message }));
                      } else {
                        res.statusCode = 200;
                        res.end(JSON.stringify({ success: true, data: txs || [] }));
                      }
                    } else {
                      res.statusCode = 500;
                      res.end(JSON.stringify({ success: false, error: 'SUPABASE_SECRET_KEY belum diatur di .env' }));
                    }
                    return;
                  }

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

                  if (action === 'insert' && table === 'api_keys') {
                    let insertPayload = { ...data };
                    let { data: inserted, error } = await adminSupabase
                      .from('api_keys')
                      .insert(insertPayload)
                      .select('*, users:user_id(id, name, email)')
                      .single();

                    if (error && error.message && error.message.includes('api_keys_status_check') && insertPayload.status === 'pending') {
                      insertPayload.status = 'valid';
                      insertPayload.error_message = '__PENDING__' + (insertPayload.error_message || '');
                      const retry = await adminSupabase
                        .from('api_keys')
                        .insert(insertPayload)
                        .select('*, users:user_id(id, name, email)')
                        .single();
                      inserted = retry.data;
                      error = retry.error;
                    }

                    if (error) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ success: false, error: error.message }));
                    } else {
                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: true, data: inserted }));
                    }
                    return;
                  }

                  if (action === 'insert' && table === 'transactions') {
                    const txPayload = {
                      user_id: data.user_id || data.userId,
                      type: data.type || 'deposit',
                      amount: Number(data.amount || 0),
                      fee: Number(data.fee || 0),
                      title: data.title || 'Transaksi',
                      description: data.description || '',
                      status: data.status || 'pending',
                      method: data.method || '',
                      recipient: data.recipient || ''
                    };

                    if (data.id && data.id.includes('-')) {
                      txPayload.id = data.id;
                    }

                    const { data: inserted, error } = await adminSupabase
                      .from('transactions')
                      .insert(txPayload)
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

                  if (action === 'update' && table === 'api_keys' && id) {
                    let updatePayload = { ...data };
                    if (updatePayload.status === 'valid' && updatePayload.error_message && updatePayload.error_message.includes('__PENDING__')) {
                      updatePayload.error_message = updatePayload.error_message.replace('__PENDING__', '');
                    }

                    let { data: updated, error } = await adminSupabase
                      .from('api_keys')
                      .update(updatePayload)
                      .eq('id', id)
                      .select('*, users:user_id(id, name, email)')
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

                  if (action === 'update' && table === 'transactions' && id) {
                    const { data: updated, error } = await adminSupabase
                      .from('transactions')
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

                  if (action === 'delete' && table === 'users' && id) {
                    const { error } = await adminSupabase
                      .from('users')
                      .delete()
                      .eq('id', id);

                    if (error) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ success: false, error: error.message }));
                    } else {
                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: true }));
                    }
                    return;
                  }

                  if (action === 'delete' && table === 'api_keys' && id) {
                    const { error } = await adminSupabase
                      .from('api_keys')
                      .delete()
                      .eq('id', id);

                    if (error) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ success: false, error: error.message }));
                    } else {
                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: true }));
                    }
                    return;
                  }

                  if (action === 'delete' && table === 'transactions' && id) {
                    const { error } = await adminSupabase
                      .from('transactions')
                      .delete()
                      .eq('id', id);

                    if (error) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ success: false, error: error.message }));
                    } else {
                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: true }));
                    }
                    return;
                  }

                  if (action === 'generate_recovery_link' && data?.email) {
                    if (adminSupabase) {
                      const { data: linkData, error } = await adminSupabase.auth.admin.generateLink({
                        type: 'recovery',
                        email: data.email,
                        options: {
                          redirectTo: data.redirectTo || 'http://localhost:5173/#/reset-password'
                        }
                      });
                      if (error) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ success: false, error: error.message }));
                      } else {
                        res.statusCode = 200;
                        res.end(JSON.stringify({
                          success: true,
                          action_link: linkData?.properties?.action_link
                        }));
                      }
                    } else {
                      res.statusCode = 500;
                      res.end(JSON.stringify({ success: false, error: 'SUPABASE_SECRET_KEY belum diatur di .env' }));
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
