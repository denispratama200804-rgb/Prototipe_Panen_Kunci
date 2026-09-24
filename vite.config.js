import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import dns from 'node:dns';
import crypto from 'node:crypto';
import { uploadBase64ToR2, isR2Configured } from './api/r2-uploader.js';

// Fix local IPv6 ENETUNREACH issue
dns.setDefaultResultOrder('ipv4first');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  let SUPABASE_URL = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || 'https://wsbbdyrnnbjkjmfcplea.supabase.co';
  let SUPABASE_SECRET_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || '';

  if (SUPABASE_URL.includes('bmuthjyibkrcqyygjcxe')) {
    SUPABASE_URL = 'https://wsbbdyrnnbjkjmfcplea.supabase.co';
  }

  // Inisialisasi client admin di sisi server Node.js jika secret key tersedia
  const adminSupabase = SUPABASE_SECRET_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
    : null;

  const CHAT_STORE_ID = '00000000-0000-0000-0000-000000000002';
  const REFERRAL_STORE_ID = '00000000-0000-0000-0000-000000000003';

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

  // ── Integrasi Telegram Bot Realtime (Admin Group Notification) ──

  async function getSystemConfigInternal() {
    if (!adminSupabase) return null;
    try {
      const { data: cfgRow } = await adminSupabase
        .from('users')
        .select('avatar')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .maybeSingle();

      if (cfgRow && cfgRow.avatar) {
        return typeof cfgRow.avatar === 'string' ? JSON.parse(cfgRow.avatar) : cfgRow.avatar;
      }
    } catch (_) {}
    return null;
  }

  function formatTelegramChatId(chatId) {
    if (!chatId) return '';
    let id = String(chatId).replace(/["']/g, '').trim();
    // Auto-prefix '-' jika user memasukkan ID supergroup/channel tanpa tanda minus (cth: 1003971650678 -> -1003971650678)
    if (/^100\d{7,}$/.test(id)) {
      id = '-' + id;
    }
    return id;
  }

  async function sendTelegramMessage({ token, chatId, text, parseMode = 'HTML', photoUrl = null }) {
    const cleanToken = (token || env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '').replace(/["']/g, '').trim();
    const rawChatId = (chatId || env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '').replace(/["']/g, '').trim();
    const cleanChatId = formatTelegramChatId(rawChatId);

    if (!cleanToken || !cleanChatId) {
      throw new Error('Telegram Bot Token dan Group Chat ID belum dikonfigurasi!');
    }

    // Jika ada photoUrl (misal bukti transfer), gunakan endpoint sendPhoto
    if (photoUrl && typeof photoUrl === 'string' && photoUrl.startsWith('http')) {
      try {
        const photoRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cleanChatId,
            photo: photoUrl,
            caption: text,
            parse_mode: parseMode
          })
        });
        const photoData = await photoRes.json();
        if (photoData.ok) {
          return { success: true, result: photoData.result, type: 'photo' };
        }
        console.warn('[TelegramBot] sendPhoto gagal, fallback sendMessage:', photoData.description);
      } catch (pErr) {
        console.warn('[TelegramBot] sendPhoto network error:', pErr.message);
      }
    }

    // Fallback / Pesan teks standar
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: text,
        parse_mode: parseMode,
        disable_web_page_preview: true
      })
    });

    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.description || 'Gagal mengirim pesan ke Telegram');
    }
    return { success: true, result: data.result, type: 'message' };
  }

  async function testTelegramBot({ token, chatId }) {
    const cleanToken = (token || env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '').replace(/["']/g, '').trim();
    const rawChatId = (chatId || env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '').replace(/["']/g, '').trim();
    const cleanChatId = formatTelegramChatId(rawChatId);

    if (!cleanToken) throw new Error('Token bot Telegram wajib diisi!');
    if (!cleanChatId) throw new Error('Telegram Group Chat ID wajib diisi!');

    const meRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const meData = await meRes.json();
    if (!meData.ok) {
      throw new Error(`Token Bot Tidak Valid: ${meData.description || 'Unauthorized'}`);
    }

    const bot = meData.result;
    const nowStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';
    const testText = `🤖 <b>TES KONEKSI BOT TELEGRAM PANEN KUNCI</b>\n\n` +
      `✅ <b>Koneksi Bot Berhasil Terhubung!</b>\n` +
      `• <b>Nama Bot:</b> @${bot.username || bot.first_name}\n` +
      `• <b>Chat ID Tujuan:</b> <code>${cleanChatId}</code>\n` +
      `• <b>Waktu Uji Coba:</b> ${nowStr}\n` +
      `• <b>Status Sistem:</b> Aktif & Siap Menerima Notifikasi Payout Real-Time!\n\n` +
      `<i>Pesan ini dikirimkan otomatis melalui tombol uji coba Admin Panel.</i>`;

    const sendRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: testText,
        parse_mode: 'HTML'
      })
    });

    const sendData = await sendRes.json();
    if (!sendData.ok) {
      let errMsg = sendData.description || 'Gagal mengirim pesan ke grup';
      if (errMsg.includes('chat not found')) {
        errMsg = 'Group Chat ID tidak ditemukan! Pastikan ID benar (diawali -100) dan Bot sudah di-add ke grup Telegram sebagai Admin.';
      }
      throw new Error(errMsg);
    }

    return {
      success: true,
      bot: {
        username: bot.username,
        firstName: bot.first_name,
        id: bot.id
      },
      message: `Koneksi berhasil! Pesan tes terkirim ke Telegram grup (@${bot.username || bot.first_name}).`
    };
  }

  async function notifyTelegramPayout({ tx, user = null }) {
    try {
      const cfg = await getSystemConfigInternal();
      if (cfg && cfg.telegramEnabled === false) return;
      if (cfg && cfg.telegramNotifyPayment === false && cfg.telegramNotifyWithdrawal === false) return;

      const token = cfg?.telegramBotToken || env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
      const chatId = cfg?.telegramChatId || env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
      if (!token || !chatId) return;

      const numAmount = Number(tx.amount || 0);
      const numFee = Number(tx.fee || 0);
      const numRef = Number(tx.referralDeduction || tx.referral_deduction || 0);
      const net = Number(tx.netPayout || tx.net_payout) || Math.max(0, numAmount - numFee - numRef);

      const userName = user?.name || tx.userName || tx.user_name || 'Pengguna';
      const userEmail = user?.email || tx.userEmail || tx.user_email || '-';
      const userPhone = user?.phone || tx.userPhone || tx.user_phone || user?.account_number || '-';
      const method = (tx.method || tx.bankName || 'E-Wallet').toUpperCase();
      const recipient = tx.recipient || user?.account_number || '-';
      const accountHolder = tx.accountHolder || tx.account_holder || user?.account_holder || userName;
      const txId = tx.id || '-';
      const nowStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';

      let refLine = '';
      const refCode = tx.referralCode || tx.referredBy || '';
      if (numRef > 0) {
        refLine = `• <b>Potongan Komisi (${refCode || 'Referral'}):</b> Rp ${numRef.toLocaleString('id-ID')}\n`;
      }

      const text = `🔔 <b>PERMOHONAN PENARIKAN SALDO (PAYOUT) BARU!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>Data Pengguna:</b>\n` +
        `• <b>Nama:</b> ${userName}\n` +
        `• <b>Email:</b> ${userEmail}\n` +
        `• <b>No. HP:</b> ${userPhone}\n\n` +
        `💰 <b>Rincian Pencairan Dana:</b>\n` +
        `• <b>Nominal Penarikan:</b> <b>Rp ${numAmount.toLocaleString('id-ID')}</b>\n` +
        `• <b>Biaya Admin:</b> Rp ${numFee.toLocaleString('id-ID')}\n` +
        refLine +
        `• <b>Diterima Bersih:</b> <b>Rp ${net.toLocaleString('id-ID')}</b>\n\n` +
        `🏦 <b>Tujuan Transfer:</b>\n` +
        `• <b>Metode:</b> ${method}\n` +
        `• <b>No. Rekening / E-Wallet:</b> <code>${recipient}</code>\n` +
        `• <b>Atas Nama (A/N):</b> <b>${accountHolder}</b>\n\n` +
        `📋 <b>Status & Referensi:</b>\n` +
        `• <b>ID Transaksi:</b> <code>${txId}</code>\n` +
        `• <b>Waktu Pengajuan:</b> ${nowStr}\n` +
        `• <b>Status:</b> ⏳ <b>Menunggu Persetujuan Admin</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `⚡ <i>Silakan login ke Admin Panel untuk memeriksa rekening & mengunggah bukti transfer.</i>`;

      await sendTelegramMessage({ token, chatId, text });
    } catch (e) {
      console.warn('[TelegramBot] notifyTelegramPayout error:', e.message);
    }
  }

  async function notifyTelegramPayoutApproved({ txId, amount, netPayout, method, recipient, accountHolder, userName, userEmail, proofImage, notes }) {
    try {
      const cfg = await getSystemConfigInternal();
      if (cfg && cfg.telegramEnabled === false) return;
      if (cfg && cfg.telegramNotifyPayment === false && cfg.telegramNotifyWithdrawal === false) return;

      const token = cfg?.telegramBotToken || env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
      const chatId = cfg?.telegramChatId || env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
      if (!token || !chatId) return;

      const numAmount = Number(amount || 0);
      const finalNet = Number(netPayout || numAmount);
      const safeMethod = (method || 'TRANSFER').toUpperCase();
      const safeRecipient = recipient || '-';
      const safeHolder = accountHolder || userName || '-';
      const safeNotes = notes || 'Transfer pencairan dana berhasil diproses oleh Admin';
      const nowStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';

      const text = `✅ <b>PENARIKAN SALDO (PAYOUT) DISETUJUI & SELESAI!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>Penerima:</b> ${userName || 'Pengguna'} (${userEmail || '-'})\n` +
        `💰 <b>Nominal Ditransfer:</b> <b>Rp ${finalNet.toLocaleString('id-ID')}</b> (Total: Rp ${numAmount.toLocaleString('id-ID')})\n` +
        `🏦 <b>Tujuan:</b> ${safeMethod} - <code>${safeRecipient}</code>\n` +
        `🏷️ <b>Atas Nama (A/N):</b> <b>${safeHolder}</b>\n` +
        `📄 <b>ID Transaksi:</b> <code>${txId || '-'}</code>\n` +
        `📝 <b>Catatan Admin:</b> <i>${safeNotes}</i>\n` +
        `🕒 <b>Waktu Proses:</b> ${nowStr}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🎉 <i>Dana berhasil dicairkan ke rekening pengguna. Bukti transfer telah tersimpan.</i>`;

      await sendTelegramMessage({
        token,
        chatId,
        text,
        photoUrl: (proofImage && String(proofImage).startsWith('http')) ? proofImage : null
      });
    } catch (e) {
      console.warn('[TelegramBot] notifyTelegramPayoutApproved error:', e.message);
    }
  }

  async function notifyTelegramSupportMessage(chatMessage) {
    try {
      if (!chatMessage || chatMessage.sender !== 'user') return;
      const cfg = await getSystemConfigInternal();
      if (cfg && cfg.telegramEnabled === false) return;
      if (cfg && cfg.telegramNotifySupport === false) return;

      const token = cfg?.telegramBotToken || env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
      const chatId = cfg?.telegramChatId || env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
      if (!token || !chatId) return;

      const userName = chatMessage.userName || chatMessage.user_name || 'Pengguna';
      const userEmail = chatMessage.userEmail || chatMessage.user_email || '-';
      const msgText = chatMessage.text || '';
      const nowStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';

      const text = `💬 <b>TIKET BANTUAN / LIVE CHAT USER BARU</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>Dari Pengguna:</b> ${userName} (${userEmail})\n` +
        `🕒 <b>Waktu:</b> ${nowStr}\n\n` +
        `📨 <b>Isi Pesan:</b>\n` +
        `<i>"${msgText}"</i>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `⚡ <i>Buka menu Live Chat di Admin Panel untuk membalas pengguna secara langsung.</i>`;

      await sendTelegramMessage({ token, chatId, text });
    } catch (e) {
      console.warn('[TelegramBot] notifyTelegramSupportMessage error:', e.message);
    }
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
                          credits: (row.credits !== null && row.credits !== undefined && !isNaN(Number(row.credits))) ? Number(row.credits) : 80,
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
                    try {
                      const { data: authData } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });
                      if (authData && Array.isArray(authData.users)) {
                        const refMap = {};
                        authData.users.forEach(au => {
                          if (au && au.id && au.user_metadata) {
                            const ref = au.user_metadata.referred_by || au.user_metadata.referredBy;
                            if (ref) refMap[au.id] = String(ref).trim().toUpperCase();
                          }
                        });
                        cleanUsers.forEach(u => {
                          if (!u.referred_by && refMap[u.id]) u.referred_by = refMap[u.id];
                          if (!u.referredBy && refMap[u.id]) u.referredBy = refMap[u.id];
                        });
                      }
                    } catch (_) {}
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

                  // 0. Cloudflare R2 Upload Handler
                  if (action === 'upload_r2') {
                    const { base64Data, folder, fileName } = parsed;
                    if (!base64Data) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ success: false, error: 'Data gambar (base64Data) diperlukan' }));
                      return;
                    }
                    if (!isR2Configured()) {
                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: false, fallback: true, message: 'Cloudflare R2 belum dikonfigurasi di environment variables' }));
                      return;
                    }
                    try {
                      const result = await uploadBase64ToR2({
                        base64Data,
                        folder: folder || 'uploads',
                        fileName: fileName || null
                      });
                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: true, ...result }));
                    } catch (uploadErr) {
                      console.warn('[vite-dev-proxy] R2 upload warning/fallback:', uploadErr.message);
                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: false, fallback: true, error: uploadErr.message }));
                    }
                    return;
                  }

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
                    notifyTelegramSupportMessage(parsed.message).catch(() => {});
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

                  // 1c. Actions Telegram Bot (Test Koneksi & Kirim Notifikasi Manual)
                  if (action === 'test_telegram_bot') {
                    try {
                      let token = parsed.token;
                      let chatId = parsed.chatId;

                      if (!token || !chatId) {
                        const cfg = await getSystemConfigInternal();
                        token = token || cfg?.telegramBotToken || env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
                        chatId = chatId || cfg?.telegramChatId || env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
                      }

                      const testResult = await testTelegramBot({ token, chatId });
                      res.statusCode = 200;
                      res.end(JSON.stringify(testResult));
                    } catch (err) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ success: false, error: err.message }));
                    }
                    return;
                  }

                  if (action === 'send_telegram_notification') {
                    try {
                      let token = parsed.token;
                      let chatId = parsed.chatId;
                      const cfg = await getSystemConfigInternal();

                      const isMasterEnabled = cfg?.telegramEnabled !== false;
                      if (!isMasterEnabled && !parsed.force) {
                        res.statusCode = 200;
                        res.end(JSON.stringify({ success: true, skipped: true, reason: 'Telegram disabled by admin' }));
                        return;
                      }

                      token = token || cfg?.telegramBotToken || env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
                      chatId = chatId || cfg?.telegramChatId || env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

                      if (!token || !chatId) {
                        res.statusCode = 200;
                        res.end(JSON.stringify({ success: true, skipped: true, reason: 'Telegram bot not configured' }));
                        return;
                      }

                      const sendRes = await sendTelegramMessage({
                        token,
                        chatId,
                        text: parsed.text,
                        parseMode: parsed.parseMode || 'HTML',
                        photoUrl: parsed.photoUrl || null
                      });
                      res.statusCode = 200;
                      res.end(JSON.stringify(sendRes));
                    } catch (err) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ success: false, error: err.message }));
                    }
                    return;
                  }

                  if (action === 'notify_withdrawal') {
                    try {
                      await notifyTelegramPayout({ tx: parsed.tx || parsed.transaction || parsed, user: parsed.user || null });
                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: true }));
                    } catch (err) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ success: false, error: err.message }));
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
                        try {
                          const { data: authData } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });
                          if (authData && Array.isArray(authData.users)) {
                            const refMap = {};
                            authData.users.forEach(au => {
                              if (au && au.id && au.user_metadata) {
                                const ref = au.user_metadata.referred_by || au.user_metadata.referredBy;
                                if (ref) refMap[au.id] = String(ref).trim().toUpperCase();
                              }
                            });
                            cleanUsers.forEach(u => {
                              if (!u.referred_by && refMap[u.id]) u.referred_by = refMap[u.id];
                              if (!u.referredBy && refMap[u.id]) u.referredBy = refMap[u.id];
                            });
                          }
                        } catch (_) {}

                        // Sinkronkan juga dari central store REFERRAL_STORE_ID
                        try {
                          const { data: storeRow } = await adminSupabase
                            .from('users')
                            .select('avatar')
                            .eq('id', REFERRAL_STORE_ID)
                            .maybeSingle();

                          let storeMap = {};
                          if (storeRow && storeRow.avatar) {
                            try {
                              storeMap = typeof storeRow.avatar === 'string' ? JSON.parse(storeRow.avatar) : storeRow.avatar;
                            } catch (_) {}
                          }
                          if (typeof storeMap === 'object' && storeMap) {
                            cleanUsers.forEach(u => {
                              const foundRef = storeMap[u.id] || storeMap[(u.email || '').toLowerCase()];
                              if (foundRef) {
                                const cleanFound = String(foundRef).trim().toUpperCase();
                                if (!u.referred_by) u.referred_by = cleanFound;
                                if (!u.referredBy) u.referredBy = cleanFound;
                              }
                            });
                          }
                        } catch (_) {}

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
                            credits: (row.credits !== null && row.credits !== undefined && !isNaN(Number(row.credits))) ? Number(row.credits) : 80,
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
                        let fallbackQuery = adminSupabase
                          .from('transactions')
                          .select('*')
                          .order('created_at', { ascending: false });
                        if (targetUserId) {
                          fallbackQuery = fallbackQuery.eq('user_id', targetUserId);
                        }
                        const fallback = await fallbackQuery;
                        if (fallback.error) {
                          res.statusCode = 400;
                          res.end(JSON.stringify({ success: false, error: fallback.error.message }));
                          return;
                        }
                        txs = fallback.data;
                      }

                      let storeMap = {};
                      try {
                        const { data: storeRow } = await adminSupabase
                          .from('users')
                          .select('avatar')
                          .eq('id', REFERRAL_STORE_ID)
                          .maybeSingle();
                        if (storeRow && storeRow.avatar) {
                          storeMap = typeof storeRow.avatar === 'string' ? JSON.parse(storeRow.avatar) : storeRow.avatar;
                        }
                      } catch (_) {}
                      if (typeof storeMap !== 'object' || !storeMap) storeMap = {};

                      const formatted = (txs || []).map(row => {
                        const amount = Number(row.amount || 0);
                        const fee = Number(row.fee || 0);

                        let referralCode = row.referral_code || row.referred_by || storeMap[row.user_id] || storeMap[(row.users?.email || '').toLowerCase()] || '';
                        let referralDeduction = Number(row.referral_deduction || 0);

                        if (!referralCode && row.description) {
                          const matchCode = row.description.match(/Potongan\s+Referral\s*\(([^)]+)\)/i);
                          if (matchCode) referralCode = matchCode[1].trim().toUpperCase();
                        }
                        if (!referralDeduction && row.description) {
                          const matchNominal = row.description.match(/Potongan\s+Referral[^:]*:\s*Rp\s*([\d.,]+)/i);
                          if (matchNominal) {
                            referralDeduction = Number(matchNominal[1].replace(/[.,]/g, '')) || 0;
                          }
                        }

                        if (!referralDeduction && referralCode && row.type === 'withdrawal') {
                          referralDeduction = Math.round(amount * 0.05);
                        }

                        const netPayout = row.net_payout !== null && row.net_payout !== undefined && row.net_payout < (amount - fee)
                          ? Number(row.net_payout)
                          : Math.max(0, amount - fee - referralDeduction);

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
                          referralCode: referralCode,
                          referral_code: referralCode,
                          referredBy: referralCode,
                          referralDeduction: referralDeduction,
                          referral_deduction: referralDeduction,
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

                  // Validasi & Cek Keberadaan Kode Referral (Bypass RLS)
                  if (action === 'check_referral_code') {
                    if (adminSupabase) {
                      const code = (parsed.referralCode || parsed.referral_code || data?.referralCode || data?.referral_code || '').trim().toUpperCase();
                      if (!code) {
                        res.statusCode = 200;
                        res.end(JSON.stringify({ success: true, exists: false, message: 'Kode referral kosong' }));
                        return;
                      }

                      // 1. Coba cari di kolom referral_code jika sudah ada
                      let directFound = null;
                      try {
                        const { data: dbUser, error: dbErr } = await adminSupabase
                          .from('users')
                          .select('id, name, email, referral_code')
                          .ilike('referral_code', code)
                          .maybeSingle();
                        if (!dbErr && dbUser && dbUser.id) directFound = dbUser;
                      } catch (_) {}

                      if (directFound) {
                        res.statusCode = 200;
                        res.end(JSON.stringify({
                          success: true,
                          exists: true,
                          referrer: {
                            id: directFound.id,
                            name: directFound.name || 'Pengguna',
                            email: directFound.email || '',
                            referralCode: code
                          }
                        }));
                        return;
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
                            try {
                              await adminSupabase.from('users').update({ referral_code: code }).eq('id', found.id);
                            } catch (_) {}

                            res.statusCode = 200;
                            res.end(JSON.stringify({
                              success: true,
                              exists: true,
                              referrer: {
                                id: found.id,
                                name: found.name || 'Pengguna',
                                email: found.email || '',
                                referralCode: code
                              }
                            }));
                            return;
                          }
                        }
                      } catch (err) {
                        console.warn('[vite proxy] check_referral_code error:', err.message);
                      }

                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: true, exists: false, message: 'Kode referral tidak ditemukan atau tidak valid' }));
                    } else {
                      res.statusCode = 500;
                      res.end(JSON.stringify({ success: false, error: 'SUPABASE_SECRET_KEY belum diatur di .env' }));
                    }
                    return;
                  }

                  // Menautkan Kode Referral Pengundang ke Akun Pengguna (Bypass RLS)
                  if (action === 'bind_referral') {
                    if (adminSupabase) {
                      const targetUserId = parsed.userId || parsed.user_id || data?.userId || data?.user_id;
                      const userEmail = (parsed.userEmail || parsed.email || data?.userEmail || data?.email || '').trim().toLowerCase();
                      const code = (parsed.referralCode || parsed.referral_code || data?.referralCode || data?.referral_code || '').trim().toUpperCase();

                      if (!targetUserId || !code) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ success: false, error: 'User ID dan Kode Referral diperlukan.' }));
                        return;
                      }

                      // 1. Simpan ke central referral bindings store (REFERRAL_STORE_ID) di tabel users
                      try {
                        const { data: storeRow } = await adminSupabase
                          .from('users')
                          .select('avatar')
                          .eq('id', REFERRAL_STORE_ID)
                          .maybeSingle();

                        let refMap = {};
                        if (storeRow && storeRow.avatar) {
                          try {
                            refMap = typeof storeRow.avatar === 'string' ? JSON.parse(storeRow.avatar) : storeRow.avatar;
                          } catch (_) {}
                        }
                        if (typeof refMap !== 'object' || !refMap) refMap = {};
                        refMap[targetUserId] = code;
                        if (userEmail) refMap[userEmail] = code;

                        await adminSupabase.from('users').upsert({
                          id: REFERRAL_STORE_ID,
                          name: 'Referral Bindings Store',
                          email: 'referral_store@panenkunci.internal',
                          role: 'system_config',
                          avatar: JSON.stringify(refMap),
                          is_verified: true,
                          updated_at: new Date().toISOString()
                        });
                      } catch (storeErr) {
                        console.warn('[vite proxy] bind_referral store warning:', storeErr.message);
                      }

                      // 2. Coba update kolom jika tabel memiliki referred_by
                      try {
                        await adminSupabase
                          .from('users')
                          .update({ referred_by: code, updated_at: new Date().toISOString() })
                          .eq('id', targetUserId);
                      } catch (_) {}

                      // 3. Simpan ke Auth user_metadata jika ada di auth.users
                      try {
                        await adminSupabase.auth.admin.updateUserById(targetUserId, {
                          user_metadata: { referred_by: code }
                        });
                      } catch (authErr) {
                        console.warn('[vite proxy] update user_metadata referred_by warning:', authErr.message);
                      }

                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: true, message: `Berhasil menautkan ke kode referral ${code}` }));
                    } else {
                      res.statusCode = 500;
                      res.end(JSON.stringify({ success: false, error: 'SUPABASE_SECRET_KEY belum diatur di .env' }));
                    }
                    return;
                  }

                  if (action === 'get_user_referral') {
                    if (adminSupabase) {
                      const targetId = parsed.userId || parsed.id;
                      const targetEmail = (parsed.userEmail || parsed.email || '').trim().toLowerCase();

                      try {
                        const { data: storeRow } = await adminSupabase
                          .from('users')
                          .select('avatar')
                          .eq('id', REFERRAL_STORE_ID)
                          .maybeSingle();

                        let refMap = {};
                        if (storeRow && storeRow.avatar) {
                          try {
                            refMap = typeof storeRow.avatar === 'string' ? JSON.parse(storeRow.avatar) : storeRow.avatar;
                          } catch (_) {}
                        }
                        const bound = (targetId && refMap[targetId]) || (targetEmail && refMap[targetEmail]) || '';
                        res.statusCode = 200;
                        res.end(JSON.stringify({ success: true, referralCode: bound }));
                        return;
                      } catch (err) {
                        res.statusCode = 200;
                        res.end(JSON.stringify({ success: false, referralCode: '' }));
                        return;
                      }
                    } else {
                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: false, referralCode: '' }));
                      return;
                    }
                  }

                  if (action === 'insert' && table === 'users') {
                    let insertPayload = { ...data };
                    let { data: inserted, error } = await adminSupabase
                      .from('users')
                      .insert(insertPayload)
                      .select()
                      .single();

                    let retries = 0;
                    while (error && retries < 5) {
                      retries++;
                      const missingMatch = error.message && (
                        error.message.match(/Could not find the '([^']+)' column/i) ||
                        error.message.match(/column [^\s.]*\.?([a-zA-Z0-9_]+) does not exist/i)
                      );
                      if (missingMatch && missingMatch[1] && (missingMatch[1] in insertPayload)) {
                        delete insertPayload[missingMatch[1]];
                        const retry = await adminSupabase
                          .from('users')
                          .insert(insertPayload)
                          .select()
                          .single();
                        inserted = retry.data;
                        error = retry.error;
                      } else {
                        break;
                      }
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

                    const numAmount = Number(data.amount || 0);
                    if (numAmount <= 0) {
                      res.statusCode = 200;
                      res.end(JSON.stringify({
                        success: true,
                        skipped: true,
                        message: 'Transaksi dengan amount <= 0 dilewati (database check constraint transactions_amount_check).'
                      }));
                      return;
                    }

                    const txPayload = {
                      user_id: validUserId,
                      type: data.type || 'deposit',
                      amount: numAmount,
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
                      // Notifikasi real-time Telegram Bot untuk penarikan dana / payout baru
                      if (txPayload.type === 'withdrawal') {
                        notifyTelegramPayout({
                          tx: inserted || txPayload,
                          user: inserted?.users || null
                        }).catch(err => console.warn('[TelegramProxy Dev] Gagal notif withdrawal:', err.message));
                      }

                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: true, data: inserted }));
                    }
                    return;
                  }

                  // 4a. Cek status cooldown nickname pengguna dari Supabase (auth.users & public.users)
                  if (action === 'check_nickname_cooldown') {
                    if (adminSupabase) {
                      const targetUserId = parsed.userId || parsed.id;
                      const targetEmail = parsed.email ? String(parsed.email).trim().toLowerCase() : null;

                      let lastChangeTime = null;

                      if (targetUserId) {
                        try {
                          const { data: authUserData, error: authUserErr } = await adminSupabase.auth.admin.getUserById(targetUserId);
                          if (!authUserErr && authUserData?.user?.user_metadata?.nickname_updated_at) {
                            lastChangeTime = new Date(authUserData.user.user_metadata.nickname_updated_at).getTime();
                          }
                        } catch (_) {}

                        try {
                          const { data: dbUser } = await adminSupabase.from('users').select('nickname_updated_at').eq('id', targetUserId).maybeSingle();
                          if (dbUser?.nickname_updated_at) {
                            const dbTime = new Date(dbUser.nickname_updated_at).getTime();
                            if (!isNaN(dbTime) && (!lastChangeTime || dbTime > lastChangeTime)) {
                              lastChangeTime = dbTime;
                            }
                          }
                        } catch (_) {}
                      }

                      if (targetEmail) {
                        try {
                          const { data: dbUserByEmail } = await adminSupabase.from('users').select('nickname_updated_at').ilike('email', targetEmail).maybeSingle();
                          if (dbUserByEmail?.nickname_updated_at) {
                            const dbTime = new Date(dbUserByEmail.nickname_updated_at).getTime();
                            if (!isNaN(dbTime) && (!lastChangeTime || dbTime > lastChangeTime)) {
                              lastChangeTime = dbTime;
                            }
                          }
                        } catch (_) {}

                        if (!lastChangeTime) {
                          try {
                            const { data: listData } = await adminSupabase.auth.admin.listUsers();
                            const authUser = listData?.users?.find(u => u.email?.toLowerCase() === targetEmail);
                            if (authUser?.user_metadata?.nickname_updated_at) {
                              const authTime = new Date(authUser.user_metadata.nickname_updated_at).getTime();
                              if (!isNaN(authTime) && (!lastChangeTime || authTime > lastChangeTime)) {
                                lastChangeTime = authTime;
                              }
                            }
                          } catch (_) {}
                        }
                      }

                      if (lastChangeTime && !isNaN(lastChangeTime)) {
                        const cooldownMs = 30 * 24 * 60 * 60 * 1000;
                        const elapsed = Date.now() - lastChangeTime;
                        if (elapsed < cooldownMs) {
                          const remainingDays = Math.max(1, Math.ceil((cooldownMs - elapsed) / (1000 * 60 * 60 * 24)));
                          const nextDate = new Date(lastChangeTime + cooldownMs);
                          res.statusCode = 200;
                          res.end(JSON.stringify({
                            success: true,
                            allowed: false,
                            daysLeft: remainingDays,
                            nextDate: nextDate.toISOString(),
                            nicknameUpdatedAt: new Date(lastChangeTime).toISOString()
                          }));
                          return;
                        }
                      }

                      res.statusCode = 200;
                      res.end(JSON.stringify({
                        success: true,
                        allowed: true,
                        daysLeft: 0,
                        nextDate: null,
                        nicknameUpdatedAt: lastChangeTime ? new Date(lastChangeTime).toISOString() : null
                      }));
                      return;
                    }
                  }

                  if (action === 'update_nickname') {
                    if (adminSupabase) {
                      const targetUserId = parsed.userId || parsed.id;
                      const targetEmail = parsed.email ? String(parsed.email).trim().toLowerCase() : null;
                      const newNickname = (parsed.name || '').trim().replace(/\s+/g, ' ');
                      const clientNicknameUpdatedAt = parsed.nicknameUpdatedAt || new Date().toISOString();

                      if ((!targetUserId && !targetEmail) || !newNickname) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ success: false, error: 'Identitas user dan nickname baru diperlukan.' }));
                        return;
                      }

                      if (!/^[a-zA-Z\s]+$/.test(newNickname) || newNickname.replace(/\s+/g, '').length < 3) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ success: false, error: 'Nickname hanya boleh berisi huruf abjad dan spasi (tidak boleh mengandung angka atau simbol, minimal 3 abjad).' }));
                        return;
                      }

                      if (newNickname.length < 3 || newNickname.length > 30) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ success: false, error: 'Nickname harus antara 3 sampai 30 karakter.' }));
                        return;
                      }

                      let lastChangeTime = null;
                      let matchedAuthId = targetUserId;

                      if (targetUserId) {
                        try {
                          const { data: authUserData, error: authUserErr } = await adminSupabase.auth.admin.getUserById(targetUserId);
                          if (!authUserErr && authUserData?.user?.user_metadata?.nickname_updated_at) {
                            lastChangeTime = new Date(authUserData.user.user_metadata.nickname_updated_at).getTime();
                          }
                        } catch (_) {}

                        try {
                          const { data: dbUser } = await adminSupabase.from('users').select('nickname_updated_at').eq('id', targetUserId).maybeSingle();
                          if (dbUser?.nickname_updated_at) {
                            const dbTime = new Date(dbUser.nickname_updated_at).getTime();
                            if (!isNaN(dbTime) && (!lastChangeTime || dbTime > lastChangeTime)) {
                              lastChangeTime = dbTime;
                            }
                          }
                        } catch (_) {}
                      }

                      if (targetEmail) {
                        try {
                          const { data: dbUserByEmail } = await adminSupabase.from('users').select('id, nickname_updated_at').ilike('email', targetEmail).maybeSingle();
                          if (dbUserByEmail?.nickname_updated_at) {
                            const dbTime = new Date(dbUserByEmail.nickname_updated_at).getTime();
                            if (!isNaN(dbTime) && (!lastChangeTime || dbTime > lastChangeTime)) {
                              lastChangeTime = dbTime;
                            }
                          }
                          if (dbUserByEmail?.id && !matchedAuthId) {
                            matchedAuthId = dbUserByEmail.id;
                          }
                        } catch (_) {}

                        try {
                          const { data: listData } = await adminSupabase.auth.admin.listUsers();
                          const authUser = listData?.users?.find(u => u.email?.toLowerCase() === targetEmail);
                          if (authUser) {
                            matchedAuthId = authUser.id;
                            if (authUser.user_metadata?.nickname_updated_at) {
                              const authTime = new Date(authUser.user_metadata.nickname_updated_at).getTime();
                              if (!isNaN(authTime) && (!lastChangeTime || authTime > lastChangeTime)) {
                                lastChangeTime = authTime;
                              }
                            }
                          }
                        } catch (_) {}
                      }

                      if (lastChangeTime && !isNaN(lastChangeTime)) {
                        const cooldownMs = 30 * 24 * 60 * 60 * 1000;
                        const elapsed = Date.now() - lastChangeTime;
                        if (elapsed < cooldownMs) {
                          const remainingDays = Math.max(1, Math.ceil((cooldownMs - elapsed) / (1000 * 60 * 60 * 24)));
                          const nextDate = new Date(lastChangeTime + cooldownMs);
                          res.statusCode = 400;
                          res.end(JSON.stringify({
                            success: false,
                            error: `Nickname hanya dapat diganti sebulan sekali (30 hari). Sisa waktu: ${remainingDays} hari.`,
                            allowed: false,
                            daysLeft: remainingDays,
                            nextDate: nextDate.toISOString()
                          }));
                          return;
                        }
                      }

                      const nowIso = clientNicknameUpdatedAt || new Date().toISOString();

                      let updatedUser = null;
                      let updateAttempt1 = null;
                      try {
                        let q = adminSupabase.from('users').update({ name: newNickname, updated_at: nowIso, nickname_updated_at: nowIso });
                        if (targetUserId) q = q.eq('id', targetUserId);
                        else if (targetEmail) q = q.ilike('email', targetEmail);
                        updateAttempt1 = await q.select().maybeSingle();
                      } catch (_) {}

                      if (updateAttempt1?.data) {
                        updatedUser = updateAttempt1.data;
                      } else {
                        let q2 = adminSupabase.from('users').update({ name: newNickname, updated_at: nowIso });
                        if (targetUserId) q2 = q2.eq('id', targetUserId);
                        else if (targetEmail) q2 = q2.ilike('email', targetEmail);
                        const { data: updatedBasic, error: updateErr2 } = await q2.select().maybeSingle();
                        if (updateErr2) {
                          res.statusCode = 400;
                          res.end(JSON.stringify({ success: false, error: updateErr2.message }));
                          return;
                        }
                        updatedUser = updatedBasic;
                      }

                      if (matchedAuthId) {
                        try {
                          await adminSupabase.auth.admin.updateUserById(matchedAuthId, {
                            user_metadata: {
                              name: newNickname,
                              full_name: newNickname,
                              nickname_updated_at: nowIso
                            }
                          });
                        } catch (metaErr) {
                          console.warn('[vite-proxy] Update auth metadata warning:', metaErr.message);
                        }
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
                    let updatePayload = { ...data };
                    let { data: updated, error } = await adminSupabase
                      .from('users')
                      .update(updatePayload)
                      .eq('id', id)
                      .select()
                      .single();

                    let retries = 0;
                    while (error && retries < 5) {
                      retries++;
                      const missingMatch = error.message && (
                        error.message.match(/Could not find the '([^']+)' column/i) ||
                        error.message.match(/column [^\s.]*\.?([a-zA-Z0-9_]+) does not exist/i)
                      );
                      if (missingMatch && missingMatch[1] && (missingMatch[1] in updatePayload)) {
                        delete updatePayload[missingMatch[1]];
                        const retry = await adminSupabase
                          .from('users')
                          .update(updatePayload)
                          .eq('id', id)
                          .select()
                          .single();
                        updated = retry.data;
                        error = retry.error;
                      } else {
                        break;
                      }
                    }

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
                    let updatePayload = { ...data };
                    let { data: updated, error } = await adminSupabase
                      .from('transactions')
                      .update(updatePayload)
                      .eq('id', id)
                      .select()
                      .single();

                    let retries = 0;
                    while (error && retries < 5) {
                      retries++;
                      const missingMatch = error.message && (
                        error.message.match(/Could not find the '([^']+)' column/i) ||
                        error.message.match(/column [^\s.]*\.?([a-zA-Z0-9_]+) does not exist/i)
                      );
                      if (missingMatch && missingMatch[1] && (missingMatch[1] in updatePayload)) {
                        delete updatePayload[missingMatch[1]];
                        const retry = await adminSupabase
                          .from('transactions')
                          .update(updatePayload)
                          .eq('id', id)
                          .select()
                          .single();
                        updated = retry.data;
                        error = retry.error;
                      } else {
                        break;
                      }
                    }

                    if (error) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ success: false, error: error.message }));
                    } else {
                      // Notifikasi Telegram jika penarikan dana disetujui / status berubah
                      if (updated && (updated.type === 'withdrawal' || data.type === 'withdrawal')) {
                        const upStatus = (updated.status || data.status || '').toLowerCase();
                        if (['success', 'approved', 'valid'].includes(upStatus)) {
                          notifyTelegramPayoutApproved({
                            txId: updated.id || id,
                            amount: updated.amount || data.amount,
                            netPayout: updated.net_payout || updated.netPayout || data.net_payout || data.netPayout,
                            method: updated.method || data.method,
                            recipient: updated.recipient || data.recipient,
                            accountHolder: updated.account_holder || data.account_holder || data.accountHolder,
                            userName: updated.user_name || data.user_name || data.userName,
                            userEmail: updated.user_email || data.user_email || data.userEmail,
                            proofImage: updated.proof_image || data.proof_image || data.proofImage,
                            notes: updated.proof_notes || data.proof_notes || data.proofNotes
                          }).catch(e => console.warn('[TelegramProxy Dev] Gagal notif approved:', e.message));
                        }
                      }

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
                    const apiKeyString = (parsed.apiKey || parsed.keyString || parsed.key_string || parsed.key || '').trim();
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
                          const updatePayload = {
                            credits: creditVal,
                            updated_at: new Date().toISOString()
                          };
                          if (creditVal < 80) {
                            updatePayload.status = 'invalid';
                            updatePayload.error_message = `Kredit Kie.ai berkurang menjadi ${creditVal} cr (syarat minimal: 80 cr)`;
                          }
                          await adminSupabase
                            .from('api_keys')
                            .update(updatePayload)
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

                  // Auto-Validate Single API Key Langsung ke Kie.ai
                  if (action === 'auto_validate_key') {
                    const targetKeyId = parsed.keyId || parsed.id;
                    let apiKeyString = (parsed.apiKey || parsed.keyString || parsed.key_string || parsed.key || '').trim();

                    if (!apiKeyString && targetKeyId && adminSupabase) {
                      try {
                        const { data: dbKey } = await adminSupabase
                          .from('api_keys')
                          .select('*')
                          .eq('id', targetKeyId)
                          .maybeSingle();
                        if (dbKey && dbKey.key_string) {
                          apiKeyString = dbKey.key_string.trim();
                        }
                      } catch (_) {}
                    }

                    if (!apiKeyString) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ success: false, error: 'Key string tidak ditemukan untuk validasi' }));
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
                      const creditVal = typeof resData.data === 'number' ? resData.data : (Number(resData.data) || 0);

                      const isKieActive = code === 200;
                      const isCreditValid = creditVal === 80 || creditVal >= 80;

                      // Hitung apakah masa pemantauan 3 hari (72 jam) telah terpenuhi
                      let isHoldExpired = false;
                      let daysRemaining = 3;
                      if (targetKeyId && adminSupabase) {
                        try {
                          let { data: dbKeyData, error: dbKeyErr } = await adminSupabase
                            .from('api_keys')
                            .select('created_at, user_id, users:user_id(id, referred_by)')
                            .eq('id', targetKeyId)
                            .maybeSingle();

                          if (dbKeyErr && (dbKeyErr.code === '42703' || (dbKeyErr.message && dbKeyErr.message.includes('referred_by')))) {
                            const retryKey = await adminSupabase
                              .from('api_keys')
                              .select('created_at, user_id, users:user_id(id)')
                              .eq('id', targetKeyId)
                              .maybeSingle();
                            dbKeyData = retryKey.data;
                          }

                          if (dbKeyData && dbKeyData.created_at) {
                            const createdAtMs = new Date(dbKeyData.created_at).getTime();
                            const isReferred = Boolean(dbKeyData.users?.referred_by);
                            const holdDays = isReferred ? 2 : 3;
                            const holdUntilMs = dbKeyData.hold_until ? new Date(dbKeyData.hold_until).getTime() : (createdAtMs + holdDays * 24 * 60 * 60 * 1000);
                            const diffMs = holdUntilMs - Date.now();
                            isHoldExpired = diffMs <= 0;
                            daysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
                          }
                        } catch (_) {}
                      }

                      // KONDISI A: Kredit berkurang (< 80) atau key tidak aktif -> INVALID
                      if (!isKieActive || !isCreditValid) {
                        const reason = !isKieActive
                          ? (resData.msg || (code === 401 ? 'API Key tidak valid atau otentikasi gagal di Kie.ai' : `Kie.ai error (${code})`))
                          : `Kredit Kie.ai tidak memenuhi syarat (${creditVal} cr / syarat: 80 cr)`;

                        if (targetKeyId && adminSupabase) {
                          await adminSupabase
                            .from('api_keys')
                            .update({
                              status: 'invalid',
                              credits: creditVal,
                              error_message: reason,
                              updated_at: new Date().toISOString()
                            })
                            .eq('id', targetKeyId);

                          try {
                            const suffix = apiKeyString.slice(-4);
                            const { data: relatedTxs } = await adminSupabase
                              .from('transactions')
                              .select('id, description')
                              .eq('type', 'deposit')
                              .eq('status', 'pending');
                            
                            if (Array.isArray(relatedTxs)) {
                              const matched = relatedTxs.find(t => 
                                (suffix && t.description?.includes(suffix)) || 
                                (targetKeyId && t.description?.includes(targetKeyId))
                              );
                              if (matched) {
                                await adminSupabase
                                  .from('transactions')
                                  .update({ 
                                    status: 'failed', 
                                    description: `Ditolak Sistem: ${reason}`,
                                    updated_at: new Date().toISOString() 
                                  })
                                  .eq('id', matched.id);
                              }
                            }
                          } catch (_) {}
                        }

                        res.statusCode = 200;
                        res.end(JSON.stringify({
                          success: false,
                          isValid: false,
                          status: 'invalid',
                          credit: creditVal,
                          reason,
                          message: reason
                        }));
                        return;
                      }

                      // KONDISI B: Key aktif & kredit tetap 80
                      const shouldApprove = isHoldExpired || parsed.forceApprove;

                      if (shouldApprove) {
                        // Masa pemantauan 3 hari telah selesai -> APPROVE & CAIRKAN
                        if (targetKeyId && adminSupabase) {
                          await adminSupabase
                            .from('api_keys')
                            .update({
                              status: 'valid',
                              credits: creditVal,
                              error_message: '',
                              updated_at: new Date().toISOString()
                            })
                            .eq('id', targetKeyId);

                          try {
                            const suffix = apiKeyString.slice(-4);
                            const { data: relatedTxs } = await adminSupabase
                              .from('transactions')
                              .select('id, description')
                              .eq('type', 'deposit')
                              .eq('status', 'pending');
                            
                            if (Array.isArray(relatedTxs)) {
                              const matched = relatedTxs.find(t => 
                                (suffix && t.description?.includes(suffix)) || 
                                (targetKeyId && t.description?.includes(targetKeyId))
                              );
                              if (matched) {
                                await adminSupabase
                                  .from('transactions')
                                  .update({ status: 'success', updated_at: new Date().toISOString() })
                                  .eq('id', matched.id);
                              }
                            }
                          } catch (txErr) {
                            console.warn('[ViteProxy] Auto-validate tx update warning:', txErr.message);
                          }
                        }

                        res.statusCode = 200;
                        res.end(JSON.stringify({
                          success: true,
                          isValid: true,
                          status: 'valid',
                          credit: creditVal,
                          message: `Key valid & aktif (${creditVal} kredit Kie.ai - 3 hari selesai)`
                        }));
                        return;
                      } else {
                        // Belum 3 hari: Update kredit tapi pertahankan status pending
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
                          isValid: false,
                          status: 'pending',
                          credit: creditVal,
                          daysRemaining,
                          message: `Key aktif & kredit 80 cr. Status tetap pending (Masa pantau sisa ${daysRemaining} hari)`
                        }));
                        return;
                      }
                    } catch (err) {
                      console.error('[ViteProxy] Error auto_validate_key:', err);
                      res.statusCode = 500;
                      res.end(JSON.stringify({ success: false, error: 'Koneksi ke Kie.ai gagal: ' + err.message }));
                      return;
                    }
                  }

                  // Auto-Validate Semua Kunci Pending & Inspeksi Jam 12 Malam WIB (00:00 WIB)
                  if (action === 'auto_validate_all_keys' || action === 'midnight_kie_inspection') {
                    if (!adminSupabase) {
                      res.statusCode = 500;
                      res.end(JSON.stringify({ success: false, error: 'Database belum terkonfigurasi' }));
                      return;
                    }

                    try {
                      let { data: pendingKeys, error } = await adminSupabase
                        .from('api_keys')
                        .select('id, key_string, user_id, reward_amount, status, created_at, users:user_id(id, referred_by)')
                        .eq('status', 'pending');

                      if (error && (error.code === '42703' || (error.message && error.message.includes('referred_by')))) {
                        const retryPending = await adminSupabase
                          .from('api_keys')
                          .select('id, key_string, user_id, reward_amount, status, created_at, users:user_id(id)')
                          .eq('status', 'pending');
                        pendingKeys = retryPending.data;
                        error = retryPending.error;
                      }

                      if (error) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ success: false, error: error.message }));
                        return;
                      }

                      const list = Array.isArray(pendingKeys) ? pendingKeys : [];
                      const results = [];

                      for (const item of list) {
                        const keyString = (item.key_string || '').trim();
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

                          const resJson = await kieRes.json().catch(() => ({}));
                          const code = resJson.code !== undefined ? resJson.code : kieRes.status;
                          const creditVal = typeof resJson.data === 'number' ? resJson.data : (Number(resJson.data) || 0);

                          const isKieActive = code === 200;
                          const isCreditValid = creditVal === 80 || creditVal >= 80;

                          const isReferred = Boolean(item.users?.referred_by);
                          const holdDays = isReferred ? 2 : 3;
                          const createdAtMs = item.created_at ? new Date(item.created_at).getTime() : Date.now();
                          const holdUntilMs = item.hold_until ? new Date(item.hold_until).getTime() : (createdAtMs + holdDays * 24 * 60 * 60 * 1000);
                          const isHoldExpired = Date.now() >= holdUntilMs;

                          if (isKieActive && isCreditValid) {
                            if (isHoldExpired) {
                              // Masa pemantauan 3 hari selesai -> VALID
                              await adminSupabase
                                .from('api_keys')
                                .update({
                                  status: 'valid',
                                  credits: creditVal,
                                  error_message: '',
                                  updated_at: new Date().toISOString()
                                })
                                .eq('id', item.id);

                              try {
                                const suffix = keyString.slice(-4);
                                const { data: relatedTxs } = await adminSupabase
                                  .from('transactions')
                                  .select('id, description')
                                  .eq('type', 'deposit')
                                  .eq('status', 'pending');
                                
                                if (Array.isArray(relatedTxs)) {
                                  const matched = relatedTxs.find(t => 
                                    (suffix && t.description?.includes(suffix)) || 
                                    (item.id && t.description?.includes(item.id))
                                  );
                                  if (matched) {
                                    await adminSupabase
                                      .from('transactions')
                                      .update({ status: 'success', updated_at: new Date().toISOString() })
                                      .eq('id', matched.id);
                                  }
                                }
                              } catch (_) {}

                              results.push({ id: item.id, status: 'valid', credit: creditVal, success: true, message: 'Valid setelah 3 hari' });
                            } else {
                              // Belum 3 hari -> Tetap PENDING dalam masa pemantauan
                              await adminSupabase
                                .from('api_keys')
                                .update({
                                  credits: creditVal,
                                  updated_at: new Date().toISOString()
                                })
                                .eq('id', item.id);

                              results.push({ id: item.id, status: 'pending', credit: creditVal, success: true, message: 'Aktif 80 cr, masih dalam masa pantau 3 hari' });
                            }
                          } else {
                            // Kredit berkurang (< 80) atau tidak aktif -> INVALID
                            const reason = !isKieActive
                              ? (resJson.msg || 'API Key tidak sah atau tidak aktif di Kie.ai')
                              : `Kredit Kie.ai berkurang menjadi ${creditVal} cr (syarat: 80 cr)`;

                            await adminSupabase
                              .from('api_keys')
                              .update({
                                status: 'invalid',
                                credits: creditVal,
                                error_message: reason,
                                updated_at: new Date().toISOString()
                              })
                              .eq('id', item.id);

                            try {
                              const suffix = keyString.slice(-4);
                              const { data: relatedTxs } = await adminSupabase
                                .from('transactions')
                                .select('id, description')
                                .eq('type', 'deposit')
                                .eq('status', 'pending');
                              
                              if (Array.isArray(relatedTxs)) {
                                const matched = relatedTxs.find(t => 
                                  (suffix && t.description?.includes(suffix)) || 
                                  (item.id && t.description?.includes(item.id))
                                );
                                if (matched) {
                                  await adminSupabase
                                    .from('transactions')
                                    .update({ status: 'failed', description: `Ditolak Sistem: ${reason}`, updated_at: new Date().toISOString() })
                                    .eq('id', matched.id);
                                }
                              }
                            } catch (_) {}

                            results.push({ id: item.id, status: 'invalid', credit: creditVal, success: false, reason });
                          }
                        } catch (itemErr) {
                          results.push({ id: item.id, status: 'error', error: itemErr.message, success: false });
                        }
                      }

                      const validCount = results.filter(r => r.status === 'valid').length;
                      const invalidCount = results.filter(r => r.status === 'invalid').length;
                      const pendingCount = results.filter(r => r.status === 'pending').length;

                      res.statusCode = 200;
                      res.end(JSON.stringify({
                        success: true,
                        total: list.length,
                        validatedCount: validCount,
                        rejectedCount: invalidCount,
                        pendingCount: pendingCount,
                        results
                      }));
                      return;
                    } catch (batchErr) {
                      res.statusCode = 500;
                      res.end(JSON.stringify({ success: false, error: batchErr.message }));
                      return;
                    }
                  }

                  if (action === 'generate_recovery_link' && data?.email) {
                    if (adminSupabase) {
                      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5173';
                      const proto = req.headers['x-forwarded-proto'] || (req.connection?.encrypted ? 'https' : 'http');
                      const dynamicOrigin = `${proto}://${host}`;
                      const targetRedirect = data.redirectTo || `${dynamicOrigin}/#/reset-password`;

                      const { data: linkData, error } = await adminSupabase.auth.admin.generateLink({
                        type: 'recovery',
                        email: data.email,
                        options: {
                          redirectTo: targetRedirect
                        }
                      });
                      if (error) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ success: false, error: error.message }));
                      } else {
                        const hashedToken = linkData?.properties?.hashed_token || '';
                        const emailOtp = linkData?.properties?.email_otp || '';
                        const currentEnv = loadEnv(server.config.mode, process.cwd(), '');

                        const appBaseUrl = dynamicOrigin.replace(/\/+$/, '');
                        const safeAppActionLink = `${appBaseUrl}/#/reset-password?token_hash=${encodeURIComponent(hashedToken)}&type=recovery&email=${encodeURIComponent(data.email)}`;

                        if (safeAppActionLink) {
                          try {
                            await sendEmailVite({
                              currentEnv,
                              to: data.email,
                              subject: 'Pemulihan Kata Sandi Akun Panen Kunci',
                              html: `
                                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E5E7EB; border-radius: 16px; background-color: #ffffff; color: #1F2937;">
                                  <div style="text-align: center; margin-bottom: 24px;">
                                    <div style="display: inline-flex; width: 56px; height: 56px; background-color: #EEF2FF; border-radius: 14px; align-items: center; justify-content: center; margin-bottom: 12px; font-size: 28px; line-height: 56px;">
                                      🔐
                                    </div>
                                    <h2 style="color: #1E1B4B; margin: 0 0 6px 0; font-size: 22px; font-weight: 700;">Atur Ulang Kata Sandi</h2>
                                    <p style="color: #6B7280; font-size: 14px; margin: 0;">Akun Panen Kunci</p>
                                  </div>

                                  <p style="font-size: 14px; line-height: 1.6; color: #374151;">Halo,</p>
                                  <p style="font-size: 14px; line-height: 1.6; color: #374151;">Kami menerima permintaan untuk mengatur ulang kata sandi akun Panen Kunci yang terdaftar dengan email <strong>${data.email}</strong>.</p>
                                  <p style="font-size: 14px; line-height: 1.6; color: #374151;">Klik tombol resmi di bawah ini untuk membuat kata sandi baru Anda:</p>

                                  <div style="text-align: center; margin: 28px 0;">
                                    <a href="${safeAppActionLink}" style="background-color: #4F46E5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 9999px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">Atur Ulang Kata Sandi</a>
                                  </div>

                                  <p style="color: #6B7280; font-size: 12px; line-height: 1.5; margin-top: 20px;">Jika tombol di atas tidak dapat diklik, salin tautan berikut ke browser Anda:<br>
                                    <a href="${safeAppActionLink}" style="color: #4F46E5; word-break: break-all;">${safeAppActionLink}</a>
                                  </p>

                                  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
                                  <p style="color: #9CA3AF; font-size: 11px; margin: 0; line-height: 1.4;">Jika Anda tidak meminta pengaturan ulang kata sandi, abaikan email ini. Akun Anda tetap aman.<br>© Panen Kunci. Hak cipta dilindungi undang-undang.</p>
                                </div>
                              `
                            });

                            res.statusCode = 200;
                            res.end(JSON.stringify({
                              success: true,
                              emailSent: true,
                              action_link: safeAppActionLink,
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
