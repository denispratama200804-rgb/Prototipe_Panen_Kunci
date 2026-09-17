import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import crypto from 'node:crypto';
import { uploadBase64ToR2 } from './r2-uploader.js';

// Kunci Supabase Role Service yang digunakan untuk operasi admin yang by-pass RLS (PENTING!)
// Kunci ini TIDAK BOLEH dieskspos ke klien frontend!
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Konfigurasi Pengiriman Email (Mendukung Brevo REST API v3 & Brevo SMTP Relay)
async function sendEmailMessage({ to, subject, html, text }) {
  const clean = (val) => (val || '').replace(/["']/g, '').trim();

  const brevoApiKey = clean(
    process.env.BREVO_API_KEY ||
    process.env.VITE_BREVO_API_KEY ||
    process.env.NEXT_PUBLIC_BREVO_API_KEY ||
    process.env.BREVO_KEY
  );
  const brevoUsername = clean(
    process.env.BREVO_USERNAME ||
    process.env.BREVO_LOGIN
  );
  const brevoSenderEmail = clean(
    process.env.BREVO_SENDER_EMAIL ||
    process.env.SMTP_EMAIL ||
    'no-reply@panenkunci.com'
  );
  const brevoSenderName = clean(process.env.BREVO_SENDER_NAME || 'Panen Kunci');

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
        console.log('[EmailService] Berhasil terkirim via Brevo REST API ke:', to, 'messageId:', data.messageId);
        return { success: true, method: 'brevo_api', messageId: data.messageId };
      } else {
        brevoError = data?.message || JSON.stringify(data);
        console.error('[EmailService] Brevo API error response:', data);
      }
    } catch (apiErr) {
      brevoError = apiErr.message;
      console.error('[EmailService] Gagal fetch ke Brevo API:', apiErr.message);
    }
  }

  // 2. Brevo SMTP Relay
  const isBrevoSmtp = Boolean(brevoUsername || (brevoApiKey && brevoApiKey.startsWith('xsmtpsib-')));

  // Tolak konfigurasi legacy Gmail agar tidak memicu 535 Authentication failed
  const isLegacyGmail = String(process.env.SMTP_HOST || '').includes('gmail.com');
  if (isLegacyGmail && !isBrevoSmtp) {
    throw new Error('Konfigurasi Gmail lama dinonaktifkan. Tambahkan BREVO_USERNAME dan BREVO_API_KEY di Environment Variables Vercel.');
  }

  const smtpHost = isBrevoSmtp
    ? 'smtp-relay.brevo.com'
    : clean(process.env.SMTP_HOST || 'smtp-relay.brevo.com');

  const smtpUser = isBrevoSmtp
    ? (brevoUsername || clean(process.env.SMTP_EMAIL))
    : clean(process.env.SMTP_EMAIL);

  const smtpPassword = isBrevoSmtp
    ? (brevoApiKey || clean(process.env.SMTP_PASSWORD))
    : clean(process.env.SMTP_PASSWORD);

  // Pada Brevo SMTP, prioritaskan port 587 dan port 2525
  const defaultPort = 587;
  const smtpPort = Number(process.env.SMTP_PORT) || defaultPort;
  const senderEmail = isBrevoSmtp ? brevoSenderEmail : smtpUser;

  if (smtpUser && smtpPassword) {
    const trySendSmtp = async (port, secure) => {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: port,
        secure: secure,
        auth: {
          user: smtpUser,
          pass: smtpPassword
        },
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
      console.log(`[EmailService] Berhasil terkirim via SMTP (port ${smtpPort}) ke:`, to, 'messageId:', info.messageId);
      return { success: true, method: 'smtp', messageId: info.messageId };
    } catch (smtpErr) {
      console.warn(`[EmailService] Percobaan port ${smtpPort} gagal (${smtpErr.message}), mencoba port alternatif...`);

      // Fallback 1: Port 587
      if (smtpPort !== 587) {
        try {
          const info = await trySendSmtp(587, false);
          console.log('[EmailService] Berhasil terkirim via Brevo SMTP port 587 ke:', to, 'messageId:', info.messageId);
          return { success: true, method: 'smtp', messageId: info.messageId };
        } catch (_) {}
      }

      // Fallback 2: Port 2525
      if (smtpPort !== 2525) {
        try {
          const info = await trySendSmtp(2525, false);
          console.log('[EmailService] Berhasil terkirim via Brevo SMTP port 2525 ke:', to, 'messageId:', info.messageId);
          return { success: true, method: 'smtp', messageId: info.messageId };
        } catch (_) {}
      }

      throw smtpErr;
    }
  }

  throw new Error(brevoError ? `Brevo error: ${brevoError}` : 'Sistem email belum dikonfigurasi. Harap tambahkan BREVO_USERNAME & BREVO_API_KEY di .env.');
}

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

// Algoritma deterministik kode referral unik (PK-XXXXXX)
function generateReferralCode(identifier) {
  if (!identifier) return 'PK-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const str = String(identifier).trim().toLowerCase();
  let h1 = 0x811c9dc5;
  let h2 = 5381;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = ((h2 << 5) + h2) ^ c;
  }
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  let n1 = Math.abs(h1);
  let n2 = Math.abs(h2);
  for (let i = 0; i < 3; i++) {
    code += chars[n1 % chars.length];
    n1 = Math.floor(n1 / chars.length);
  }
  for (let i = 0; i < 3; i++) {
    code += chars[n2 % chars.length];
    n2 = Math.floor(n2 / chars.length);
  }
  return `PK-${code}`;
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
        const [chats, onlineUserIds] = await Promise.all([
          getLiveChatsFromSupabase(targetUserId),
          getOnlineUserIdsFromSupabase()
        ]);
        return res.status(200).json({ success: true, data: chats, onlineUserIds });
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

    // 0. Cloudflare R2 Upload Handler (Foto profil & bukti pembayaran)
    if (action === 'upload_r2') {
      const { base64Data, folder, fileName } = body;
      if (!base64Data) {
        return res.status(400).json({ success: false, error: 'Data gambar (base64Data) diperlukan' });
      }
      try {
        const result = await uploadBase64ToR2({
          base64Data,
          folder: folder || 'uploads',
          fileName: fileName || null
        });
        return res.status(200).json({ success: true, ...result });
      } catch (uploadErr) {
        console.error('[supabase-proxy] R2 upload error:', uploadErr);
        return res.status(500).json({ success: false, error: uploadErr.message || 'Gagal mengunggah file ke Cloudflare R2' });
      }
    }

    if (!adminSupabase) {
      return res.status(500).json({
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasikan di Environment Variables server Vercel.'
      });
    }

    // 1a. Live Chat Real-Time Handlers
    if (action === 'get_live_chats') {
      const targetUserId = body.userId || null;
      const [chats, onlineUserIds] = await Promise.all([
        getLiveChatsFromSupabase(targetUserId),
        getOnlineUserIdsFromSupabase()
      ]);
      return res.status(200).json({ success: true, data: chats, onlineUserIds });
    }

    if (action === 'user_heartbeat' && body.userId) {
      try {
        await adminSupabase
          .from('users')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', body.userId);
      } catch (_) {}
      return res.status(200).json({ success: true });
    }

    if (action === 'user_offline' && body.userId) {
      try {
        await adminSupabase
          .from('users')
          .update({ updated_at: new Date(0).toISOString() })
          .eq('id', body.userId);
      } catch (_) {}
      return res.status(200).json({ success: true });
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

    // 2d-2. Validasi & Cek Keberadaan Kode Referral (Bypass RLS)
    if (action === 'check_referral_code') {
      const code = (body.referralCode || body.referral_code || data?.referralCode || data?.referral_code || '').trim().toUpperCase();
      if (!code) {
        return res.status(200).json({ success: true, exists: false, message: 'Kode referral kosong' });
      }

      // 1. Coba cek langsung via kolom referral_code jika sudah ada di database
      let directFound = null;
      try {
        const { data: dbUser, error: dbErr } = await adminSupabase
          .from('users')
          .select('id, name, email, referral_code')
          .ilike('referral_code', code)
          .maybeSingle();
        if (!dbErr && dbUser && dbUser.id) {
          directFound = dbUser;
        }
      } catch (_) {}

      if (directFound) {
        return res.status(200).json({
          success: true,
          exists: true,
          referrer: {
            id: directFound.id,
            name: directFound.name || 'Pengguna',
            email: directFound.email || '',
            referralCode: code
          }
        });
      }

      // 2. Cocokkan via generator deterministik ke seluruh pengguna di Supabase
      try {
        const { data: users, error: usersErr } = await adminSupabase
          .from('users')
          .select('id, name, email, role');

        if (!usersErr && Array.isArray(users)) {
          const cleanUsers = users.filter(u => u.role !== 'system_config' && !u.email?.includes('system_config') && !u.email?.includes('panenkunci.internal'));
          const found = cleanUsers.find(u => {
            if (u.referral_code && u.referral_code.toUpperCase() === code) return true;
            const codeById = generateReferralCode(u.id);
            const codeByEmail = generateReferralCode(u.email);
            const codeByName = generateReferralCode(u.name);
            return codeById === code || codeByEmail === code || codeByName === code;
          });

          if (found) {
            // Jika kolom referral_code di database sudah tersedia, sinkronkan nilai ini
            try {
              await adminSupabase.from('users').update({ referral_code: code }).eq('id', found.id);
            } catch (_) {}

            return res.status(200).json({
              success: true,
              exists: true,
              referrer: {
                id: found.id,
                name: found.name || 'Pengguna',
                email: found.email || '',
                referralCode: code
              }
            });
          }
        }
      } catch (err) {
        console.warn('[supabase-proxy] check_referral_code error:', err.message);
      }

      return res.status(200).json({ success: true, exists: false, message: 'Kode referral tidak ditemukan atau tidak valid' });
    }

    // 2d-3. Menautkan Kode Referral Pengundang ke Akun Pengguna (Bypass RLS)
    if (action === 'bind_referral') {
      const targetUserId = body.userId || body.user_id || data?.userId || data?.user_id;
      const code = (body.referralCode || body.referral_code || data?.referralCode || data?.referral_code || '').trim().toUpperCase();

      if (!targetUserId || !code) {
        return res.status(400).json({ success: false, error: 'User ID dan Kode Referral diperlukan.' });
      }

      // 1. Coba simpan ke kolom referred_by di tabel users jika ada
      try {
        await adminSupabase
          .from('users')
          .update({ referred_by: code, updated_at: new Date().toISOString() })
          .eq('id', targetUserId);
      } catch (_) {}

      // 2. Simpan secara permanen ke Auth user_metadata
      try {
        await adminSupabase.auth.admin.updateUserById(targetUserId, {
          user_metadata: { referred_by: code }
        });
      } catch (authErr) {
        console.warn('[supabase-proxy] update user_metadata referred_by warning:', authErr.message);
      }

      return res.status(200).json({ success: true, message: `Berhasil menautkan ke kode referral ${code}` });
    }

    // 2e. Sinkronisasi kuota kredit API Key langsung ke server Kie.ai (https://api.kie.ai/api/v1/chat/credit)
    if (action === 'sync_kie_credit') {
      const keyString = (body.apiKey || body.keyString || body.key_string || body.key || data?.apiKey || data?.keyString || data?.key_string || data?.key || '').trim();
      const keyId = body.keyId || body.id || data?.keyId || data?.id;

      if (!keyString) {
        return res.status(400).json({ success: false, error: 'Parameter apiKey / keyString wajib disertakan.' });
      }

      try {
        const kieRes = await fetch('https://api.kie.ai/api/v1/chat/credit', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${keyString}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        const kieJson = await kieRes.json().catch(() => null);

        if (!kieRes.ok || !kieJson || kieJson.code !== 200) {
          const errMsg = kieJson?.msg || kieJson?.message || `Gagal memeriksa kredit di Kie.ai (Status ${kieRes.status})`;
          const isAuthError = kieRes.status === 401 || (kieJson && (kieJson.code === 401 || String(kieJson.msg).toLowerCase().includes('unauthorized')));

          return res.status(200).json({
            success: false,
            isValidKey: false,
            code: kieJson?.code || kieRes.status,
            credit: 0,
            error: isAuthError ? 'API Key tidak valid atau otentikasi gagal di Kie.ai.' : errMsg,
            raw: kieJson
          });
        }

        const creditAmount = typeof kieJson.data === 'number' ? kieJson.data : (Number(kieJson.data) || 0);

        // Jika ada keyId dan adminSupabase aktif, perbarui kolom credits di Supabase
        if (keyId && adminSupabase) {
          try {
            await adminSupabase
              .from('api_keys')
              .update({ credits: creditAmount })
              .eq('id', keyId);
          } catch (dbErr) {
            console.warn('[SupabaseProxy] Gagal update credits di db:', dbErr.message);
          }
        }

        return res.status(200).json({
          success: true,
          isValidKey: true,
          credit: creditAmount,
          message: `Kredit Kie.ai berhasil disinkronkan: ${creditAmount} cr`,
          raw: kieJson
        });
      } catch (netErr) {
        console.error('[SupabaseProxy] Gagal fetch ke Kie.ai:', netErr.message);
        return res.status(500).json({
          success: false,
          error: 'Gagal terhubung ke server Kie.ai: ' + netErr.message
        });
      }
    }

    // 2f. Batch Sync: Sinkronisasi seluruh kredit API Key sekaligus
    if (action === 'sync_all_kie_credits') {
      let targetKeys = Array.isArray(body.keys) ? body.keys : [];

      if (targetKeys.length === 0 && adminSupabase) {
        try {
          const { data: dbKeys } = await adminSupabase
            .from('api_keys')
            .select('id, key_string, status, credits');
          if (Array.isArray(dbKeys)) {
            targetKeys = dbKeys.map(k => ({ id: k.id, keyString: k.key_string, status: k.status }));
          }
        } catch (_) {}
      }

      if (targetKeys.length === 0) {
        return res.status(200).json({ success: true, updatedCount: 0, results: [] });
      }

      const results = [];
      for (const item of targetKeys) {
        const keyString = (item.keyString || item.key_string || '').trim();
        const keyId = item.id;
        if (!keyString) continue;

        try {
          const kieRes = await fetch('https://api.kie.ai/api/v1/chat/credit', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${keyString}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
          const kieJson = await kieRes.json().catch(() => null);

          if (kieRes.ok && kieJson && kieJson.code === 200) {
            const creditAmount = typeof kieJson.data === 'number' ? kieJson.data : (Number(kieJson.data) || 0);
            if (keyId && adminSupabase) {
              await adminSupabase.from('api_keys').update({ credits: creditAmount }).eq('id', keyId);
            }
            results.push({ id: keyId, success: true, credit: creditAmount, status: 'valid' });
          } else {
            const isAuthError = kieRes.status === 401 || (kieJson && (kieJson.code === 401 || String(kieJson.msg).toLowerCase().includes('unauthorized')));
            results.push({
              id: keyId,
              success: false,
              credit: 0,
              error: kieJson?.msg || 'Gagal sinkronisasi',
              isAuthError
            });
          }
        } catch (itemErr) {
          results.push({ id: keyId, success: false, error: itemErr.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      return res.status(200).json({
        success: true,
        total: targetKeys.length,
        updatedCount: successCount,
        results
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
      
      const actionLink = linkData?.properties?.action_link;

      // Kirimkan tautan tersebut melalui email via Brevo / SMTP
      if (actionLink) {
        try {
          await sendEmailMessage({
            to: data.email,
            subject: 'Pemulihan Kata Sandi Akun Panen Kunci',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
                <h2 style="color: #4F46E5;">Atur Ulang Kata Sandi</h2>
                <p>Halo,</p>
                <p>Kami menerima permintaan untuk mengatur ulang kata sandi akun Panen Kunci Anda.</p>
                <p>Klik tombol di bawah ini untuk membuat kata sandi baru Anda:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${actionLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Atur Ulang Kata Sandi</a>
                </div>
                <p style="color: #666; font-size: 12px;">Atau salin dan tempel tautan berikut ke browser Anda:<br><a href="${actionLink}">${actionLink}</a></p>
                <p>Jika Anda tidak meminta pengaturan ulang kata sandi, abaikan email ini.</p>
                <p>Terima kasih,<br>Tim Panen Kunci</p>
              </div>
            `
          });
          
          return res.status(200).json({
            success: true,
            emailSent: true,
            message: 'Email pemulihan kata sandi berhasil dikirimkan.'
          });
        } catch (mailErr) {
          console.error('[SupabaseProxy] Gagal mengirim email reset password via Brevo/SMTP:', mailErr);
          return res.status(400).json({
            success: false,
            error: 'Gagal mengirim email: ' + (mailErr.message || 'Periksa konfigurasi Brevo/SMTP di Vercel.')
          });
        }
      }

      return res.status(400).json({
        success: false,
        error: 'Sistem email belum dikonfigurasi di server. Harap tambahkan BREVO_API_KEY atau SMTP di dashboard Vercel.'
      });
    }

    // 3b. Pengiriman dan Verifikasi Kode OTP Pendaftaran Akun
    if (action === 'send_register_otp') {
      const targetEmail = (data?.email || body.email || '').toLowerCase().trim();
      if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
        return res.status(400).json({ success: false, error: 'Format alamat email tidak valid.' });
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
            return res.status(400).json({
              success: false,
              error: 'Alamat email ini sudah terdaftar. Silakan langsung masuk ke akun Anda.'
            });
          }
        } catch (dbErr) {
          console.warn('[SupabaseProxy] Cek email users note:', dbErr.message);
        }
      }

      // 2. Buat atau gunakan kode OTP 6 digit dan token HMAC
      const otp = (data?.otp || body?.otp) ? String(data?.otp || body?.otp).trim() : String(crypto.randomInt(100000, 999999));
      const expiresAt = (data?.expiresAt || body?.expiresAt) ? Number(data?.expiresAt || body?.expiresAt) : (Date.now() + 10 * 60 * 1000);
      const otpSecret = SUPABASE_SECRET_KEY || 'panenkunci-otp-secret-key-2026';
      const signature = crypto.createHmac('sha256', otpSecret)
        .update(`${targetEmail}:${otp}:${expiresAt}`)
        .digest('hex');
      const token = `${expiresAt}.${signature}`;

      try {
        await sendEmailMessage({
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

        return res.status(200).json({
          success: true,
          token,
          expiresAt,
          message: `Kode OTP berhasil dikirimkan ke ${targetEmail}.`
        });
      } catch (mailErr) {
        console.error('[SupabaseProxy] Gagal mengirim OTP email via Brevo/SMTP:', mailErr);
        return res.status(500).json({
          success: false,
          error: 'Gagal mengirim email OTP: ' + (mailErr.message || 'Silakan periksa koneksi internet atau coba beberapa saat lagi.')
        });
      }
    }

    if (action === 'verify_register_otp') {
      const targetEmail = (data?.email || body.email || '').toLowerCase().trim();
      const inputOtp = (data?.otp || body.otp || '').trim();
      const token = (data?.token || body.token || '').trim();

      if (!targetEmail || !inputOtp || !token) {
        return res.status(400).json({
          success: false,
          error: 'Email, kode OTP, dan token verifikasi wajib disertakan.'
        });
      }

      const [expiresAtStr, sig] = token.split('.');
      const expiresAt = Number(expiresAtStr);

      if (!expiresAt || !sig || isNaN(expiresAt)) {
        return res.status(400).json({
          success: false,
          error: 'Token verifikasi OTP tidak valid.'
        });
      }

      if (Date.now() > expiresAt) {
        return res.status(400).json({
          success: false,
          error: 'Kode OTP telah kedaluwarsa. Silakan minta kode OTP baru.'
        });
      }

      const otpSecret = SUPABASE_SECRET_KEY || 'panenkunci-otp-secret-key-2026';
      const expectedSig = crypto.createHmac('sha256', otpSecret)
        .update(`${targetEmail}:${inputOtp}:${expiresAtStr}`)
        .digest('hex');

      const sigBuf = Buffer.from(sig, 'utf8');
      const expectedBuf = Buffer.from(expectedSig, 'utf8');

      if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return res.status(400).json({
          success: false,
          error: 'Kode OTP yang Anda masukkan salah. Silakan periksa kembali.'
        });
      }

      // Buat verifiedToken untuk dikirim saat registrasi akun
      const verifiedSig = crypto.createHmac('sha256', otpSecret)
        .update(`${targetEmail}:VERIFIED:${expiresAtStr}`)
        .digest('hex');
      const verifiedToken = `${expiresAtStr}.${verifiedSig}`;

      return res.status(200).json({
        success: true,
        verified: true,
        verifiedToken,
        message: 'Email berhasil diverifikasi!'
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
      
      if (data.created_at) {
        txPayload.created_at = data.created_at;
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

    // 4b. Update nickname dengan batasan sebulan sekali (30 hari)
    if (action === 'update_nickname') {
      const targetUserId = body.userId || body.id;
      const newNickname = (body.name || '').trim();
      const clientNicknameUpdatedAt = body.nicknameUpdatedAt || new Date().toISOString();

      if (!targetUserId || !newNickname) {
        return res.status(400).json({ success: false, error: 'User ID dan nickname baru diperlukan.' });
      }

      if (newNickname.length < 3 || newNickname.length > 30) {
        return res.status(400).json({ success: false, error: 'Nickname harus antara 3 sampai 30 karakter.' });
      }

      // 1. Cek riwayat pergantian sebelumnya dari auth user metadata
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
          return res.status(400).json({
            success: false,
            error: `Nickname hanya dapat diganti sebulan sekali (30 hari). Sisa waktu: ${remainingDays} hari.`
          });
        }
      }

      const nowIso = clientNicknameUpdatedAt || new Date().toISOString();

      // 2. Update kolom name di public.users
      const { data: updatedUser, error: updateErr } = await adminSupabase
        .from('users')
        .update({ name: newNickname, updated_at: nowIso })
        .eq('id', targetUserId)
        .select()
        .single();

      if (updateErr) {
        return res.status(400).json({ success: false, error: updateErr.message });
      }

      // 3. Update metadata di auth.users
      try {
        await adminSupabase.auth.admin.updateUserById(targetUserId, {
          user_metadata: {
            name: newNickname,
            full_name: newNickname,
            nickname_updated_at: nowIso
          }
        });
      } catch (metaErr) {
        console.warn('[supabase-proxy] Update auth metadata warning:', metaErr.message);
      }

      return res.status(200).json({
        success: true,
        data: updatedUser,
        name: newNickname,
        nicknameUpdatedAt: nowIso
      });
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
