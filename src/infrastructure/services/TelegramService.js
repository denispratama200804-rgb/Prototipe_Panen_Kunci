/**
 * TelegramService
 * Layanan integrasi Telegram Bot untuk notifikasi real-time ke Grup Admin
 * Mendukung:
 * - Notifikasi Permohonan Penarikan Saldo (Payout) Baru
 * - Notifikasi Persetujuan Payout beserta Bukti Transfer Foto
 * - Notifikasi Penolakan Payout & Refund Saldo
 * - Notifikasi Tiket Pesan Bantuan / Live Chat User
 * - Fitur Uji Coba (Test) Koneksi Bot & Group Chat ID
 */

export class TelegramService {
  constructor(storageAdapter = null) {
    this._storage = storageAdapter;
  }

  /**
   * Mengambil konfigurasi Telegram saat ini dari storage / server
   * @returns {Object}
   */
  getConfig() {
    try {
      const raw = localStorage.getItem('panenkunci:admin_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          enabled: parsed.telegramEnabled !== false,
          notifyPayment: parsed.telegramNotifyPayment !== false,
          notifyWithdrawal: parsed.telegramNotifyWithdrawal !== false,
          notifySupport: parsed.telegramNotifySupport !== false,
          token: (parsed.telegramBotToken || '').trim(),
          chatId: (parsed.telegramChatId || '').trim()
        };
      }
    } catch (_) {}

    return {
      enabled: true,
      notifyPayment: true,
      notifyWithdrawal: true,
      notifySupport: true,
      token: '',
      chatId: ''
    };
  }

  /**
   * Format mata uang Rupiah
   */
  _formatRupiah(num) {
    return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
  }

  /**
   * Escape HTML special characters for Telegram HTML parse mode
   */
  _escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Format waktu lokal Jakarta (WIB)
   */
  _formatTimestamp(isoDate) {
    const d = isoDate ? new Date(isoDate) : new Date();
    return d.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) + ' WIB';
  }

  /**
   * Mengirim pesan teks / foto ke Telegram API (via server proxy atau direct fetch)
   */
  async sendMessage({ text, photoUrl = null, token = null, chatId = null, parseMode = 'HTML', force = false }) {
    const config = this.getConfig();
    const effectiveToken = (token || config.token || '').trim();
    const effectiveChatId = (chatId || config.chatId || '').trim();

    if (!force && !config.enabled) {
      return { success: true, skipped: true, reason: 'Telegram notifications disabled by admin' };
    }

    // 1. Coba melalui server proxy terlebih dahulu (direkomendasikan untuk keamanan token & by-pass CORS)
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_telegram_notification',
            token: effectiveToken,
            chatId: effectiveChatId,
            text,
            photoUrl,
            parseMode,
            force
          })
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success) return json;
          if (json.error) throw new Error(json.error);
        }
      }
    } catch (proxyErr) {
      console.warn('[TelegramService] Server proxy fallback to direct Telegram API:', proxyErr.message);
    }

    // 2. Direct fallback ke Telegram Bot API
    if (!effectiveToken || !effectiveChatId) {
      return { success: false, error: 'Telegram Bot Token atau Group Chat ID belum dikonfigurasi!' };
    }

    try {
      if (photoUrl && typeof photoUrl === 'string' && photoUrl.startsWith('http')) {
        const photoRes = await fetch(`https://api.telegram.org/bot${effectiveToken}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: effectiveChatId,
            photo: photoUrl,
            caption: text,
            parse_mode: parseMode
          })
        });
        const photoJson = await photoRes.json();
        if (photoJson.ok) {
          return { success: true, result: photoJson.result, type: 'photo' };
        }
      }

      const res = await fetch(`https://api.telegram.org/bot${effectiveToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: effectiveChatId,
          text,
          parse_mode: parseMode,
          disable_web_page_preview: true
        })
      });
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.description || 'Gagal mengirim pesan ke Telegram');
      }
      return { success: true, result: json.result, type: 'message' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Menguji koneksi Telegram Bot (@BotFather) dan Group Chat ID
   */
  async testConnection(token, chatId) {
    const cleanToken = String(token || '').trim();
    const cleanChatId = String(chatId || '').trim();

    if (!cleanToken) {
      return { success: false, error: 'Token Bot Telegram wajib diisi!' };
    }
    if (!cleanChatId) {
      return { success: false, error: 'Telegram Group Chat ID wajib diisi!' };
    }

    // Coba via server proxy
    try {
      const res = await fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_telegram_bot',
          token: cleanToken,
          chatId: cleanChatId
        })
      });
      if (res.ok) {
        const json = await res.json();
        return json;
      } else {
        const json = await res.json().catch(() => ({}));
        return { success: false, error: json.error || 'Gagal menguji koneksi bot ke server' };
      }
    } catch (proxyErr) {
      console.warn('[TelegramService] Proxy test failed, running direct browser test:', proxyErr.message);
    }

    // Direct client fallback
    try {
      const meRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
      const meJson = await meRes.json();
      if (!meJson.ok) {
        return {
          success: false,
          error: `Token Bot Tidak Valid: ${meJson.description || 'Unauthorized'}`
        };
      }
      const bot = meJson.result;

      const nowStr = this._formatTimestamp();
      const testMsg = `🤖 <b>TES KONEKSI BOT TELEGRAM PANEN KUNCI</b>\n\n` +
        `✅ <b>Koneksi Bot Berhasil Terhubung!</b>\n` +
        `• <b>Nama Bot:</b> @${bot.username || bot.first_name}\n` +
        `• <b>Chat ID Grup:</b> <code>${cleanChatId}</code>\n` +
        `• <b>Waktu Uji Coba:</b> ${nowStr}\n` +
        `• <b>Status Sistem:</b> Siap Menerima Notifikasi Payout Real-Time!\n\n` +
        `<i>Pesan ini dikirimkan otomatis melalui tombol uji coba Admin Panel.</i>`;

      const sendRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanChatId,
          text: testMsg,
          parse_mode: 'HTML'
        })
      });
      const sendJson = await sendRes.json();
      if (!sendJson.ok) {
        let errDesc = sendJson.description || 'Gagal mengirim pesan';
        if (errDesc.includes('chat not found')) {
          errDesc = 'Group Chat ID tidak ditemukan! Pastikan ID benar (diawali -100) dan Bot sudah di-add ke grup sebagai Admin.';
        }
        return { success: false, error: errDesc };
      }

      return {
        success: true,
        bot: {
          username: bot.username,
          firstName: bot.first_name
        },
        message: `Koneksi berhasil! Pesan tes terkirim ke Grup Telegram melalui bot @${bot.username || bot.first_name}.`
      };
    } catch (directErr) {
      return { success: false, error: directErr.message || 'Koneksi ke api.telegram.org gagal.' };
    }
  }

  /**
   * Kirim notifikasi permohonan penarikan saldo (payout) baru dari pengguna ke Telegram
   */
  async notifyWithdrawalRequest({
    transactionId,
    userId,
    userName = '',
    userEmail = '',
    userPhone = '',
    amount = 0,
    fee = 0,
    referralDeduction = 0,
    referralCode = '',
    netPayout = 0,
    method = '',
    recipient = '',
    accountHolder = '',
    createdAt = null
  }) {
    const config = this.getConfig();
    if (!config.enabled || !config.notifyWithdrawal) {
      return { success: true, skipped: true };
    }

    const numAmount = Number(amount || 0);
    const numFee = Number(fee || 0);
    const numRef = Number(referralDeduction || 0);
    const finalNet = netPayout > 0 ? Number(netPayout) : Math.max(0, numAmount - numFee - numRef);

    const safeName = this._escapeHtml(userName || 'Pengguna Panen Kunci');
    const safeEmail = this._escapeHtml(userEmail || '-');
    const safePhone = this._escapeHtml(userPhone || '-');
    const safeMethod = this._escapeHtml(method ? method.toUpperCase() : 'E-WALLET');
    const safeRecipient = this._escapeHtml(recipient || '-');
    const safeHolder = this._escapeHtml(accountHolder || userName || '-');
    const safeTxId = this._escapeHtml(transactionId || 'tx_' + Date.now());
    const timeStr = this._formatTimestamp(createdAt);

    let refLine = '';
    if (numRef > 0 && referralCode) {
      refLine = `• <b>Potongan Komisi (${this._escapeHtml(referralCode)}):</b> ${this._formatRupiah(numRef)}\n`;
    }

    const message = `🔔 <b>PERMOHONAN PENARIKAN SALDO (PAYOUT) BARU!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>Data Pengguna:</b>\n` +
      `• <b>Nama:</b> ${safeName}\n` +
      `• <b>Email:</b> ${safeEmail}\n` +
      `• <b>No. HP:</b> ${safePhone}\n\n` +
      `💰 <b>Rincian Pencairan Dana:</b>\n` +
      `• <b>Nominal Penarikan:</b> <b>${this._formatRupiah(numAmount)}</b>\n` +
      `• <b>Biaya Admin:</b> ${this._formatRupiah(numFee)}\n` +
      refLine +
      `• <b>Diterima Bersih:</b> <tg-spoiler><b>${this._formatRupiah(finalNet)}</b></tg-spoiler>\n\n` +
      `🏦 <b>Tujuan Transfer:</b>\n` +
      `• <b>Metode / Bank:</b> ${safeMethod}\n` +
      `• <b>No. Rekening / E-Wallet:</b> <code>${safeRecipient}</code>\n` +
      `• <b>Atas Nama (A/N):</b> <b>${safeHolder}</b>\n\n` +
      `📋 <b>Status & Referensi:</b>\n` +
      `• <b>ID Transaksi:</b> <code>${safeTxId}</code>\n` +
      `• <b>Waktu Pengajuan:</b> ${timeStr}\n` +
      `• <b>Status:</b> ⏳ <b>Menunggu Persetujuan Admin</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `⚡ <i>Silakan buka Admin Panel untuk memeriksa rekening & mengunggah bukti transfer.</i>`;

    return this.sendMessage({ text: message });
  }

  /**
   * Kirim notifikasi persetujuan payout dan bukti transfer foto ke Telegram
   */
  async notifyWithdrawalApproved({
    transactionId,
    userName = '',
    userEmail = '',
    amount = 0,
    netPayout = 0,
    method = '',
    recipient = '',
    accountHolder = '',
    proofImage = '',
    notes = '',
    processedAt = null
  }) {
    const config = this.getConfig();
    if (!config.enabled || !config.notifyWithdrawal) {
      return { success: true, skipped: true };
    }

    const numAmount = Number(amount || 0);
    const finalNet = Number(netPayout || numAmount);
    const safeName = this._escapeHtml(userName || 'Pengguna');
    const safeEmail = this._escapeHtml(userEmail || '-');
    const safeMethod = this._escapeHtml(method ? method.toUpperCase() : 'TRANSFER');
    const safeRecipient = this._escapeHtml(recipient || '-');
    const safeHolder = this._escapeHtml(accountHolder || userName || '-');
    const safeTxId = this._escapeHtml(transactionId || '-');
    const safeNotes = this._escapeHtml(notes || 'Transfer pencairan dana berhasil diproses oleh Admin');
    const timeStr = this._formatTimestamp(processedAt);

    const message = `✅ <b>PENARIKAN SALDO (PAYOUT) DISETUJUI & SELESAI!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>Penerima:</b> ${safeName} (${safeEmail})\n` +
      `💰 <b>Nominal Ditransfer:</b> <b>${this._formatRupiah(finalNet)}</b> (Total: ${this._formatRupiah(numAmount)})\n` +
      `🏦 <b>Tujuan:</b> ${safeMethod} - <code>${safeRecipient}</code>\n` +
      `🏷️ <b>Atas Nama (A/N):</b> <b>${safeHolder}</b>\n` +
      `📄 <b>ID Transaksi:</b> <code>${safeTxId}</code>\n` +
      `📝 <b>Catatan Admin:</b> <i>${safeNotes}</i>\n` +
      `🕒 <b>Waktu Proses:</b> ${timeStr}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎉 <i>Dana berhasil dicairkan ke rekening pengguna. Bukti transfer telah tersimpan.</i>`;

    return this.sendMessage({
      text: message,
      photoUrl: (proofImage && proofImage.startsWith('http')) ? proofImage : null
    });
  }

  /**
   * Kirim notifikasi penolakan payout & pengembalian saldo ke Telegram
   */
  async notifyWithdrawalRejected({
    transactionId,
    userName = '',
    userEmail = '',
    amount = 0,
    method = '',
    recipient = '',
    reason = '',
    rejectedAt = null
  }) {
    const config = this.getConfig();
    if (!config.enabled || !config.notifyWithdrawal) {
      return { success: true, skipped: true };
    }

    const numAmount = Number(amount || 0);
    const safeName = this._escapeHtml(userName || 'Pengguna');
    const safeEmail = this._escapeHtml(userEmail || '-');
    const safeMethod = this._escapeHtml(method ? method.toUpperCase() : '-');
    const safeRecipient = this._escapeHtml(recipient || '-');
    const safeTxId = this._escapeHtml(transactionId || '-');
    const safeReason = this._escapeHtml(reason || 'Data rekening tidak sesuai atau informasi pencairan tidak valid.');
    const timeStr = this._formatTimestamp(rejectedAt);

    const message = `❌ <b>PENARIKAN SALDO (PAYOUT) DITOLAK</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>Pengguna:</b> ${safeName} (${safeEmail})\n` +
      `💰 <b>Nominal:</b> <b>${this._formatRupiah(numAmount)}</b> (Saldo direfund kembali ke user)\n` +
      `🏦 <b>Tujuan:</b> ${safeMethod} - <code>${safeRecipient}</code>\n` +
      `📄 <b>ID Transaksi:</b> <code>${safeTxId}</code>\n` +
      `⚠️ <b>Alasan Penolakan:</b> ${safeReason}\n` +
      `🕒 <b>Waktu:</b> ${timeStr}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `ℹ️ <i>Pengguna telah diberitahukan dan saldo telah dikembalikan secara utuh.</i>`;

    return this.sendMessage({ text: message });
  }

  /**
   * Kirim notifikasi pesan tiket bantuan / live chat baru dari user ke Telegram
   */
  async notifySupportMessage({
    userName = '',
    userEmail = '',
    text = '',
    timestamp = null
  }) {
    const config = this.getConfig();
    if (!config.enabled || !config.notifySupport) {
      return { success: true, skipped: true };
    }

    const safeName = this._escapeHtml(userName || 'Pengguna');
    const safeEmail = this._escapeHtml(userEmail || '-');
    const safeText = this._escapeHtml(text || '');
    const timeStr = this._formatTimestamp(timestamp);

    const message = `💬 <b>TIKET BANTUAN / LIVE CHAT USER BARU</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>Dari Pengguna:</b> ${safeName} (${safeEmail})\n` +
      `🕒 <b>Waktu:</b> ${timeStr}\n\n` +
      `📨 <b>Isi Pesan:</b>\n` +
      `<i>"${safeText}"</i>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `⚡ <i>Buka menu Live Chat di Admin Panel untuk membalas pengguna secara langsung.</i>`;

    return this.sendMessage({ text: message });
  }
}

export const telegramService = new TelegramService();
