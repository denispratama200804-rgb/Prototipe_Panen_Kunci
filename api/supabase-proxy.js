import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bmuthjyibkrcqyygjcxe.supabase.co';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

const adminSupabase = SUPABASE_SECRET_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  : null;

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

      const cleanUsers = (users || []).filter(u => u.role !== 'system_config' && !u.email?.includes('system_config'));
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
