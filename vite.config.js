import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import dns from 'node:dns';
import crypto from 'node:crypto';

// Fix local IPv6 ENETUNREACH issue
dns.setDefaultResultOrder('ipv4first');

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

  const CHAT_STORE_ID = '00000000-0000-0000-0000-000000000002';

  async function getLiveChatsFromSupabase(targetUserId = null) {
    if (!adminSupabase) return [];
    try {
      let query = adminSupabase
        .from('live_chat_messages')
        .select('*')
        .order('created_at', { ascending: true });
      if (targetUserId) {
        query = query.eq('user_id', targetUserId);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data
          .filter(row => row && row.user_id !== 'usr_budi_live' && row.user_id !== 'usr_siti_live' && !String(row.id || '').startsWith('msg_demo_') && row.user_email !== 'budi.santoso@gmail.com')
          .map(row => ({
            id: row.id,
            userId: row.user_id,
            userName: row.user_name || 'Pengguna',
            userAvatar: row.user_avatar || '',
            userEmail: row.user_email || '',
            sender: row.sender,
            text: row.text,
            timestamp: new Date(row.created_at).getTime(),
            timeStr: row.time_str || '',
            readByAdmin: Boolean(row.read_by_admin),
            readByUser: Boolean(row.read_by_user)
          }));
      }
    } catch (_) {}

    try {
      const { data: storeRow } = await adminSupabase
        .from('users')
        .select('avatar')
        .eq('id', CHAT_STORE_ID)
        .maybeSingle();

      if (storeRow && storeRow.avatar) {
        const parsed = typeof storeRow.avatar === 'string' ? JSON.parse(storeRow.avatar) : storeRow.avatar;
        if (Array.isArray(parsed)) {
          const validChats = parsed.filter(m => m && m.userId !== 'usr_budi_live' && m.userId !== 'usr_siti_live' && !String(m.id || '').startsWith('msg_demo_') && m.userEmail !== 'budi.santoso@gmail.com');
          if (targetUserId) {
            return validChats.filter(m => m.userId === targetUserId);
          }
          return validChats;
        }
      }
    } catch (_) {}
    return [];
  }

  async function saveLiveChatToSupabase(message) {
    if (!adminSupabase || !message || !message.userId || !message.text) return message;
    try {
      const rowPayload = {
        user_id: message.userId,
        user_name: message.userName || '',
        user_avatar: message.userAvatar || '',
        user_email: message.userEmail || '',
        sender: message.sender || 'user',
        text: message.text || '',
        time_str: message.timeStr || '',
        read_by_admin: message.readByAdmin ?? (message.sender === 'admin'),
        read_by_user: message.readByUser ?? (message.sender === 'user'),
        created_at: new Date(message.timestamp || Date.now()).toISOString()
      };
      if (message.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(message.id)) {
        rowPayload.id = message.id;
      }
      await adminSupabase.from('live_chat_messages').insert(rowPayload);
    } catch (_) {}

    try {
      const { data: storeRow } = await adminSupabase
        .from('users')
        .select('avatar')
        .eq('id', CHAT_STORE_ID)
        .maybeSingle();

      let list = [];
      if (storeRow && storeRow.avatar) {
        try {
          const parsed = typeof storeRow.avatar === 'string' ? JSON.parse(storeRow.avatar) : storeRow.avatar;
          if (Array.isArray(parsed)) list = parsed;
        } catch (_) {}
      }

      const exists = list.some(m => m.id === message.id || (m.userId === message.userId && m.sender === message.sender && m.text === message.text && Math.abs(m.timestamp - message.timestamp) < 2000));
      if (!exists) {
        list.push(message);
        if (list.length > 500) {
          list = list.slice(list.length - 500);
        }
        await adminSupabase.from('users').upsert({
          id: CHAT_STORE_ID,
          name: 'Live Chat Store',
          email: 'live_chat_store@panenkunci.internal',
          role: 'system_config',
          avatar: JSON.stringify(list),
          is_verified: true,
          updated_at: new Date().toISOString()
        });
      }
    } catch (_) {}
    return message;
  }

  async function markLiveChatsReadInSupabase(userId, reader = 'user') {
    if (!adminSupabase || !userId) return false;
    try {
      const updateObj = reader === 'admin' ? { read_by_admin: true } : { read_by_user: true };
      await adminSupabase.from('live_chat_messages').update(updateObj).eq('user_id', userId);
    } catch (_) {}

    try {
      const { data: storeRow } = await adminSupabase
        .from('users')
        .select('avatar')
        .eq('id', CHAT_STORE_ID)
        .maybeSingle();

      if (storeRow && storeRow.avatar) {
        let list = typeof storeRow.avatar === 'string' ? JSON.parse(storeRow.avatar) : storeRow.avatar;
        if (Array.isArray(list)) {
          let changed = false;
          list.forEach(m => {
            if (m.userId === userId) {
              if (reader === 'admin' && !m.readByAdmin) {
                m.readByAdmin = true;
                changed = true;
              } else if (reader === 'user' && !m.readByUser) {
                m.readByUser = true;
                changed = true;
              }
            }
          });
          if (changed) {
            await adminSupabase.from('users').upsert({
              id: CHAT_STORE_ID,
              name: 'Live Chat Store',
              email: 'live_chat_store@panenkunci.internal',
              role: 'system_config',
              avatar: JSON.stringify(list),
              is_verified: true,
              updated_at: new Date().toISOString()
            });
          }
        }
      }
    } catch (_) {}
    return true;
  }

  async function getOnlineUserIdsFromSupabase() {
    if (!adminSupabase) return [];
    try {
      const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
      const { data, error } = await adminSupabase
        .from('users')
        .select('id')
        .gt('updated_at', sixtySecondsAgo);
      if (!error && Array.isArray(data)) {
        return data.map(u => u.id);
      }
    } catch (_) {}
    return [];
  }

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
                  if (url.includes('type=live_chats')) {
                    let targetUserId = null;
                    try {
                      const parsedUrl = new URL(url, 'http://localhost');
                      targetUserId = parsedUrl.searchParams.get('userId');
                    } catch (_) {}
                    const [chats, onlineUserIds] = await Promise.all([
                      getLiveChatsFromSupabase(targetUserId),
                      getOnlineUserIdsFromSupabase()
                    ]);
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true, data: chats, onlineUserIds }));
                    return;
                  }

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
                    const cleanUsers = (users || []).filter(u => u.role !== 'system_config' && !u.email?.includes('system_config') && !u.email?.includes('panenkunci.internal'));
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

                  if (action === 'get_live_chats') {
                    const [chats, onlineUserIds] = await Promise.all([
                      getLiveChatsFromSupabase(parsed.userId || null),
                      getOnlineUserIdsFromSupabase()
                    ]);
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true, data: chats, onlineUserIds }));
                    return;
                  }

                  if (action === 'user_heartbeat' && parsed.userId) {
                    try {
                      if (adminSupabase) {
                        await adminSupabase
                          .from('users')
                          .update({ updated_at: new Date().toISOString() })
                          .eq('id', parsed.userId);
                      }
                    } catch (_) {}
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true }));
                    return;
                  }

                  if (action === 'user_offline' && parsed.userId) {
                    try {
                      if (adminSupabase) {
                        await adminSupabase
                          .from('users')
                          .update({ updated_at: new Date(0).toISOString() })
                          .eq('id', parsed.userId);
                      }
                    } catch (_) {}
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true }));
                    return;
                  }

                  if (action === 'send_live_chat' && parsed.message) {
                    const saved = await saveLiveChatToSupabase(parsed.message);
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true, data: saved }));
                    return;
                  }

                  if (action === 'mark_chat_read' && parsed.userId) {
                    await markLiveChatsReadInSupabase(parsed.userId, parsed.reader || 'user');
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true }));
                    return;
                  }

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
                        .select('*, users:user_id(id, name, email, phone, account_number, bank_name)')
                        .order('created_at', { ascending: false });

                      const targetUserId = parsed.userId || parsed.user_id;
                      if (targetUserId) {
                        query = query.eq('user_id', targetUserId);
                      }

                      let { data: txs, error } = await query;

                      if (error) {
                        console.warn('[vite-proxy] Join error on transactions, fallback to select *:', error.message);
                        const fallback = await adminSupabase
                          .from('transactions')
                          .select('*')
                          .order('created_at', { ascending: false });
                        if (fallback.error) {
                          res.statusCode = 400;
                          res.end(JSON.stringify({ success: false, error: fallback.error.message }));
                          return;
                        }
                        txs = fallback.data;
                      }

                      const formatted = (txs || []).map(row => {
                        const amount = Number(row.amount || 0);
                        const fee = Number(row.fee || 0);
                        const netPayout = row.net_payout !== null && row.net_payout !== undefined
                          ? Number(row.net_payout)
                          : Math.max(0, amount - fee);

                        return {
                          id: row.id,
                          userId: row.user_id,
                          user_id: row.user_id,
                          userName: row.users?.name || 'Pengguna',
                          userEmail: row.users?.email || '-',
                          userPhone: row.users?.phone || '',
                          userBank: row.users?.bank_name || '',
                          userAccountNumber: row.users?.account_number || '',
                          type: row.type,
                          amount: amount,
                          fee: fee,
                          netPayout: netPayout,
                          net_payout: netPayout,
                          title: row.title,
                          description: row.description,
                          status: row.status,
                          method: row.method,
                          recipient: row.recipient,
                          createdAt: row.created_at,
                          created_at: row.created_at,
                          updatedAt: row.updated_at,
                          updated_at: row.updated_at,
                          source: 'supabase'
                        };
                      });

                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: true, data: formatted }));
                    } else {
                      res.statusCode = 500;
                      res.end(JSON.stringify({ success: false, error: 'SUPABASE_SECRET_KEY belum diatur di .env' }));
                    }
                    return;
                  }

                  if (action === 'check_key_exists') {
                    if (adminSupabase) {
                      const keyString = (parsed.keyString || parsed.key_string || '').trim();
                      if (!keyString) {
                        res.statusCode = 200;
                        res.end(JSON.stringify({ success: true, exists: false }));
                        return;
                      }

                      const { data, error } = await adminSupabase
                        .from('api_keys')
                        .select('id, user_id, status, created_at')
                        .eq('key_string', keyString)
                        .maybeSingle();

                      if (error) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ success: false, error: error.message }));
                      } else {
                        res.statusCode = 200;
                        res.end(JSON.stringify({
                          success: true,
                          exists: !!data,
                          key: data || null
                        }));
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
                    let validUserId = data.user_id || data.userId;
                    const isUuidUser = validUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(validUserId);
                    if (!isUuidUser) {
                      const { data: sampleUser } = await adminSupabase
                        .from('users')
                        .select('id')
                        .neq('role', 'system_config')
                        .limit(1)
                        .maybeSingle();
                      if (sampleUser?.id) {
                        validUserId = sampleUser.id;
                      }
                    }

                    const txPayload = {
                      user_id: validUserId,
                      type: data.type || 'deposit',
                      amount: Number(data.amount || 0),
                      fee: Number(data.fee || 0),
                      title: data.title || 'Transaksi',
                      description: data.description || '',
                      status: data.status || 'pending',
                      method: data.method || '',
                      recipient: data.recipient || ''
                    };

                    const isUuidTxId = data.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id);
                    if (isUuidTxId) {
                      txPayload.id = data.id;
                    }
                    
                    if (data.created_at) {
                      txPayload.created_at = data.created_at;
                    }

                    const { data: inserted, error } = await adminSupabase
                      .from('transactions')
                      .insert(txPayload)
                      .select('*, users:user_id(id, name, email, phone, account_number, bank_name)')
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

                  if (action === 'update_nickname') {
                    if (adminSupabase) {
                      const targetUserId = parsed.userId || parsed.id;
                      const newNickname = (parsed.name || '').trim();
                      const clientNicknameUpdatedAt = parsed.nicknameUpdatedAt || new Date().toISOString();

                      if (!targetUserId || !newNickname) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ success: false, error: 'User ID dan nickname baru diperlukan.' }));
                        return;
                      }

                      if (newNickname.length < 3 || newNickname.length > 30) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ success: false, error: 'Nickname harus antara 3 sampai 30 karakter.' }));
                        return;
                      }

                      let lastChangeTime = null;
                      try {
                        const { data: authUserData, error: authUserErr } = await adminSupabase.auth.admin.getUserById(targetUserId);
                        if (!authUserErr && authUserData?.user?.user_metadata?.nickname_updated_at) {
                          lastChangeTime = new Date(authUserData.user.user_metadata.nickname_updated_at).getTime();
                        }
                      } catch (_) {}

                      if (lastChangeTime && !isNaN(lastChangeTime)) {
                        const cooldownMs = 30 * 24 * 60 * 60 * 1000;
                        const elapsed = Date.now() - lastChangeTime;
                        if (elapsed < cooldownMs) {
                          const remainingDays = Math.max(1, Math.ceil((cooldownMs - elapsed) / (1000 * 60 * 60 * 24)));
                          res.statusCode = 400;
                          res.end(JSON.stringify({
                            success: false,
                            error: `Nickname hanya dapat diganti sebulan sekali (30 hari). Sisa waktu: ${remainingDays} hari.`
                          }));
                          return;
                        }
                      }

                      const nowIso = clientNicknameUpdatedAt || new Date().toISOString();

                      const { data: updatedUser, error: updateErr } = await adminSupabase
                        .from('users')
                        .update({ name: newNickname, updated_at: nowIso })
                        .eq('id', targetUserId)
                        .select()
                        .single();

                      if (updateErr) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ success: false, error: updateErr.message }));
                        return;
                      }

                      try {
                        await adminSupabase.auth.admin.updateUserById(targetUserId, {
                          user_metadata: {
                            name: newNickname,
                            full_name: newNickname,
                            nickname_updated_at: nowIso
                          }
                        });
                      } catch (metaErr) {
                        console.warn('[vite-proxy] Update auth metadata warning:', metaErr.message);
                      }

                      res.statusCode = 200;
                      res.end(JSON.stringify({
                        success: true,
                        data: updatedUser,
                        name: newNickname,
                        nicknameUpdatedAt: nowIso
                      }));
                    } else {
                      res.statusCode = 500;
                      res.end(JSON.stringify({ success: false, error: 'SUPABASE_SECRET_KEY belum diatur di .env' }));
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

                  // Helper pengiriman email via Brevo REST API v3 atau Brevo SMTP Relay di Vite Dev Server
                  const sendEmailVite = async ({ currentEnv, to, subject, html, text }) => {
                    const clean = (val) => (val || '').replace(/["']/g, '').trim();

                    const brevoApiKey = clean(
                      currentEnv.BREVO_API_KEY ||
                      process.env.BREVO_API_KEY ||
                      currentEnv.VITE_BREVO_API_KEY ||
                      currentEnv.BREVO_KEY
                    );
                    const brevoUsername = clean(
                      currentEnv.BREVO_USERNAME ||
                      process.env.BREVO_USERNAME ||
                      currentEnv.BREVO_LOGIN
                    );
                    const brevoSenderEmail = clean(
                      currentEnv.BREVO_SENDER_EMAIL ||
                      process.env.BREVO_SENDER_EMAIL ||
                      currentEnv.SMTP_EMAIL ||
                      'no-reply@panenkunci.com'
                    );
                    const brevoSenderName = clean(currentEnv.BREVO_SENDER_NAME || 'Panen Kunci');

                    let brevoError = null;

                    // 1. Jika memiliki Brevo REST API key asli (dimulai dengan xkeysib-)
                    if (brevoApiKey && brevoApiKey.startsWith('xkeysib-')) {
                      try {
                        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                          method: 'POST',
                          headers: {
                            'accept': 'application/json',
                            'api-key': brevoApiKey,
                            'content-type': 'application/json'
                          },
                          body: JSON.stringify({
                            sender: {
                              name: brevoSenderName,
                              email: brevoSenderEmail
                            },
                            to: [{ email: to }],
                            subject: subject,
                            htmlContent: html,
                            ...(text ? { textContent: text } : {})
                          })
                        });

                        const data = await response.json();
                        if (response.ok) {
                          console.log('[ViteProxy] Email terkirim via Brevo REST API ke:', to, 'messageId:', data.messageId);
                          return { success: true, method: 'brevo_api', messageId: data.messageId };
                        } else {
                          brevoError = data?.message || JSON.stringify(data);
                          console.warn('[ViteProxy] Brevo API error response:', data);
                        }
                      } catch (apiErr) {
                        brevoError = apiErr.message;
                        console.warn('[ViteProxy] Brevo API fetch warning:', apiErr.message);
                      }
                    }

                    // 2. Brevo SMTP Relay
                    const isBrevoSmtp = Boolean(brevoUsername || (brevoApiKey && brevoApiKey.startsWith('xsmtpsib-')));

                    // Tolak konfigurasi legacy Gmail agar tidak memicu 535 Authentication failed
                    const isLegacyGmail = String(currentEnv.SMTP_HOST || process.env.SMTP_HOST || '').includes('gmail.com');
                    if (isLegacyGmail && !isBrevoSmtp) {
                      throw new Error('Konfigurasi Gmail lama dinonaktifkan. Tambahkan BREVO_USERNAME dan BREVO_API_KEY di file .env.');
                    }

                    const smtpHost = isBrevoSmtp
                      ? 'smtp-relay.brevo.com'
                      : clean(currentEnv.SMTP_HOST || process.env.SMTP_HOST || 'smtp-relay.brevo.com');

                    const smtpUser = isBrevoSmtp
                      ? (brevoUsername || clean(currentEnv.SMTP_EMAIL || process.env.SMTP_EMAIL))
                      : clean(currentEnv.SMTP_EMAIL || process.env.SMTP_EMAIL);

                    const smtpPassword = isBrevoSmtp
                      ? (brevoApiKey || clean(currentEnv.SMTP_PASSWORD || process.env.SMTP_PASSWORD))
                      : clean(currentEnv.SMTP_PASSWORD || process.env.SMTP_PASSWORD);

                    // Pada Brevo SMTP, prioritaskan port 2525 lalu 587
                    const defaultPort = isBrevoSmtp ? 2525 : 587;
                    const smtpPort = Number(currentEnv.SMTP_PORT || process.env.SMTP_PORT) || defaultPort;
                    const senderEmail = isBrevoSmtp ? brevoSenderEmail : smtpUser;

                    if (smtpUser && smtpPassword) {
                      const trySendSmtp = async (port, secure) => {
                        const transporter = nodemailer.createTransport({
                          host: smtpHost,
                          port: port,
                          secure: secure,
                          auth: { user: smtpUser, pass: smtpPassword },
                          connectionTimeout: 8000,
                          greetingTimeout: 8000,
                          socketTimeout: 8000
                        });

                        return await transporter.sendMail({
                          from: `"${brevoSenderName}" <${senderEmail}>`,
                          to: to,
                          subject: subject,
                          html: html,
                          ...(text ? { text } : {})
                        });
                      };

                      try {
                        const isPort465 = smtpPort === 465;
                        const info = await trySendSmtp(smtpPort, isPort465);
                        console.log(`[ViteProxy] Email terkirim via SMTP (port ${smtpPort}) ke:`, to, 'messageId:', info.messageId);
                        return { success: true, method: 'smtp', messageId: info.messageId };
                      } catch (smtpErr) {
                        console.warn(`[ViteProxy] Percobaan port ${smtpPort} gagal (${smtpErr.message}), mencoba port alternatif...`);

                        // Fallback 1: Port 587
                        if (smtpPort !== 587) {
                          try {
                            const info = await trySendSmtp(587, false);
                            console.log('[ViteProxy] Email berhasil terkirim via Brevo SMTP port 587 ke:', to, 'messageId:', info.messageId);
                            return { success: true, method: 'smtp', messageId: info.messageId };
                          } catch (_) {}
                        }

                        // Fallback 2: Port 2525
                        if (smtpPort !== 2525) {
                          try {
                            const info = await trySendSmtp(2525, false);
                            console.log('[ViteProxy] Email berhasil terkirim via Brevo SMTP port 2525 ke:', to, 'messageId:', info.messageId);
                            return { success: true, method: 'smtp', messageId: info.messageId };
                          } catch (_) {}
                        }

                        throw smtpErr;
                      }
                    }

                    throw new Error(brevoError ? `Brevo error: ${brevoError}` : 'Konfigurasi Brevo (BREVO_USERNAME & BREVO_API_KEY) belum diatur di .env.');
                  };

                  // Sinkronisasi Kredit API Key Langsung ke Kie.ai
                  if (action === 'sync_kie_credit') {
                    const apiKeyString = (parsed.apiKey || parsed.keyString || '').trim();
                    const targetKeyId = parsed.keyId || parsed.id;

                    if (!apiKeyString) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ success: false, error: 'API key string tidak boleh kosong' }));
                      return;
                    }

                    try {
                      const kieResponse = await fetch('https://api.kie.ai/api/v1/chat/credit', {
                        method: 'GET',
                        headers: {
                          'Authorization': `Bearer ${apiKeyString}`,
                          'Accept': 'application/json',
                          'Content-Type': 'application/json'
                        }
                      });

                      const resData = await kieResponse.json().catch(() => ({}));
                      const httpStatus = kieResponse.status;
                      const code = resData.code !== undefined ? resData.code : httpStatus;

                      if (code === 200) {
                        const creditVal = typeof resData.data === 'number' ? resData.data : (Number(resData.data) || 0);

                        if (targetKeyId && adminSupabase) {
                          await adminSupabase
                            .from('api_keys')
                            .update({
                              credits: creditVal,
                              updated_at: new Date().toISOString()
                            })
                            .eq('id', targetKeyId);
                        }

                        res.statusCode = 200;
                        res.end(JSON.stringify({
                          success: true,
                          isValidKey: true,
                          credit: creditVal,
                          message: resData.msg || 'Berhasil sinkronisasi kredit Kie.ai',
                          raw: resData
                        }));
                        return;
                      }

                      const isUnauthorized = code === 401 || httpStatus === 401;
                      const errorMsg = resData.msg || (isUnauthorized ? 'API key tidak valid atau tidak diizinkan oleh Kie.ai' : `Gagal memeriksa kredit (${httpStatus})`);

                      if (targetKeyId && isUnauthorized && adminSupabase) {
                        await adminSupabase
                          .from('api_keys')
                          .update({
                            status: 'invalid',
                            credits: 0,
                            error_message: errorMsg,
                            updated_at: new Date().toISOString()
                          })
                          .eq('id', targetKeyId);
                      }

                      res.statusCode = 200;
                      res.end(JSON.stringify({
                        success: false,
                        isValidKey: false,
                        credit: 0,
                        error: errorMsg,
                        code: code,
                        raw: resData
                      }));
                      return;
                    } catch (err) {
                      console.error('[ViteProxy] Error sync_kie_credit:', err);
                      res.statusCode = 500;
                      res.end(JSON.stringify({
                        success: false,
                        error: `Koneksi ke Kie.ai gagal: ${err.message}`
                      }));
                      return;
                    }
                  }

                  // Sinkronisasi Semua Kredit API Key ke Kie.ai (Batch)
                  if (action === 'sync_all_kie_credits') {
                    if (!adminSupabase) {
                      res.statusCode = 500;
                      res.end(JSON.stringify({ success: false, error: 'Database belum terkonfigurasi' }));
                      return;
                    }

                    try {
                      const { data: allKeys, error } = await adminSupabase
                        .from('api_keys')
                        .select('id, key_string, status, credits')
                        .order('created_at', { ascending: false });

                      if (error) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ success: false, error: error.message }));
                        return;
                      }

                      const keysToSync = (allKeys || []).filter(k => k.key_string && k.key_string.trim());
                      const results = [];

                      for (const item of keysToSync) {
                        try {
                          const trimmed = item.key_string.trim();
                          const kieRes = await fetch('https://api.kie.ai/api/v1/chat/credit', {
                            method: 'GET',
                            headers: {
                              'Authorization': `Bearer ${trimmed}`,
                              'Accept': 'application/json',
                              'Content-Type': 'application/json'
                            }
                          });

                          const resJson = await kieRes.json().catch(() => ({}));
                          const code = resJson.code !== undefined ? resJson.code : kieRes.status;

                          if (code === 200) {
                            const creditVal = typeof resJson.data === 'number' ? resJson.data : (Number(resJson.data) || 0);
                            await adminSupabase
                              .from('api_keys')
                              .update({
                                credits: creditVal,
                                updated_at: new Date().toISOString()
                              })
                              .eq('id', item.id);

                            results.push({
                              id: item.id,
                              success: true,
                              credit: creditVal,
                              message: 'Sukses'
                            });
                          } else {
                            const isUnauth = code === 401 || kieRes.status === 401;
                            if (isUnauth) {
                              await adminSupabase
                                .from('api_keys')
                                .update({
                                  status: 'invalid',
                                  credits: 0,
                                  error_message: resJson.msg || 'API Key Tidak Sah (Kie.ai 401)',
                                  updated_at: new Date().toISOString()
                                })
                                .eq('id', item.id);
                            }
                            results.push({
                              id: item.id,
                              success: false,
                              credit: 0,
                              code: code,
                              message: resJson.msg || 'Gagal sinkron'
                            });
                          }
                        } catch (itemErr) {
                          results.push({
                            id: item.id,
                            success: false,
                            message: itemErr.message
                          });
                        }
                      }

                      const successCount = results.filter(r => r.success).length;
                      res.statusCode = 200;
                      res.end(JSON.stringify({
                        success: true,
                        total: keysToSync.length,
                        updatedCount: successCount,
                        results
                      }));
                      return;
                    } catch (err) {
                      console.error('[ViteProxy] Error sync_all_kie_credits:', err);
                      res.statusCode = 500;
                      res.end(JSON.stringify({ success: false, error: err.message }));
                      return;
                    }
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
                        const actionLink = linkData?.properties?.action_link;
                        const currentEnv = loadEnv(server.config.mode, process.cwd(), '');

                        if (actionLink) {
                          try {
                            await sendEmailVite({
                              currentEnv,
                              to: data.email,
                              subject: 'Pemulihan Kata Sandi Akun Panen Kunci',
                              html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
                                <h2 style="color: #4F46E5;">Atur Ulang Kata Sandi</h2>
                                <p>Halo,</p>
                                <p>Ini adalah email pemulihan akun Panen Kunci Anda. Klik tombol di bawah ini untuk membuat kata sandi baru Anda:</p>
                                <div style="text-align: center; margin: 30px 0;">
                                  <a href="${actionLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Atur Ulang Kata Sandi</a>
                                </div>
                                <p style="color: #666; font-size: 12px;">Atau salin dan tempel tautan berikut ke browser Anda:<br><a href="${actionLink}">${actionLink}</a></p>
                              </div>`
                            });

                            res.statusCode = 200;
                            res.end(JSON.stringify({
                              success: true,
                              emailSent: true,
                              message: 'Email pemulihan kata sandi berhasil dikirimkan.'
                            }));
                            return;
                          } catch (mailErr) {
                            console.error('[ViteProxy] Gagal mengirim email reset password via Brevo/SMTP:', mailErr);
                            res.statusCode = 400;
                            res.end(JSON.stringify({
                              success: false,
                              error: 'Gagal mengirim email: ' + (mailErr.message || 'Cek kembali konfigurasi Brevo/SMTP.')
                            }));
                            return;
                          }
                        }

                        res.statusCode = 400;
                        res.end(JSON.stringify({
                          success: false,
                          error: 'Sistem email belum dikonfigurasi di file .env lokal Anda.'
                        }));
                        return;
                      }
                    } else {
                      res.statusCode = 500;
                      res.end(JSON.stringify({ success: false, error: 'SUPABASE_SECRET_KEY belum diatur di .env' }));
                    }
                    return;
                  }

                  if (action === 'send_register_otp') {
                    const targetEmail = (data?.email || parsed.email || '').toLowerCase().trim();
                    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ success: false, error: 'Format alamat email tidak valid.' }));
                      return;
                    }

                    // 1. Cek apakah email sudah terdaftar di Supabase
                    if (adminSupabase) {
                      try {
                        const { data: existingUser } = await adminSupabase
                          .from('users')
                          .select('id')
                          .eq('email', targetEmail)
                          .maybeSingle();

                        if (existingUser) {
                          res.statusCode = 400;
                          res.end(JSON.stringify({
                            success: false,
                            error: 'Alamat email ini sudah terdaftar. Silakan langsung masuk ke akun Anda.'
                          }));
                          return;
                        }
                      } catch (dbErr) {
                        console.warn('[ViteProxy] Cek email users note:', dbErr.message);
                      }
                    }

                    // 2. Buat kode OTP 6 digit dan token HMAC
                    const otp = String(crypto.randomInt(100000, 999999));
                    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 menit
                    const otpSecret = SUPABASE_SECRET_KEY || 'panenkunci-otp-secret-key-2026';
                    const signature = crypto.createHmac('sha256', otpSecret)
                      .update(`${targetEmail}:${otp}:${expiresAt}`)
                      .digest('hex');
                    const token = `${expiresAt}.${signature}`;

                    // 3. Kirim via Brevo / SMTP Relay
                    const currentEnv = loadEnv(server.config.mode, process.cwd(), '');
                    const hasBrevo = Boolean(currentEnv.BREVO_API_KEY || currentEnv.BREVO_USERNAME);
                    const hasSmtp = Boolean(currentEnv.SMTP_EMAIL && currentEnv.SMTP_PASSWORD);

                    if (!hasBrevo && !hasSmtp) {
                      res.statusCode = 500;
                      res.end(JSON.stringify({
                        success: false,
                        error: 'Konfigurasi Brevo (BREVO_USERNAME & BREVO_API_KEY) belum diatur di file .env.'
                      }));
                      return;
                    }

                    try {
                      await sendEmailVite({
                        currentEnv,
                        to: targetEmail,
                        subject: `[Panen Kunci] Kode OTP Verifikasi Pendaftaran: ${otp}`,
                        html: `
                          <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 28px 24px; text-align: center;">
                              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Panen Kunci</h1>
                              <p style="color: #e0e7ff; margin: 6px 0 0 0; font-size: 13px;">Platform Jual Beli & Konversi API Key</p>
                            </div>
                            <div style="padding: 28px 24px;">
                              <h2 style="color: #0f172a; margin: 0 0 10px 0; font-size: 18px; font-weight: 600;">Verifikasi Alamat Email Anda</h2>
                              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                                Halo,<br>
                                Terima kasih telah mendaftar di <strong>Panen Kunci</strong>. Gunakan kode OTP 6 digit berikut untuk memverifikasi akun email Anda:
                              </p>
                              <div style="background-color: #f8fafc; border: 2px dashed #94a3b8; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 20px;">
                                <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1e3a8a; display: inline-block;">${otp}</span>
                              </div>
                              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
                                <p style="color: #1e40af; font-size: 12px; margin: 0; line-height: 1.5;">
                                  ⏰ <strong>Masa berlaku:</strong> Kode OTP ini hanya berlaku selama <strong>10 menit</strong>. Jangan berikan kode ini kepada siapa pun demi keamanan akun Anda.
                                </p>
                              </div>
                              <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0;">
                                Jika Anda tidak meminta kode verifikasi ini, silakan abaikan email ini dengan aman.
                              </p>
                            </div>
                            <div style="background-color: #f8fafc; padding: 14px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                              <p style="color: #64748b; font-size: 11px; margin: 0;">
                                &copy; 2026 Panen Kunci. Hak Cipta Dilindungi.
                              </p>
                            </div>
                          </div>
                        `
                      });

                      res.statusCode = 200;
                      res.end(JSON.stringify({
                        success: true,
                        token,
                        expiresAt,
                        message: `Kode OTP berhasil dikirimkan ke ${targetEmail}.`
                      }));
                      return;
                    } catch (mailErr) {
                      console.error('[ViteProxy] Gagal mengirim OTP email via Brevo/SMTP:', mailErr);
                      console.warn('[ViteProxy] SMTP/Brevo lokal terhalang atau belum tervalidasi:', mailErr.message);
                      console.log('\n==========================================');
                      console.log('🔑 [PANEN KUNCI LOCAL DEV OTP]:', otp);
                      console.log('📧 Untuk email:', targetEmail);
                      console.log('==========================================\n');

                      // Fallback dev lokal agar pengembang tetap dapat mengetes alur OTP secara mulus jika ISP/koneksi bermasalah
                      res.statusCode = 200;
                      res.end(JSON.stringify({
                        success: true,
                        token,
                        expiresAt,
                        debugOtp: otp,
                        isLocalSimulated: true,
                        message: `Kode OTP dikirim! (Mode dev: ${otp})`
                      }));
                      return;
                    }
                  }

                  if (action === 'verify_register_otp') {
                    const targetEmail = (data?.email || parsed.email || '').toLowerCase().trim();
                    const inputOtp = (data?.otp || parsed.otp || '').trim();
                    const token = (data?.token || parsed.token || '').trim();

                    if (!targetEmail || !inputOtp || !token) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({
                        success: false,
                        error: 'Email, kode OTP, dan token verifikasi wajib disertakan.'
                      }));
                      return;
                    }

                    const [expiresAtStr, sig] = token.split('.');
                    const expiresAt = Number(expiresAtStr);

                    if (!expiresAt || !sig || isNaN(expiresAt)) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({
                        success: false,
                        error: 'Token verifikasi OTP tidak valid.'
                      }));
                      return;
                    }

                    if (Date.now() > expiresAt) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({
                        success: false,
                        error: 'Kode OTP telah kedaluwarsa. Silakan minta kode OTP baru.'
                      }));
                      return;
                    }

                    const otpSecret = SUPABASE_SECRET_KEY || 'panenkunci-otp-secret-key-2026';
                    const expectedSig = crypto.createHmac('sha256', otpSecret)
                      .update(`${targetEmail}:${inputOtp}:${expiresAtStr}`)
                      .digest('hex');

                    const sigBuf = Buffer.from(sig, 'utf8');
                    const expectedBuf = Buffer.from(expectedSig, 'utf8');

                    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({
                        success: false,
                        error: 'Kode OTP yang Anda masukkan salah. Silakan periksa kembali.'
                      }));
                      return;
                    }

                    // Buat verifiedToken untuk dikirim saat registrasi akun
                    const verifiedSig = crypto.createHmac('sha256', otpSecret)
                      .update(`${targetEmail}:VERIFIED:${expiresAtStr}`)
                      .digest('hex');
                    const verifiedToken = `${expiresAtStr}.${verifiedSig}`;

                    res.statusCode = 200;
                    res.end(JSON.stringify({
                      success: true,
                      verified: true,
                      verifiedToken,
                      message: 'Email berhasil diverifikasi!'
                    }));
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
