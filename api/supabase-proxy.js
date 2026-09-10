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

      const { data: users, error } = await adminSupabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.status(200).json({ success: true, data: users });
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

    // 2. Ambil data seluruh pengguna (Kelola Pengguna Admin Panel)
    if (action === 'get_users' || (action === 'select' && table === 'users')) {
      const { data: users, error } = await adminSupabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.status(200).json({ success: true, data: users });
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

    // 4. Insert record pengguna / API Key (bypass RLS)
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

    // 5. Update record pengguna / API Key (bypass RLS)
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

    // 6. Hapus record pengguna / API Key (bypass RLS)
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

    return res.status(400).json({ success: false, error: 'Aksi tidak didukung' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
