import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bmuthjyibkrcqyygjcxe.supabase.co';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

const adminSupabase = SUPABASE_SECRET_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  : null;

const CHAT_STORE_ID = '00000000-0000-0000-0000-000000000002';

async function getLiveChatsFromSupabase(targetUserId = null) {
  if (!adminSupabase) return [];

  // 1. Coba baca dari tabel live_chat_messages jika ada
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

  // 2. Fallback: baca dari central store di users table (CHAT_STORE_ID)
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

  // 1. Coba simpan ke tabel live_chat_messages jika ada
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
    await adminSupabase
      .from('live_chat_messages')
      .insert(rowPayload);
  } catch (_) {}

  // 2. Selalu simpan/sync ke central store di users table (CHAT_STORE_ID) agar fallback selalu up-to-date
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
      await adminSupabase
        .from('users')
        .upsert({
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

  // 1. Coba update di tabel live_chat_messages
  try {
    const updateObj = reader === 'admin' ? { read_by_admin: true } : { read_by_user: true };
    await adminSupabase
      .from('live_chat_messages')
      .update(updateObj)
      .eq('user_id', userId);
  } catch (_) {}

  // 2. Update di central store
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
          await adminSupabase
            .from('users')
            .upsert({
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

export default async function handler(req, res) {
  // Pastikan header CORS dan Content-Type terpasang
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Tangani permintaan GET (Sinkronisasi cepat daftar seluruh pengguna untuk Admin Panel)
  if (req.method === 'GET') {
    if (!adminSupabase) {
      return res.status(500).json({
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasikan di Environment Variables server Vercel.'
      });
    }

    try {
      const url = req.url || '';
      if (url.includes('type=live_chats')) {
        let targetUserId = null;
        try {
          const parsedUrl = new URL(url, 'http://localhost');
          targetUserId = parsedUrl.searchParams.get('userId');
        } catch (_) {}
        const chats = await getLiveChatsFromSupabase(targetUserId);
        return res.status(200).json({ success: true, data: chats });
      }

      if (url.includes('type=api_keys')) {
        const { data: rawKeys, error } = await adminSupabase
          .from('api_keys')
          .select('*, users:user_id(id, name, email)')
          .order('created_at', { ascending: false });

        if (error) {
          return res.status(400).json({ success: false, error: error.message });
        }

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

        return res.status(200).json({ success: true, data: keys });
      }

      if (url.includes('type=config')) {
        const { data: cfgRow, error } = await adminSupabase
          .from('users')
          .select('avatar')
          .eq('id', '00000000-0000-0000-0000-000000000001')
          .maybeSingle();

        if (error) {
          return res.status(400).json({ success: false, error: error.message });
        }

        let config = null;
        if (cfgRow && cfgRow.avatar) {
          try {
            config = typeof cfgRow.avatar === 'string' ? JSON.parse(cfgRow.avatar) : cfgRow.avatar;
          } catch (_) {}
        }

        return res.status(200).json({ success: true, config });
      }

      const { data: users, error } = await adminSupabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      const cleanUsers = (users || []).filter(u => u.role !== 'system_config' && !u.email?.includes('system_config') && !u.email?.includes('panenkunci.internal'));
      return res.status(200).json({ success: true, data: cleanUsers });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { action, table, data, id } = body;

    if (!adminSupabase) {
      return res.status(500).json({
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasikan di Environment Variables server Vercel.'
      });
    }

    // 1a. Live Chat Real-Time Handlers
    if (action === 'get_live_chats') {
      const targetUserId = body.userId || null;
      const chats = await getLiveChatsFromSupabase(targetUserId);
      return res.status(200).json({ success: true, data: chats });
    }

    if (action === 'send_live_chat' && body.message) {
      const saved = await saveLiveChatToSupabase(body.message);
      return res.status(200).json({ success: true, data: saved });
    }

    if (action === 'mark_chat_read' && body.userId) {
      await markLiveChatsReadInSupabase(body.userId, body.reader || 'user');
      return res.status(200).json({ success: true });
    }

    // 1b. Konfigurasi Sistem Terpusat (Batas penarikan, tarif per key, biaya admin)
    if (action === 'get_system_config') {
      const { data: cfgRow, error } = await adminSupabase
        .from('users')
        .select('avatar')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .maybeSingle();

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      let config = null;
      if (cfgRow && cfgRow.avatar) {
        try {
          config = typeof cfgRow.avatar === 'string' ? JSON.parse(cfgRow.avatar) : cfgRow.avatar;
        } catch (_) {}
      }

      return res.status(200).json({ success: true, config });
    }

    if (action === 'save_system_config' && data) {
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
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.status(200).json({ success: true, data: saved });
    }

    // 2. Ambil data seluruh pengguna (Kelola Pengguna Admin Panel)
    if (action === 'get_users' || (action === 'select' && table === 'users')) {
      const { data: users, error } = await adminSupabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      const cleanUsers = (users || []).filter(u => u.role !== 'system_config' && !u.email?.includes('system_config'));
      return res.status(200).json({ success: true, data: cleanUsers });
    }

    // 2b. Ambil data seluruh API Key (Gudang API Key Admin Panel) dengan relasi pengguna
    if (action === 'get_api_keys' || (action === 'select' && table === 'api_keys')) {
      const { data: rawKeys, error } = await adminSupabase
        .from('api_keys')
        .select('*, users:user_id(id, name, email)')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

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

      return res.status(200).json({ success: true, data: keys });
    }

    // 2c. Ambil data transaksi (Riwayat transaksi user & admin)
    if (action === 'get_transactions' || (action === 'select' && table === 'transactions')) {
      let query = adminSupabase
        .from('transactions')
        .select('*, users:user_id(id, name, email, phone, account_number, bank_name)')
        .order('created_at', { ascending: false });

      const targetUserId = body.userId || body.user_id;
      if (targetUserId) {
        query = query.eq('user_id', targetUserId);
      }

      let { data: txs, error } = await query;

      if (error) {
        console.warn('[supabase-proxy] Join error on transactions, fallback to select *:', error.message);
        const fallback = await adminSupabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false });
        if (fallback.error) {
          return res.status(400).json({ success: false, error: fallback.error.message });
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

      return res.status(200).json({ success: true, data: formatted });
    }

    // 2d. Cek apakah keyString sudah pernah disetor (Global Duplicate Check bypass RLS)
    if (action === 'check_key_exists') {
      const keyString = (body.keyString || body.key_string || '').trim();
      if (!keyString) {
        return res.status(200).json({ success: true, exists: false });
      }

      const { data, error } = await adminSupabase
        .from('api_keys')
        .select('id, user_id, status, created_at')
        .eq('key_string', keyString)
        .maybeSingle();

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.status(200).json({
        success: true,
        exists: !!data,
        key: data || null
      });
    }

    // 3. Pembuatan tautan pemulihan kata sandi (Recovery Link)
    if (action === 'generate_recovery_link' && data?.email) {
      const host = req.headers['x-forwarded-host'] || req.headers.host || '';
      const proto = req.headers['x-forwarded-proto'] || 'https';
      const dynamicOrigin = host ? `${proto}://${host}` : 'https://prototipe-panen-kunci.vercel.app';
      const targetRedirect = data.redirectTo || `${dynamicOrigin}/#/reset-password`;

      const { data: linkData, error } = await adminSupabase.auth.admin.generateLink({
        type: 'recovery',
        email: data.email,
        options: {
          redirectTo: targetRedirect
        }
      });

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.status(200).json({
        success: true,
        action_link: linkData?.properties?.action_link
      });
    }

    // 4. Insert record pengguna / API Key / Transaksi (bypass RLS)
    if (action === 'insert' && table === 'users' && data) {
      const { data: inserted, error } = await adminSupabase
        .from('users')
        .insert(data)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res.status(200).json({ success: true, data: inserted });
    }

    if (action === 'insert' && table === 'api_keys' && data) {
      let insertPayload = { ...data };
      let { data: inserted, error } = await adminSupabase
        .from('api_keys')
        .insert(insertPayload)
        .select('*, users:user_id(id, name, email)')
        .single();

      // Kompatibilitas jika check constraint di Supabase belum dimigrasi (hanya izinkan valid/invalid)
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
        return res.status(400).json({ success: false, error: error.message });
      }
      return res.status(200).json({ success: true, data: inserted });
    }

    if (action === 'insert' && table === 'transactions' && data) {
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

      const { data: inserted, error } = await adminSupabase
        .from('transactions')
        .insert(txPayload)
        .select('*, users:user_id(id, name, email, phone, account_number, bank_name)')
        .single();

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res.status(200).json({ success: true, data: inserted });
    }

    // 5. Update record pengguna / API Key / Transaksi (bypass RLS)
    if (action === 'update' && table === 'users' && id) {
      const { data: updated, error } = await adminSupabase
        .from('users')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res.status(200).json({ success: true, data: updated });
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
        return res.status(400).json({ success: false, error: error.message });
      }
      return res.status(200).json({ success: true, data: updated });
    }

    if (action === 'update' && table === 'transactions' && id) {
      const { data: updated, error } = await adminSupabase
        .from('transactions')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res.status(200).json({ success: true, data: updated });
    }

    // 6. Hapus record pengguna / API Key / Transaksi (bypass RLS)
    if (action === 'delete' && table === 'users' && id) {
      const { error } = await adminSupabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res.status(200).json({ success: true });
    }

    if (action === 'delete' && table === 'api_keys' && id) {
      const { error } = await adminSupabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res.status(200).json({ success: true });
    }

    if (action === 'delete' && table === 'transactions' && id) {
      const { error } = await adminSupabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ success: false, error: 'Aksi tidak didukung' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
