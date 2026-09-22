import { supabase, isSupabaseConfigured } from '../../../src/infrastructure/supabase/supabaseClient.js';
import { User } from '../../../src/domain/models/User.js';

/**
 * AdminDataService
 * Mengelola interaksi langsung dengan localStorage aplikasi Panen Kunci ('panenkunci:*')
 * Mendukung Two-Way Data Sync, analitik real-time, manajemen approval penarikan,
 * manajemen gudang API key, pengguna, dan pengaturan sistem.
 */
export class AdminDataService {
  constructor(prefix = 'panenkunci:') {
    this.prefix = prefix;
    this._listeners = {};
    this._validatingKeyIds = new Set();
    this._isAutoValidating = false;
    this._cleanDummyUsers();
    this._cleanDummyKeys();
    this._initRealtimeSync();
    this._scheduleMidnightInspection();
    this._startAutoValidationWatcher();
    // Auto-sync awal dari Supabase di background
    this.fetchConfigFromSupabase().catch(() => {});
    this.fetchUsersFromSupabase().catch(() => {});
    this.fetchApiKeysFromSupabase().catch(() => {});
    this.fetchTransactionsFromSupabase().catch(() => {});
  }

  on(event, callback) {
    if (!this._listeners) this._listeners = {};
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
    return () => {
      if (this._listeners && this._listeners[event]) {
        this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
      }
    };
  }

  emit(event, data) {
    if (this._listeners && this._listeners[event]) {
      this._listeners[event].forEach(cb => {
        try { cb(data); } catch (e) { console.error(e); }
      });
    }
  }

  _initRealtimeSync() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this._syncChannel = new BroadcastChannel('panenkunci_sync');
        this._syncChannel.onmessage = async (event) => {
          const data = event.data;
          if (!data) return;
          if (data.type === 'WITHDRAWAL_REQUESTED') {
            await this.fetchTransactionsFromSupabase();
            this.emit('withdrawal_received', data);
          } else if (data.type === 'KEY_SUBMITTED' || data.type === 'KEY_DEPOSITED') {
            await this.fetchApiKeysFromSupabase();
            // Otomatis validasi key yang baru disetorkan pengguna
            const newKeyId = data.apiKey?.id || data.keyId;
            if (newKeyId) {
              this.autoValidateApiKey(newKeyId).catch(() => {});
            } else {
              this.autoValidateAllPendingKeys().catch(() => {});
            }
            this.emit('key_received', data);
          } else if (data.type === 'USER_NICKNAME_CHANGED' || data.type === 'USER_UPDATED') {
            await this.fetchUsersFromSupabase();
            this.emit('users_updated', data);
          }
        };
      } catch (e) {
        console.warn('[AdminDataService] BroadcastChannel listener warning:', e.message);
      }
    }

    if (isSupabaseConfigured() && supabase && typeof supabase.channel === 'function') {
      try {
        this._supabaseTxChannel = supabase
          .channel('admin_transactions_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'transactions' },
            async (payload) => {
              await this.fetchTransactionsFromSupabase();
              this.emit('transactions_updated', payload);
            }
          )
          .subscribe();

        this._supabaseUsersChannel = supabase
          .channel('admin_users_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'users' },
            async (payload) => {
              await this.fetchUsersFromSupabase();
              this.emit('users_updated', payload);
            }
          )
          .subscribe();

        this._supabaseKeysChannel = supabase
          .channel('admin_api_keys_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'api_keys' },
            async (payload) => {
              // Jika ada baris baru berstatus pending, jalankan auto-validasi
              if (payload.new && payload.new.status === 'pending') {
                this.autoValidateApiKey(payload.new.id).catch(() => {});
              }
              await this.fetchApiKeysFromSupabase();
              this.emit('keys_updated', payload);
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('[AdminDataService] Supabase realtime error:', err.message);
      }
    }
  }

  /**
   * Membersihkan data dummy lama (Budi, Siti, Ahmad, Dewi) dari localStorage
   */
  _cleanDummyUsers() {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(`${this.prefix}all_users`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(u =>
            u &&
            u.id !== 'usr_siti_02' &&
            u.id !== 'usr_ahmad_03' &&
            u.id !== 'usr_dewi_04' &&
            u.id !== 'usr_budi_01' &&
            u.id !== 'usr_admin_master'
          );
          if (filtered.length !== parsed.length) {
            localStorage.setItem(`${this.prefix}all_users`, JSON.stringify(filtered));
          }
        }
      }
    } catch (e) {
      console.warn('[AdminDataService] _cleanDummyUsers warning:', e);
    }
  }

  /**
   * Membersihkan data mock dummy API Key lama jika sudah ada key asli dari Supabase
   */
  _cleanDummyKeys() {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(`${this.prefix}api_keys`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Hapus key sample pending buatan (key_p01, key_p02)
          const filtered = parsed.filter(k => k && k.id !== 'key_p01' && k.id !== 'key_p02');
          if (filtered.length !== parsed.length) {
            localStorage.setItem(`${this.prefix}api_keys`, JSON.stringify(filtered));
          }
        }
      }
    } catch (e) {
      console.warn('[AdminDataService] _cleanDummyKeys warning:', e);
    }
  }

  // Helper localStorage aman
  _get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(`${this.prefix}${key}`);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch (e) {
      console.error(`[AdminDataService] Read error for key "${key}":`, e);
      return defaultValue;
    }
  }

  _set(key, value) {
    try {
      localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(value));
    } catch (e) {
      console.error(`[AdminDataService] Write error for key "${key}":`, e);
    }
  }

  /**
   * Mengambil ringkasan statistik & KPI utama untuk Dashboard
   */
  getStats() {
    const apiKeys = this.getApiKeys();
    const transactions = this.getTransactions();
    const users = this.getUsers();
    const balance = Number(this._get('wallet_balance', 0));
    const lifetime = Number(this._get('lifetime_earnings', 0));

    const validKeys = apiKeys.filter(k => k.status === 'valid');
    const invalidKeys = apiKeys.filter(k => k.status === 'invalid');
    const usedKeys = apiKeys.filter(k => k.status === 'used');
    const pendingKeys = apiKeys.filter(k => k.status === 'pending');
    const totalCredits = validKeys.reduce((sum, k) => sum + (Number(k.credits) || 80), 0);

    const withdrawals = transactions.filter(t => t.type === 'withdrawal');
    const pendingWithdrawals = withdrawals.filter(t => t.status === 'pending');
    const completedWithdrawals = withdrawals.filter(t => ['success', 'valid', 'approved', 'completed', 'berhasil'].includes(t.status));

    const totalPaidOut = completedWithdrawals.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const pendingPayoutAmount = pendingWithdrawals.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalAdminFees = completedWithdrawals.reduce((sum, t) => sum + Number(t.fee || 0), 0);
    const passiveBalance = Number(this._get('wallet_passive_balance', 0));

    return {
      totalKeys: apiKeys.length,
      validKeysCount: validKeys.length,
      invalidKeysCount: invalidKeys.length,
      usedKeysCount: usedKeys.length,
      pendingKeysCount: pendingKeys.length,
      totalCredits,
      totalPaidOut,
      pendingPayoutAmount,
      pendingCount: pendingWithdrawals.length,
      totalAdminFees,
      totalUsers: users.length,
      activeBalance: balance,
      passiveBalance,
      lifetimeEarnings: lifetime
    };
  }

  /**
   * Data untuk Chart.js (Tren setoran harian & breakdown metode pencairan)
   */
  getChartData() {
    const transactions = this.getTransactions();
    const apiKeys = this.getApiKeys();

    // 7 hari terakhir
    const days = [];
    const keyDepositsPerDay = [];
    const withdrawalVolumePerDay = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
      days.push(dayLabel);

      const keysCount = apiKeys.filter(k => {
        if (!k.createdAt) return false;
        return k.createdAt.startsWith(dateStr);
      }).length;
      keyDepositsPerDay.push(keysCount);

      const wdSum = transactions
        .filter(t => t.type === 'withdrawal' && t.createdAt && t.createdAt.startsWith(dateStr) && ['success', 'valid', 'approved', 'completed', 'berhasil'].includes(t.status))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      withdrawalVolumePerDay.push(wdSum);
    }

    // Breakdown metode pembayaran
    const methodCounts = { DANA: 0, GOPAY: 0, OVO: 0, BANK: 0 };
    transactions.filter(t => t.type === 'withdrawal').forEach(t => {
      const m = (t.method || '').toUpperCase();
      if (m.includes('DANA')) methodCounts.DANA++;
      else if (m.includes('GOPAY')) methodCounts.GOPAY++;
      else if (m.includes('OVO')) methodCounts.OVO++;
      else methodCounts.BANK++;
    });

    return {
      labels: days,
      keyDeposits: keyDepositsPerDay,
      withdrawalVolume: withdrawalVolumePerDay,
      methods: methodCounts
    };
  }

  /**
   * Mengambil dan menyinkronkan data API Key langsung dari database Supabase
   * @returns {Promise<Array>}
   */
  async fetchApiKeysFromSupabase() {
    try {
      let remoteKeys = null;

      // 1. Ambil dari server proxy (menggunakan service role key admin)
      try {
        const res = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_api_keys', table: 'api_keys' })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            remoteKeys = json.data;
          }
        }
      } catch (proxyErr) {
        console.warn('[AdminDataService] POST proxy api_keys warning:', proxyErr.message);
      }

      // 2. Fallback GET jika POST gagal
      if (!remoteKeys) {
        try {
          const res = await fetch('/api/supabase-proxy?type=api_keys');
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
              remoteKeys = json.data;
            }
          }
        } catch (getErr) {
          console.warn('[AdminDataService] GET proxy api_keys warning:', getErr.message);
        }
      }

      // 3. Fallback client-side langsung ke Supabase
      if (!remoteKeys && isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('api_keys')
            .select('*, users:user_id(id, name, email)')
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(data)) {
            remoteKeys = data.map(row => {
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
          }
        } catch (clientErr) {
          console.warn('[AdminDataService] Direct Supabase query api_keys warning:', clientErr.message);
        }
      }

      if (remoteKeys && Array.isArray(remoteKeys)) {
        const users = this.getUsers();
        const userMap = {};
        users.forEach(u => {
          if (u.id) userMap[u.id] = u;
        });

        const mappedKeys = remoteKeys.map(k => {
          const matchedUser = userMap[k.userId || k.user_id];
          let domainStatus = k.status;
          let errorMessage = k.errorMessage || k.error_message || '';
          if (errorMessage.startsWith('__PENDING__')) {
            domainStatus = 'pending';
            errorMessage = errorMessage.replace('__PENDING__', '');
          }
          return {
            id: k.id,
            keyString: k.keyString || k.key_string,
            userId: k.userId || k.user_id,
            userName: k.userName || matchedUser?.name || 'Pengguna',
            userEmail: k.userEmail || matchedUser?.email || '-',
            status: domainStatus,
            rewardAmount: Number(k.rewardAmount ?? k.reward_amount ?? 3000),
            credits: Number(k.credits ?? 80),
            errorMessage: errorMessage,
            createdAt: k.createdAt || k.created_at || new Date().toISOString(),
            source: 'supabase'
          };
        });

        this._set('api_keys', mappedKeys);

        // Jika ada kunci berstatus pending, jalankan validasi otomatis di background
        const hasPending = mappedKeys.some(k => k.status === 'pending');
        if (hasPending && !this._isAutoValidating) {
          setTimeout(() => {
            this.autoValidateAllPendingKeys().catch(() => {});
          }, 300);
        }

        return mappedKeys;
      }

      return this.getApiKeys();
    } catch (err) {
      console.warn('[AdminDataService] fetchApiKeysFromSupabase error:', err.message);
      return this.getApiKeys();
    }
  }

  /**
   * Mengambil semua API Key dengan filter dan pencarian
   */
  getApiKeys({ status = 'all', search = '' } = {}) {
    let keys = this._get('api_keys', []);

    // Jika belum ada data sama sekali di storage
    if (!Array.isArray(keys)) {
      keys = [];
    }

    // Cocokkan data pemilik dengan daftar pengguna terkini
    const users = this._get('all_users', []);
    const userMap = {};
    users.forEach(u => {
      if (u.id) userMap[u.id] = u;
    });

    return keys.map(item => {
      const u = userMap[item.userId];
      if (u) {
        if (!item.userName || item.userName === 'Pengguna') item.userName = u.name;
        if (!item.userEmail || item.userEmail === '-') item.userEmail = u.email;
      }
      return item;
    }).filter(item => {
      const matchStatus = status === 'all' || item.status === status;
      const q = search.toLowerCase();
      const matchSearch = !search ||
        (item.keyString && item.keyString.toLowerCase().includes(q)) ||
        (item.id && item.id.toLowerCase().includes(q)) ||
        (item.userId && item.userId.toLowerCase().includes(q)) ||
        (item.userName && item.userName.toLowerCase().includes(q)) ||
        (item.userEmail && item.userEmail.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }

  /**
   * Mengirim sinyal sinkronisasi instan ke tab pengguna via BroadcastChannel
   */
  _broadcastSync(data) {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('panenkunci_sync');
        bc.postMessage({
          ...data,
          timestamp: Date.now()
        });
        bc.close();
      } catch (e) {}
    }
  }

  /**
   * Perbarui status API Key (misal: 'valid', 'invalid', 'used') dan sinkronkan ke Supabase
   */
  async updateApiKeyStatus(id, newStatus) {
    const keys = this.getApiKeys();
    const idx = keys.findIndex(k => k.id === id);
    if (idx !== -1) {
      keys[idx].status = newStatus;
      this._set('api_keys', keys);

      this._broadcastSync({
        type: 'KEY_STATUS_UPDATED',
        id,
        userId: keys[idx].userId,
        newStatus
      });

      // Sinkronkan ke Supabase
      try {
        let proxySuccess = false;
        try {
          const proxyRes = await fetch('/api/supabase-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update',
              table: 'api_keys',
              id,
              data: { status: newStatus }
            })
          });
          if (proxyRes.ok) {
            const resJson = await proxyRes.json();
            if (resJson.success) proxySuccess = true;
          }
        } catch (pe) {
          console.warn('[AdminDataService] Proxy update status warning:', pe.message);
        }

        if (!proxySuccess && isSupabaseConfigured()) {
          await supabase.from('api_keys').update({ status: newStatus }).eq('id', id);
        }
      } catch (err) {
        console.warn('[AdminDataService] Sync update status ke Supabase error:', err.message);
      }

      return true;
    }
    return false;
  }

  /**
   * Mengirimkan notifikasi langsung ke inbox pengguna (localStorage & real-time broadcast)
   * @param {string} userId
   * @param {Object} param1
   * @returns {Object|null}
   */
  sendUserNotification(userId, { title, message, type = 'info', metadata = {} }) {
    if (!userId) return null;
    try {
      const notifItem = {
        id: 'notif_' + Math.random().toString(36).substring(2, 9),
        userId,
        title: title || 'Notifikasi Sistem',
        message: message || '',
        type,
        createdAt: new Date().toISOString(),
        isRead: false,
        ...metadata
      };

      // 1. Simpan ke local storage user (notifications_{userId})
      const userNotifKey = `notifications_${userId}`;
      const userNotifs = this._get(userNotifKey, []);
      if (Array.isArray(userNotifs)) {
        userNotifs.unshift(notifItem);
        this._set(userNotifKey, userNotifs);
      }

      // 2. Simpan ke daftar notifikasi global (notifications)
      const globalNotifs = this._get('notifications', []);
      if (Array.isArray(globalNotifs)) {
        globalNotifs.unshift(notifItem);
        this._set('notifications', globalNotifs);
      }

      // 3. Broadcast ke seluruh tab / aplikasi pengguna
      this._broadcastSync({
        type: 'NOTIFICATION_ADDED',
        userId,
        notification: notifItem
      });

      return notifItem;
    } catch (e) {
      console.warn('[AdminDataService] sendUserNotification error:', e.message);
      return null;
    }
  }

  /**
   * Setujui / Verifikasi API Key dari user
   * Mengubah status key menjadi 'valid', memindahkan reward dari Saldo Pasif ke Saldo Aktif,
   * menyinkronkan status ke Supabase, dan mengirimkan notifikasi sukses ke user.
   */
  async approveApiKey(keyId) {
    const keys = this.getApiKeys();
    const key = keys.find(k => k.id === keyId);
    if (!key) {
      return { success: false, message: 'API Key tidak ditemukan' };
    }
    if (key.status !== 'pending') {
      return { success: false, message: `API Key tidak dalam status pending (status: ${key.status})` };
    }

    key.status = 'valid';
    key.verifiedAt = new Date().toISOString();
    delete key.errorMessage;
    this._set('api_keys', keys);

    const rewardAmount = Number(key.rewardAmount) || 3000;
    const targetUserId = key.userId;

    // 1. Perbarui daftar api_keys spesifik pengguna (api_keys_{userId})
    if (targetUserId) {
      const userKeysKey = `api_keys_${targetUserId}`;
      const userKeys = this._get(userKeysKey, []);
      if (Array.isArray(userKeys)) {
        const uKeyIdx = userKeys.findIndex(k => k.id === keyId || k.keyString === key.keyString);
        if (uKeyIdx !== -1) {
          userKeys[uKeyIdx].status = 'valid';
          userKeys[uKeyIdx].verifiedAt = key.verifiedAt;
          delete userKeys[uKeyIdx].errorMessage;
        } else {
          userKeys.unshift({ ...key });
        }
        this._set(userKeysKey, userKeys);
      }
    }

    // 2. Pindahkan dari Saldo Pasif ke Saldo Aktif (Global Storage)
    const currentPassive = Number(this._get('wallet_passive_balance', 0));
    const newPassive = Math.max(0, currentPassive - rewardAmount);
    this._set('wallet_passive_balance', newPassive);

    const currentActive = Number(this._get('wallet_balance', 0));
    const newActive = currentActive + rewardAmount;
    this._set('wallet_balance', newActive);

    const currentLifetime = Number(this._get('lifetime_earnings', 0));
    this._set('lifetime_earnings', currentLifetime + rewardAmount);

    // 3. Pindahkan saldo pada penyimpanan spesifik pengguna (wallet_balance_{userId} & wallet_passive_balance_{userId})
    if (targetUserId) {
      const uBalKey = `wallet_balance_${targetUserId}`;
      const uPassKey = `wallet_passive_balance_${targetUserId}`;
      const uLifeKey = `lifetime_earnings_${targetUserId}`;

      const uCurrentActive = Number(this._get(uBalKey, 0));
      const uCurrentPassive = Number(this._get(uPassKey, 0));
      const uCurrentLifetime = Number(this._get(uLifeKey, 0));

      this._set(uBalKey, uCurrentActive + rewardAmount);
      this._set(uPassKey, Math.max(0, uCurrentPassive - rewardAmount));
      this._set(uLifeKey, uCurrentLifetime + rewardAmount);
    }

    // 4. Update saldo spesifik pengguna di all_users jika cocok
    const users = this._get('all_users', []);
    const uIdx = users.findIndex(u => u.id === targetUserId || (key.userEmail && u.email && u.email === key.userEmail));
    if (uIdx !== -1) {
      const userBal = Number(users[uIdx].balance || 0);
      users[uIdx].balance = userBal + rewardAmount;
      users[uIdx].customBalance = users[uIdx].balance;
      this._set('all_users', users);
    }

    // 5. Update transaksi mutasi deposit terkait di riwayat lokal
    const txs = this.getTransactions();
    const masked = key.keyString && key.keyString.length > 12 
      ? `${key.keyString.slice(0, 9)}...${key.keyString.slice(-4)}`
      : (key.keyString || '');

    let tx = txs.find(t => 
      t.type === 'deposit' && 
      t.status === 'pending' && 
      (t.description?.includes(masked) || t.description?.includes(key.id))
    ) || txs.find(t => t.type === 'deposit' && t.status === 'pending' && (!targetUserId || t.userId === targetUserId));

    if (tx) {
      tx.status = 'success';
      tx.title = 'Setoran API Key (Terverifikasi)';
      tx.description = `Terverifikasi Otomatis oleh Sistem: ${masked || key.id}`;
      tx.processedAt = new Date().toISOString();
    } else {
      tx = {
        id: 'tx_' + Math.random().toString(36).substring(2, 9),
        userId: targetUserId || 'usr_current',
        type: 'deposit',
        amount: rewardAmount,
        title: 'Setoran API Key (Terverifikasi)',
        description: `Terverifikasi Otomatis oleh Sistem: ${masked || key.id}`,
        status: 'success',
        createdAt: new Date().toISOString()
      };
      txs.unshift(tx);
    }
    this._set('transactions', txs);

    // 6. Sinkronkan juga ke riwayat transaksi spesifik user (transactions_{userId})
    if (targetUserId) {
      const userTxKey = `transactions_${targetUserId}`;
      const userTxs = this._get(userTxKey, []);
      if (Array.isArray(userTxs)) {
        const uTxIdx = userTxs.findIndex(t =>
          t.type === 'deposit' &&
          (t.description?.includes(masked) || t.description?.includes(key.id) || t.id === tx.id)
        );
        if (uTxIdx !== -1) {
          userTxs[uTxIdx].status = 'success';
          userTxs[uTxIdx].title = 'Setoran API Key (Terverifikasi)';
          userTxs[uTxIdx].description = `Terverifikasi Otomatis oleh Sistem: ${masked || key.id}`;
          userTxs[uTxIdx].processedAt = new Date().toISOString();
        } else {
          userTxs.unshift({ ...tx });
        }
        this._set(userTxKey, userTxs);
      }
    }

    // 7. Sinkronkan status key dan record transaksi terverifikasi ke database Supabase
    try {
      // a. Update status api_keys ke Supabase via proxy
      let proxyKeySuccess = false;
      try {
        const proxyRes = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            table: 'api_keys',
            id: keyId,
            data: { status: 'valid', error_message: '' }
          })
        });
        if (proxyRes.ok) {
          const resJson = await proxyRes.json();
          if (resJson.success) proxyKeySuccess = true;
        }
      } catch (pe) {
        console.warn('[AdminDataService] Proxy approve key warning:', pe.message);
      }

      if (!proxyKeySuccess && isSupabaseConfigured()) {
        await supabase.from('api_keys').update({ status: 'valid', error_message: '' }).eq('id', keyId);
      }

      // b. Perbarui mutasi deposit di Supabase transactions menjadi success (atau buat jika belum ada)
      try {
        const keySuffix = key.keyString && key.keyString.length >= 4 ? key.keyString.slice(-4) : '';
        let existingTxId = null;

        // Cek apakah transaksi deposit untuk key ini sudah ada di Supabase
        const getTxRes = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_transactions',
            table: 'transactions',
            userId: targetUserId
          })
        });

        if (getTxRes.ok) {
          const txJson = await getTxRes.json();
          if (txJson.success && Array.isArray(txJson.data)) {
            const foundTx = txJson.data.find(t =>
              t.type === 'deposit' &&
              ((keySuffix && t.description?.includes(keySuffix)) ||
               (masked && t.description?.includes(masked)) ||
               (key.keyString && t.description?.includes(key.keyString)) ||
               t.description?.includes(keyId))
            );
            if (foundTx) {
              existingTxId = foundTx.id;
            }
          }
        }

        // Jika tidak ditemukan dengan filter targetUserId, coba cari global tanpa filter userId
        if (!existingTxId) {
          try {
            const globalTxRes = await fetch('/api/supabase-proxy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'get_transactions', table: 'transactions' })
            });
            if (globalTxRes.ok) {
              const gJson = await globalTxRes.json();
              if (gJson.success && Array.isArray(gJson.data)) {
                const foundGlobal = gJson.data.find(t =>
                  t.type === 'deposit' &&
                  ((keySuffix && t.description?.includes(keySuffix)) ||
                   (masked && t.description?.includes(masked)) ||
                   (key.keyString && t.description?.includes(key.keyString)) ||
                   t.description?.includes(keyId))
                );
                if (foundGlobal) {
                  existingTxId = foundGlobal.id;
                }
              }
            }
          } catch (_) {}
        }

        if (existingTxId) {
          // Update transaksi yang sudah ada menjadi success
          await fetch('/api/supabase-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update',
              table: 'transactions',
              id: existingTxId,
              data: {
                status: 'success',
                title: 'Setoran API Key (Terverifikasi)',
                description: `Terverifikasi Otomatis oleh Sistem: ${masked || key.id}`
              }
            })
          });

          if (isSupabaseConfigured() && supabase) {
            supabase.from('transactions').update({
              status: 'success',
              title: 'Setoran API Key (Terverifikasi)',
              description: `Terverifikasi Otomatis oleh Sistem: ${masked || key.id}`
            }).eq('id', existingTxId).then(() => {}).catch(() => {});
          }
        } else {
          // Hanya insert jika belum pernah ada transaksi sama sekali
          await fetch('/api/supabase-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'insert',
              table: 'transactions',
              data: {
                user_id: targetUserId,
                type: 'deposit',
                amount: rewardAmount,
                fee: 0,
                title: 'Setoran API Key (Terverifikasi)',
                description: `Terverifikasi Otomatis oleh Sistem: ${masked || key.id}`,
                status: 'success'
              }
            })
          });
        }
      } catch (txProxyErr) {
        console.warn('[AdminDataService] Proxy update/insert tx warning:', txProxyErr.message);
      }
    } catch (err) {
      console.warn('[AdminDataService] Sync approve ke Supabase error:', err.message);
    }

    // 8. Kirim notifikasi sukses ke user bahwa key telah lolos pemantauan & dicairkan
    if (targetUserId) {
      this.sendUserNotification(targetUserId, {
        title: 'API Key Berhasil Tervalidasi!',
        message: `Selamat! API Key ${masked} telah resmi divalidasi otomatis dengan 80 kredit. Saldo reward Rp ${rewardAmount.toLocaleString('id-ID')} telah dicairkan ke Saldo Aktif Anda.`,
        type: 'success',
        metadata: { keyId, keyString: masked, rewardAmount }
      });
    }

    this._broadcastSync({
      type: 'KEY_APPROVED',
      keyId,
      userId: targetUserId,
      rewardAmount,
      newActive,
      newPassive
    });

    return { success: true, key, rewardAmount, newActive, newPassive };
  }

  /**
   * Tolak API Key dari user
   * Mengubah status key menjadi 'invalid', membatalkan reward dari Saldo Pasif,
   * dan menyinkronkan ke Supabase.
   */
  async rejectApiKey(keyId, reason = 'Kunci API tidak valid atau ditolak oleh Admin') {
    const keys = this.getApiKeys();
    const key = keys.find(k => k.id === keyId);
    if (!key) {
      return { success: false, message: 'API Key tidak ditemukan' };
    }

    const wasPending = key.status === 'pending';
    key.status = 'invalid';
    key.errorMessage = reason;
    key.rejectedAt = new Date().toISOString();
    this._set('api_keys', keys);

    const rewardAmount = Number(key.rewardAmount) || 3000;
    const targetUserId = key.userId;

    // 1. Perbarui daftar api_keys spesifik pengguna (api_keys_{userId})
    if (targetUserId) {
      const userKeysKey = `api_keys_${targetUserId}`;
      const userKeys = this._get(userKeysKey, []);
      if (Array.isArray(userKeys)) {
        const uKeyIdx = userKeys.findIndex(k => k.id === keyId || k.keyString === key.keyString);
        if (uKeyIdx !== -1) {
          userKeys[uKeyIdx].status = 'invalid';
          userKeys[uKeyIdx].errorMessage = reason;
          userKeys[uKeyIdx].rejectedAt = key.rejectedAt;
        }
        this._set(userKeysKey, userKeys);
      }
    }

    // 2. Jika sebelumnya pending, batalkan dari saldo pasif
    if (wasPending) {
      const currentPassive = Number(this._get('wallet_passive_balance', 0));
      const newPassive = Math.max(0, currentPassive - rewardAmount);
      this._set('wallet_passive_balance', newPassive);

      if (targetUserId) {
        const uPassKey = `wallet_passive_balance_${targetUserId}`;
        const uCurrentPassive = Number(this._get(uPassKey, 0));
        this._set(uPassKey, Math.max(0, uCurrentPassive - rewardAmount));
      }
    }

    // 3. Update status transaksi terkait jika ada di local storage
    const txs = this.getTransactions();
    const masked = key.keyString && key.keyString.length > 12 
      ? `${key.keyString.slice(0, 9)}...${key.keyString.slice(-4)}`
      : (key.keyString || '');

    const tx = txs.find(t => 
      t.type === 'deposit' && 
      t.status === 'pending' && 
      (t.description?.includes(masked) || t.description?.includes(key.id))
    );

    if (tx) {
      tx.status = 'failed';
      tx.title = 'Setoran API Key Ditolak';
      tx.description = `Ditolak Admin: ${reason}`;
      tx.processedAt = new Date().toISOString();
      this._set('transactions', txs);
    }

    let userTxs = [];
    let uTxIdx = -1;
    if (targetUserId) {
      const userTxKey = `transactions_${targetUserId}`;
      userTxs = this._get(userTxKey, []);
      if (Array.isArray(userTxs)) {
        uTxIdx = userTxs.findIndex(t =>
          t.type === 'deposit' &&
          t.status === 'pending' &&
          (t.description?.includes(masked) || t.description?.includes(key.id))
        );
        if (uTxIdx !== -1) {
          userTxs[uTxIdx].status = 'failed';
          userTxs[uTxIdx].title = 'Setoran API Key Ditolak';
          userTxs[uTxIdx].description = `Ditolak Admin: ${reason}`;
          userTxs[uTxIdx].processedAt = new Date().toISOString();
          this._set(userTxKey, userTxs);
        }
      }
    }

    // 4. Sinkronkan perubahan status ke database Supabase
    try {
      let proxySuccess = false;
      try {
        const proxyRes = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            table: 'api_keys',
            id: keyId,
            data: { status: 'invalid', error_message: reason }
          })
        });
        if (proxyRes.ok) {
          const resJson = await proxyRes.json();
          if (resJson.success) proxySuccess = true;
        }
      } catch (pe) {
        console.warn('[AdminDataService] Proxy reject warning:', pe.message);
      }

      if (!proxySuccess && isSupabaseConfigured()) {
        await supabase.from('api_keys').update({ status: 'invalid', error_message: reason }).eq('id', keyId);
      }

      // Sinkronkan juga status transaksi di Supabase menjadi 'failed'
      try {
        const targetTxId = tx?.id || (userTxs && userTxs[uTxIdx]?.id);
        if (targetTxId && targetTxId.includes('-')) {
          await fetch('/api/supabase-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update',
              table: 'transactions',
              id: targetTxId,
              data: {
                status: 'failed',
                title: 'Setoran API Key Ditolak',
                description: `Ditolak Admin: ${reason}`
              }
            })
          });
        }
      } catch (txErr) {
        console.warn('[AdminDataService] Sync reject transaction ke Supabase warning:', txErr.message);
      }
    } catch (err) {
      console.warn('[AdminDataService] Sync reject ke Supabase error:', err.message);
    }

    // 5. Kirim notifikasi pada user terkait alasan invalid / penolakan
    if (targetUserId) {
      this.sendUserNotification(targetUserId, {
        title: 'Setoran API Key Dinyatakan Tidak Valid',
        message: `API Key ${masked} dinyatakan tidak valid: ${reason}. Saldo pasif Anda telah disesuaikan.`,
        type: 'error',
        metadata: { keyId, keyString: masked, reason }
      });
    }

    this._broadcastSync({
      type: 'KEY_REJECTED',
      keyId,
      userId: targetUserId,
      reason
    });

    return { success: true, key, reason };
  }

  /**
   * Hapus API Key dari penyimpanan lokal dan Supabase
   */
  async deleteApiKey(id) {
    const keys = this.getApiKeys();
    const deletedKey = keys.find(k => k.id === id);
    const updated = keys.filter(k => k.id !== id);
    this._set('api_keys', updated);

    this._broadcastSync({
      type: 'KEY_DELETED',
      id,
      userId: deletedKey?.userId
    });

    // Sinkronkan penghapusan ke Supabase
    try {
      let proxySuccess = false;
      try {
        const res = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', table: 'api_keys', id })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) proxySuccess = true;
        }
      } catch (pe) {
        console.warn('[AdminDataService] Proxy delete api_key warning:', pe.message);
      }

      if (!proxySuccess && isSupabaseConfigured()) {
        await supabase.from('api_keys').delete().eq('id', id);
      }

      // Hapus juga transaksi deposit terkait di Supabase
      if (deletedKey) {
        const suffix = (deletedKey.keyString && deletedKey.keyString.length >= 4) ? deletedKey.keyString.slice(-4) : '';
        const masked = deletedKey.keyString && deletedKey.keyString.length > 12
          ? `${deletedKey.keyString.slice(0, 9)}...${deletedKey.keyString.slice(-4)}`
          : (deletedKey.keyString || '');

        const allTxs = this.getTransactions();
        const relatedTx = allTxs.find(t =>
          t.type === 'deposit' &&
          ((suffix && t.description?.includes(suffix)) || (masked && t.description?.includes(masked)) || t.description?.includes(id))
        );

        if (relatedTx && relatedTx.id && relatedTx.id.includes('-')) {
          await fetch('/api/supabase-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', table: 'transactions', id: relatedTx.id })
          });
        }
      }
    } catch (err) {
      console.warn('[AdminDataService] Sync delete api_key ke Supabase error:', err.message);
    }

    return true;
  }

  /**
   * Melakukan sinkronisasi kredit API Key langsung ke server Kie.ai
   * @param {string} keyId
   * @param {string} [keyString]
   * @returns {Promise<{ success: boolean, isValidKey?: boolean, credit?: number, message?: string }>}
   */
  async syncKieCredit(keyId, keyString = '') {
    const keys = this.getApiKeys();
    const key = keys.find(k => k.id === keyId);
    const targetKeyString = (keyString || key?.keyString || '').trim();

    if (!targetKeyString) {
      return { success: false, message: 'String API Key tidak ditemukan' };
    }

    try {
      const res = await fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_kie_credit',
          apiKey: targetKeyString,
          keyId: keyId || null
        })
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        if (key) {
          key.credits = json.credit;
          this._set('api_keys', keys);
        }
        await this.fetchApiKeysFromSupabase();
        return {
          success: true,
          isValidKey: true,
          credit: json.credit,
          message: json.message || 'Kredit berhasil disinkronkan langsung dari Kie.ai'
        };
      } else {
        if (key && json.isValidKey === false) {
          key.credits = 0;
          key.status = 'invalid';
          key.errorMessage = json.error || 'API Key Tidak Sah (Kie.ai 401)';
          this._set('api_keys', keys);
        }
        await this.fetchApiKeysFromSupabase();
        return {
          success: false,
          isValidKey: json.isValidKey !== undefined ? json.isValidKey : false,
          credit: 0,
          message: json.error || json.message || 'Gagal sinkronisasi kredit dari Kie.ai'
        };
      }
    } catch (err) {
      console.error('[AdminDataService] syncKieCredit error:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Melakukan sinkronisasi batch semua API Key langsung ke server Kie.ai
   * @returns {Promise<{ success: boolean, total: number, updatedCount: number, message: string }>}
   */
  async syncAllKieCredits() {
    try {
      const res = await fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all_kie_credits' })
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        await this.fetchApiKeysFromSupabase();
        return {
          success: true,
          total: json.total || 0,
          updatedCount: json.updatedCount || 0,
          message: `Berhasil sinkronisasi ${json.updatedCount} dari ${json.total} API Key ke Kie.ai!`
        };
      }

      return {
        success: false,
        message: json.error || 'Gagal melakukan sinkronisasi massal ke Kie.ai'
      };
    } catch (err) {
      console.error('[AdminDataService] syncAllKieCredits error:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Validasi Otomatis satu API Key ke server Kie.ai dengan aturan:
   * 1. Key hanya tervalidasi setelah 3 hari (72 jam) masa pemantauan.
   * 2. Sistem terus memantau keaktifan dan kredit (harus 80 credit).
   * 3. Jika kredit berkurang (< 80) atau tidak aktif -> otomatis dinyatakan INVALID,
   *    saldo pasif dibatalkan, dan user menerima notifikasi alasan penolakannya.
   * 4. Jika umur key >= 3 hari dan kredit tetap 80 -> otomatis disetujui (VALID), reward dicairkan
   *    ke Saldo Aktif, dan user menerima notifikasi sukses.
   * 5. Jika umur key < 3 hari dan kredit 80 -> status tetap PENDING (dalam masa pemantauan 3 hari).
   * @param {string} keyId
   * @param {boolean} [forceApprove=false]
   * @returns {Promise<{ success: boolean, validated: boolean, status: string, credit: number, message: string, daysRemaining?: number }>}
   */
  async autoValidateApiKey(keyId, forceApprove = false) {
    if (!keyId || this._validatingKeyIds.has(keyId)) {
      return { success: false, message: 'Key sedang divalidasi...' };
    }

    const keys = this.getApiKeys();
    const key = keys.find(k => k.id === keyId);
    if (!key) {
      return { success: false, message: 'API Key tidak ditemukan' };
    }

    if (key.status !== 'pending') {
      return {
        success: true,
        validated: key.status === 'valid',
        status: key.status,
        credit: key.credits || 80,
        message: `Key sudah berstatus ${key.status}`
      };
    }

    this._validatingKeyIds.add(keyId);

    try {
      // 1. Cek langsung ke server Kie.ai via proxy
      let syncRes = null;
      try {
        const res = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sync_kie_credit',
            apiKey: key.keyString,
            keyId: key.id
          })
        });
        if (res.ok) {
          syncRes = await res.json();
        }
      } catch (e) {
        console.warn('[AdminDataService] Auto-validate proxy fetch warning:', e.message);
      }

      if (!syncRes) {
        syncRes = await this.syncKieCredit(key.id, key.keyString);
      }

      const liveCredit = Number(syncRes.credit) || 0;
      const isKieActive = syncRes.isValidKey === true;
      const isCredit80 = (liveCredit === 80 || liveCredit >= 80);

      // Hitung masa pemantauan menggunakan helper terpusat
      const holdInfo = this.getKeyHoldInfo(key);
      const isHoldExpired = holdInfo.isReady;
      const daysRemaining = Math.max(0, Math.ceil(holdInfo.diffMs / (24 * 60 * 60 * 1000)));

      // Pastikan data key tetap sinkron di local storage
      const freshKeys = this.getApiKeys();
      let freshKey = freshKeys.find(k => k.id === keyId);
      if (!freshKey) {
        freshKeys.unshift({ ...key });
        freshKey = freshKeys[0];
      }
      freshKey.credits = liveCredit;
      freshKey.lastInspectedAt = new Date().toISOString();
      this._set('api_keys', freshKeys);

      // KONDISI A: Kredit berkurang (< 80) atau key tidak aktif -> INVALID
      if (!isKieActive || !isCredit80) {
        let reason = '';
        if (!isKieActive) {
          reason = `Kie.ai tidak aktif atau API Key tidak sah (${syncRes.error || syncRes.message || '401 Unauthorized'})`;
        } else {
          reason = `Kredit Kie.ai berkurang menjadi ${liveCredit} cr (syarat minimal: 80 cr)`;
        }
        await this.rejectApiKey(keyId, reason);
        console.log(`[AdminDataService] Key ${keyId} dinyatakan INVALID: ${reason}`);
        return {
          success: false,
          validated: false,
          status: 'invalid',
          credit: liveCredit,
          reason,
          message: reason
        };
      }

      // KONDISI B: Key aktif & kredit tetap 80
      if (isHoldExpired || forceApprove) {
        // Masa pemantauan telah selesai -> APPROVE & CAIRKAN KE SALDO AKTIF
        const appRes = await this.approveApiKey(keyId);
        console.log(`[AdminDataService] Key ${keyId} VALID setelah masa pemantauan (${liveCredit} cr)`);
        return {
          success: true,
          validated: true,
          status: 'valid',
          credit: liveCredit,
          rewardAmount: appRes.rewardAmount || 3000,
          message: `Masa pantau selesai & kredit 80 cr: Berhasil tervalidasi otomatis dan dicairkan ke Saldo Aktif!`
        };
      } else {
        // Belum selesai: Tetap PENDING dalam masa pemantauan
        console.log(`[AdminDataService] Key ${keyId} aktif (80 cr), masih dalam masa pantau.`);
        return {
          success: true,
          validated: false,
          status: 'pending',
          credit: liveCredit,
          daysRemaining,
          message: `Key aktif & kredit 80 cr. Status tetap pending dalam masa pemantauan.`
        };
      }
    } catch (err) {
      console.error('[AdminDataService] autoValidateApiKey exception:', err);
      return { success: false, message: err.message };
    } finally {
      this._validatingKeyIds.delete(keyId);
    }
  }

  /**
   * Menjalankan inspeksi berkala jam 12 malam WIB (00:00 WIB = 17:00 UTC)
   * Memeriksa seluruh kode Kie aktif dan mempunyai kredit 80:
   * - Jika kredit berkurang (< 80) atau tidak aktif -> INVALID & kirim notifikasi user alasan invalid-nya.
   * - Jika umur key >= 3 hari dan kredit 80 -> VALID & dicairkan ke saldo aktif + notifikasi user.
   * - Jika umur key < 3 hari dan kredit 80 -> TETAP PENDING dalam masa pemantauan.
   * @returns {Promise<Object>}
   */
  async runMidnightKieInspection() {
    console.log('[AdminDataService] 🌙 Menjalankan Inspeksi Rutin Jam 12 Malam WIB...');
    const keys = this.getApiKeys();
    const pendingKeys = keys.filter(k => k.status === 'pending');

    const results = {
      inspectedAt: new Date().toISOString(),
      totalInspected: pendingKeys.length,
      approvedCount: 0,
      rejectedCount: 0,
      pendingCount: 0,
      details: []
    };

    for (const key of pendingKeys) {
      try {
        const res = await this.autoValidateApiKey(key.id);
        if (res.status === 'valid') {
          results.approvedCount++;
        } else if (res.status === 'invalid') {
          results.rejectedCount++;
        } else {
          results.pendingCount++;
        }
        results.details.push({
          id: key.id,
          keyString: key.keyString ? `${key.keyString.slice(0, 8)}...${key.keyString.slice(-4)}` : '',
          userId: key.userId,
          status: res.status,
          credit: res.credit,
          message: res.message
        });
      } catch (err) {
        results.details.push({ id: key.id, error: err.message });
      }
    }

    // Catat log inspeksi terakhir di localStorage
    this._set('last_midnight_inspection', results);

    this.emit('midnight_inspection_completed', results);
    this._broadcastSync({
      type: 'MIDNIGHT_INSPECTION_COMPLETED',
      results
    });

    return results;
  }

  /**
   * Menjadwalkan timer otomatis setiap jam 12 malam WIB (00:00:00 WIB = 17:00:00 UTC)
   */
  _scheduleMidnightInspection() {
    if (this._midnightTimeoutId) {
      clearTimeout(this._midnightTimeoutId);
      this._midnightTimeoutId = null;
    }

    const calcMsToNextMidnightWIB = () => {
      const now = new Date();
      const utcMs = now.getTime();
      const wibOffset = 7 * 60 * 60 * 1000;
      const wibTime = new Date(utcMs + wibOffset);

      // Jam 00:00:00 WIB hari berikutnya
      const nextMidnightWib = new Date(wibTime);
      nextMidnightWib.setUTCHours(0, 0, 0, 0);
      nextMidnightWib.setUTCDate(nextMidnightWib.getUTCDate() + 1);

      const nextMidnightUtc = nextMidnightWib.getTime() - wibOffset;
      return Math.max(1000, nextMidnightUtc - utcMs);
    };

    const msUntilMidnight = calcMsToNextMidnightWIB();
    const hours = Math.floor(msUntilMidnight / (60 * 60 * 1000));
    const minutes = Math.floor((msUntilMidnight % (60 * 60 * 1000)) / (60 * 1000));
    console.log(`[AdminDataService] 🌙 Inspeksi 00:00 WIB terjadwal dalam ${hours} jam ${minutes} menit`);

    this._midnightTimeoutId = setTimeout(async () => {
      try {
        await this.runMidnightKieInspection();
      } catch (e) {
        console.error('[AdminDataService] Error runMidnightKieInspection:', e);
      }
      // Jadwalkan untuk 24 jam berikutnya
      this._scheduleMidnightInspection();
    }, msUntilMidnight);
  }

  /**
   * Menghitung sisa waktu menuju jam 12 malam WIB berikutnya
   * @returns {{ hours: number, minutes: number, ms: number, text: string }}
   */
  getNextMidnightWIBRemaining() {
    const now = new Date();
    const utcMs = now.getTime();
    const wibOffset = 7 * 60 * 60 * 1000;
    const wibTime = new Date(utcMs + wibOffset);

    const nextMidnightWib = new Date(wibTime);
    nextMidnightWib.setUTCHours(0, 0, 0, 0);
    nextMidnightWib.setUTCDate(nextMidnightWib.getUTCDate() + 1);

    const nextMidnightUtc = nextMidnightWib.getTime() - wibOffset;
    const ms = Math.max(0, nextMidnightUtc - utcMs);
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

    return {
      hours,
      minutes,
      ms,
      text: `${hours} jam ${minutes} menit`
    };
  }

  /**
   * Validasi Otomatis SEMUA API Key yang masih berstatus 'pending'
   * @returns {Promise<{ success: boolean, total: number, validatedCount: number, rejectedCount: number, results: Array, message: string }>}
   */
  async autoValidateAllPendingKeys() {
    if (this._isAutoValidating) {
      return { success: false, message: 'Validasi massal sedang berjalan...' };
    }
    this._isAutoValidating = true;
    try {
      const keys = this.getApiKeys();
      const pendingKeys = keys.filter(k => k.status === 'pending');
      if (pendingKeys.length === 0) {
        return {
          success: true,
          total: 0,
          validatedCount: 0,
          rejectedCount: 0,
          message: 'Tidak ada API Key yang menunggu validasi.',
          results: []
        };
      }

      const results = [];
      for (const key of pendingKeys) {
        try {
          const res = await this.autoValidateApiKey(key.id);
          results.push({ id: key.id, ...res });
        } catch (err) {
          results.push({ id: key.id, success: false, error: err.message });
        }
      }

      const validatedCount = results.filter(r => r.validated || r.status === 'valid').length;
      const rejectedCount = results.filter(r => r.status === 'invalid').length;

      // Sinkronkan ulang data dari Supabase
      await this.fetchApiKeysFromSupabase();

      this.emit('api_keys_auto_validated', {
        total: pendingKeys.length,
        validatedCount,
        rejectedCount,
        results
      });

      return {
        success: true,
        total: pendingKeys.length,
        validatedCount,
        rejectedCount,
        results,
        message: `Selesai: ${validatedCount} kunci tervalidasi (80 cr), ${rejectedCount} kunci ditolak.`
      };
    } finally {
      this._isAutoValidating = false;
    }
  }

  /**
   * Menghitung informasi durasi holding, waktu jatuh tempo, dan status kesiapan validasi API Key
   * @param {Object} key
   * @returns {{ isReferred: boolean, val: number, unit: string, durationMs: number, holdDays: number, defaultNormal: number, defaultReferral: number, holdTime: number, diffMs: number, isReady: boolean }}
   */
  getKeyHoldInfo(key) {
    if (!key) {
      return { isReferred: false, val: 3, unit: 'days', durationMs: 259200000, holdDays: 3, defaultNormal: 3, defaultReferral: 2, holdTime: Date.now(), diffMs: 0, isReady: true };
    }

    const config = this.getConfig();
    const users = this.getUsers();
    const u = (key.userId || key.userEmail)
      ? users.find(user => user.id === key.userId || (key.userEmail && user.email === key.userEmail))
      : null;
    const isReferred = Boolean(u && (u.referredBy || u.referred_by));

    const defaultNormalVal = config.holdValueNormal ?? config.holdDaysNormal ?? 3;
    const defaultNormalUnit = config.holdUnitNormal || 'days';
    const defaultRefVal = config.holdValueReferral ?? config.holdDaysReferral ?? 2;
    const defaultRefUnit = config.holdUnitReferral || 'days';

    const val = isReferred ? defaultRefVal : defaultNormalVal;
    const unit = isReferred ? defaultRefUnit : defaultNormalUnit;

    let durationMs = val * 24 * 60 * 60 * 1000;
    if (unit === 'minutes') durationMs = val * 60 * 1000;
    else if (unit === 'hours') durationMs = val * 60 * 60 * 1000;

    const holdDays = durationMs / (24 * 60 * 60 * 1000);
    const holdTime = new Date(key.holdUntil || (new Date(key.createdAt).getTime() + durationMs)).getTime();
    const diffMs = holdTime - Date.now();
    const isReady = diffMs <= 0;

    return {
      isReferred,
      val,
      unit,
      durationMs,
      holdDays,
      defaultNormal: defaultNormalVal,
      defaultReferral: defaultRefVal,
      holdTime,
      diffMs,
      isReady
    };
  }

  /**
   * Memeriksa dan memvalidasi otomatis semua API Key pending yang masa pantau holding-nya sudah selesai
   * @returns {Promise<{ totalReady: number, validatedCount: number, rejectedCount: number, results: Array }>}
   */
  async autoValidateReadyKeys() {
    if (this._isAutoValidating) {
      return { totalReady: 0, validatedCount: 0, rejectedCount: 0, results: [] };
    }

    const keys = this.getApiKeys();
    const pendingKeys = keys.filter(k => k.status === 'pending');
    if (pendingKeys.length === 0) {
      return { totalReady: 0, validatedCount: 0, rejectedCount: 0, results: [] };
    }

    const readyKeys = pendingKeys.filter(k => {
      const info = this.getKeyHoldInfo(k);
      return info.isReady;
    });

    if (readyKeys.length === 0) {
      return { totalReady: 0, validatedCount: 0, rejectedCount: 0, results: [] };
    }

    this._isAutoValidating = true;
    console.log(`[AdminDataService] 🤖 Memulai validasi otomatis untuk ${readyKeys.length} API Key yang siap validasi...`);

    const results = [];
    try {
      for (const rk of readyKeys) {
        try {
          const res = await this.autoValidateApiKey(rk.id);
          results.push({ id: rk.id, ...res });
        } catch (err) {
          console.warn(`[AdminDataService] Gagal memvalidasi otomatis key ${rk.id}:`, err.message);
          results.push({ id: rk.id, success: false, error: err.message });
        }
      }

      const validatedCount = results.filter(r => r.validated || r.status === 'valid').length;
      const rejectedCount = results.filter(r => r.status === 'invalid').length;

      await this.fetchApiKeysFromSupabase();

      this.emit('keys_auto_validated', {
        totalReady: readyKeys.length,
        validatedCount,
        rejectedCount,
        results
      });

      return {
        totalReady: readyKeys.length,
        validatedCount,
        rejectedCount,
        results
      };
    } finally {
      this._isAutoValidating = false;
    }
  }

  /**
   * Menjalankan pemantau otomatis (Auto Validation Watcher) setiap 10 detik
   * Memastikan setiap API Key yang masa holding-nya selesai langsung tervalidasi otomatis
   */
  _startAutoValidationWatcher() {
    if (this._autoValidationIntervalId) {
      clearInterval(this._autoValidationIntervalId);
      this._autoValidationIntervalId = null;
    }

    // Jalankan pengecekan pertama setelah inisialisasi awal
    setTimeout(() => {
      this.autoValidateReadyKeys().catch(e => console.warn('[AdminDataService] Initial autoValidateReadyKeys error:', e.message));
    }, 2000);

    // Loop pemantauan berkala setiap 10 detik
    this._autoValidationIntervalId = setInterval(() => {
      this.autoValidateReadyKeys().catch(e => console.warn('[AdminDataService] Periodic autoValidateReadyKeys error:', e.message));
    }, 10000);
  }

  /**
   * Ekspor API Keys ke berbagai format file
   */
  exportApiKeys(format = 'txt', statusFilter = 'valid') {
    const keys = this.getApiKeys({ status: statusFilter });
    let content = '';
    let filename = `panenkunci_apikeys_${statusFilter}_${new Date().toISOString().slice(0, 10)}`;
    let mimeType = 'text/plain';

    if (format === 'txt') {
      filename += '.txt';
      content = keys.map(k => k.keyString).join('\n');
      mimeType = 'text/plain;charset=utf-8';
    } else if (format === 'csv') {
      filename += '.csv';
      const header = 'ID,API_Key,User_ID,Status,Kredit,Reward,Tanggal_Setor\n';
      const rows = keys.map(k => `"${k.id}","${k.keyString}","${k.userId}","${k.status}","${k.credits || 80}","${k.rewardAmount || 3000}","${k.createdAt}"`).join('\n');
      content = header + rows;
      mimeType = 'text/csv;charset=utf-8';
    } else if (format === 'json') {
      filename += '.json';
      content = JSON.stringify(keys, null, 2);
      mimeType = 'application/json;charset=utf-8';
    }

    // Trigger download di browser
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { total: keys.length, filename };
  }

  /**
   * Mengambil semua transaksi (setoran & penarikan) dengan filter
   */
  getTransactions({ type = 'all', status = 'all', search = '' } = {}) {
    let txs = this._get('transactions', []);

    if (!Array.isArray(txs)) {
      txs = [];
      this._set('transactions', txs);
    }

    // Ambil daftar users & session aktif untuk sinkronisasi relasi data pemohon
    const users = this._get('all_users', []);
    let authUser = null;
    try {
      const rawAuth = localStorage.getItem('panenkunci:auth_user');
      if (rawAuth) authUser = JSON.parse(rawAuth);
    } catch (e) {}

    // Perkaya data transaksi dengan data profil pengguna pemohon & sinkronisasi referral
    const adminCfg = this.getAdminConfig?.() || {};
    const refCutPercent = adminCfg.referralPercent || adminCfg.referralCutPercent || 5;

    const enriched = txs.map(t => {
      const u = (Array.isArray(users) ? users : []).find(user => 
        (user && user.id && t.userId && user.id === t.userId) || 
        (user && user.email && t.userEmail && user.email.toLowerCase() === t.userEmail.toLowerCase())
      ) || (authUser && (authUser.id === t.userId || (authUser.email && t.userEmail === authUser.email)) ? authUser : null);

      const userName = t.userName || u?.name || u?.full_name || (authUser && authUser.id === t.userId ? authUser.name : null) || (t.userId && !t.userId.includes('-') ? t.userId.replace(/^usr_/, '') : 'Pengguna Member');
      const userEmail = t.userEmail || u?.email || (authUser && authUser.id === t.userId ? authUser.email : '-');
      const userPhone = t.userPhone || u?.phone || (authUser && authUser.id === t.userId ? authUser.phone : '-');
      const accountHolder = t.accountHolder || u?.accountHolder || u?.account_holder || (authUser && authUser.id === t.userId ? (authUser.accountHolder || authUser.name) : null) || userName;
      const userBank = t.userBank || u?.bankName || u?.bank_name || (authUser && authUser.id === t.userId ? authUser.bankName : null) || t.method;
      const userAccountNumber = t.userAccountNumber || u?.accountNumber || u?.account_number || (authUser && authUser.id === t.userId ? authUser.accountNumber : null) || t.recipient;
      const kycStatus = Boolean(u?.isVerified || u?.status === 'verified' || (authUser && authUser.id === t.userId && authUser.isVerified));

      // Dapatkan kode referral milik pemohon
      const userReferralCode = t.userReferralCode || u?.referralCode || u?.referral_code || (t.userId ? User.generateReferralCode(t.userId || t.userEmail || userName) : '');

      // Dapatkan kode pengundang yang ditautkan pemohon
      let referredBy = (t.referredBy || t.referralCode || u?.referredBy || u?.referred_by || '').trim().toUpperCase();
      if (!referredBy && typeof localStorage !== 'undefined') {
        try {
          referredBy = (localStorage.getItem('pk_bound_ref_' + t.userId) ||
                        localStorage.getItem('pk_bound_ref_' + (userEmail || '').toLowerCase()) ||
                        '').trim().toUpperCase();
        } catch (_) {}
      }
      if (!referredBy && t.description) {
        const matchCode = t.description.match(/Potongan\s+Referral\s*\(([^)]+)\)/i);
        if (matchCode) referredBy = matchCode[1].trim().toUpperCase();
      }

      const amount = Number(t.amount || 0);
      const fee = Number(t.fee || 0);
      let referralDeduction = Number(t.referralDeduction || t.referral_deduction || 0);

      if (!referralDeduction && t.description) {
        const matchNominal = t.description.match(/Potongan\s+Referral[^:]*:\s*Rp\s*([\d.,]+)/i);
        if (matchNominal) {
          referralDeduction = Number(matchNominal[1].replace(/[.,]/g, '')) || 0;
        }
      }

      if (!referralDeduction && referredBy && refCutPercent > 0 && t.type === 'withdrawal') {
        referralDeduction = Math.round(amount * (refCutPercent / 100));
      }

      let netPayout = Number(t.netPayout !== undefined ? t.netPayout : t.net_payout);
      if (isNaN(netPayout) || netPayout <= 0 || (referralDeduction > 0 && netPayout >= (amount - fee))) {
        netPayout = Math.max(0, amount - fee - referralDeduction);
      }

      return {
        ...t,
        userName,
        userEmail,
        userPhone,
        accountHolder,
        userBank,
        userAccountNumber,
        kycStatus,
        userReferralCode,
        referredBy,
        referralCode: referredBy,
        referralDeduction,
        referral_deduction: referralDeduction,
        netPayout,
        net_payout: netPayout
      };
    });

    return enriched.filter(t => {
      const matchType = type === 'all' || t.type === type;
      const matchStatus = status === 'all' ||
        t.status === status ||
        (status === 'success' && ['valid', 'approved', 'completed', 'berhasil'].includes(t.status)) ||
        (status === 'failed' && ['rejected', 'ditolak'].includes(t.status));
      const q = search.toLowerCase();
      const matchSearch = !search ||
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.userId && t.userId.toLowerCase().includes(q)) ||
        (t.userName && t.userName.toLowerCase().includes(q)) ||
        (t.userEmail && t.userEmail.toLowerCase().includes(q)) ||
        (t.accountHolder && t.accountHolder.toLowerCase().includes(q)) ||
        (t.recipient && t.recipient.toLowerCase().includes(q)) ||
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.referredBy && t.referredBy.toLowerCase().includes(q)) ||
        (t.userReferralCode && t.userReferralCode.toLowerCase().includes(q));
      return matchType && matchStatus && matchSearch;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Mengambil dan menyinkronkan data riwayat transaksi langsung dari database Supabase
   * @returns {Promise<Array>}
   */
  async fetchTransactionsFromSupabase() {
    try {
      const res = await fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_transactions', table: 'transactions' })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const adminCfg = this.getAdminConfig?.() || {};
          const refCutPercent = adminCfg.referralPercent || adminCfg.referralCutPercent || 5;

          const existingTxs = this.getTransactions();
          const localTxMap = {};
          if (Array.isArray(existingTxs)) {
            existingTxs.forEach(item => {
              if (item && item.id) localTxMap[item.id] = item;
            });
          }

          const normalized = json.data.map(t => {
            const amount = Number(t.amount || 0);
            const fee = Number(t.fee || 0);
            let referralCode = (t.referralCode || t.referral_code || t.referredBy || t.referred_by || '').trim().toUpperCase();
            let referralDeduction = Number(t.referralDeduction || t.referral_deduction || 0);

            if (!referralCode && t.description) {
              const matchCode = t.description.match(/Potongan\s+Referral\s*\(([^)]+)\)/i);
              if (matchCode) referralCode = matchCode[1].trim().toUpperCase();
            }
            if (!referralDeduction && t.description) {
              const matchNominal = t.description.match(/Potongan\s+Referral[^:]*:\s*Rp\s*([\d.,]+)/i);
              if (matchNominal) {
                referralDeduction = Number(matchNominal[1].replace(/[.,]/g, '')) || 0;
              }
            }

            if (!referralDeduction && referralCode && t.type === 'withdrawal') {
              referralDeduction = Math.round(amount * (refCutPercent / 100));
            }

            let netPayout = Number(t.netPayout !== undefined ? t.netPayout : t.net_payout);
            if (isNaN(netPayout) || netPayout <= 0 || (referralDeduction > 0 && netPayout >= (amount - fee))) {
              netPayout = Math.max(0, amount - fee - referralDeduction);
            }

            const localTx = localTxMap[t.id] || {};
            const proofImage = t.proof_image || t.proofImage || localTx.proofImage || '';
            const proofNotes = t.proof_notes || t.proofNotes || localTx.proofNotes || '';
            const processedAt = t.processed_at || t.processedAt || localTx.processedAt || null;

            return {
              ...t,
              id: t.id,
              userId: t.userId || t.user_id,
              user_id: t.user_id || t.userId,
              userName: t.userName || t.users?.name || 'Pengguna',
              userEmail: t.userEmail || t.users?.email || '-',
              userPhone: t.userPhone || t.users?.phone || '',
              userBank: t.userBank || t.users?.bank_name || '',
              userAccountNumber: t.userAccountNumber || t.users?.account_number || '',
              type: t.type,
              amount,
              fee,
              referralCode,
              referral_code: referralCode,
              referredBy: referralCode,
              referralDeduction,
              referral_deduction: referralDeduction,
              netPayout,
              net_payout: netPayout,
              title: t.title || 'Transaksi Saldo',
              description: t.description || '',
              status: t.status || 'pending',
              method: t.method || '',
              recipient: t.recipient || '',
              proofImage,
              proof_image: proofImage,
              proofNotes,
              proof_notes: proofNotes,
              processedAt,
              processed_at: processedAt,
              createdAt: t.createdAt || t.created_at || new Date().toISOString(),
              created_at: t.created_at || t.createdAt || new Date().toISOString()
            };
          }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

          this._set('transactions', normalized);
          return normalized;
        }
      }
    } catch (e) {
      console.warn('[AdminDataService] fetchTransactionsFromSupabase warning:', e.message);
    }
    return this.getTransactions();
  }

  /**
   * Setujui permintaan penarikan dana lengkap dengan bukti transfer dan kirim notifikasi ke user
   * @param {string} transactionId
   * @param {Object} [options]
   * @param {string} [options.proofImage] Base64 data URL atau URL gambar bukti transfer
   * @param {string} [options.notes] Catatan transfer dari admin
   */
  async approveWithdrawal(transactionId, { proofImage = '', notes = '', referralDeduction: optDeduction, referralCode: optRefCode } = {}) {
    // 0. Jika bukti transfer berupa base64 Data URL, unggah ke Cloudflare R2 dengan timeout cepat
    if (proofImage && proofImage.startsWith('data:')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const upRes = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upload_r2',
            base64Data: proofImage,
            folder: 'proofs',
            fileName: `proof_${transactionId}_${Date.now()}.png`
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (upRes.ok) {
          const upJson = await upRes.json();
          if (upJson.success && upJson.url) {
            proofImage = upJson.url;
          }
        }
      } catch (r2Err) {
        console.warn('[AdminDataService] R2 upload fast fallback to local proof:', r2Err.message);
      }
    }

    const txs = this.getTransactions();
    const idx = txs.findIndex(t => t.id === transactionId);
    if (idx !== -1) {
      const tx = txs[idx];
      tx.status = 'success';
      tx.processedAt = new Date().toISOString();
      if (proofImage) tx.proofImage = proofImage;
      if (notes) tx.proofNotes = notes;
      this._set('transactions', txs);

      // Sinkronkan ke transaksi spesifik pengguna (transactions_{userId})
      const targetUserId = tx.userId || 'usr_budi_01';
      const userTxKey = `transactions_${targetUserId}`;
      const userTxs = this._get(userTxKey, []);
      if (Array.isArray(userTxs)) {
        let uIdx = userTxs.findIndex(t => t.id === transactionId);
        if (uIdx === -1) {
          uIdx = userTxs.findIndex(t => t.type === 'withdrawal' && (t.status === 'pending' || t.status === 'valid') && Number(t.amount) === Number(tx.amount));
        }
        if (uIdx !== -1) {
          userTxs[uIdx].status = 'success';
          userTxs[uIdx].processedAt = tx.processedAt;
          if (proofImage) userTxs[uIdx].proofImage = proofImage;
          if (notes) userTxs[uIdx].proofNotes = notes;
          this._set(userTxKey, userTxs);
        }
      }

      // Buat entri notifikasi baru untuk pengguna (headbar notifikasi)
      const notifsKey = `notifications_${targetUserId}`;
      const notifs = this._get(notifsKey, []);
      const newNotif = {
        id: 'notif_' + Math.random().toString(36).substring(2, 9),
        userId: targetUserId,
        type: 'withdrawal_success',
        title: 'Penarikan Dana Berhasil Ditransfer!',
        message: `Pencairan dana sebesar Rp ${Number(tx.amount || 0).toLocaleString('id-ID')} ke ${tx.recipient || tx.method || 'rekening tujuan'} telah berhasil dikirim oleh Admin.`,
        amount: Number(tx.amount || 0),
        fee: Number(tx.fee || 0),
        method: tx.method || '',
        recipient: tx.recipient || '',
        transactionId: tx.id,
        proofImage: proofImage || '',
        proofNotes: notes || '',
        createdAt: new Date().toISOString(),
        isRead: false
      };
      notifs.unshift(newNotif);
      this._set(notifsKey, notifs);

      // Cadangkan ke notifikasi global
      const globalNotifs = this._get('notifications', []);
      globalNotifs.unshift(newNotif);
      this._set('notifications', globalNotifs);

      // Sinkronkan update status transaksi ke database Supabase
      try {
        const syncRes = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            table: 'transactions',
            id: transactionId,
            data: {
              status: 'success',
              proof_image: proofImage || '',
              proof_notes: notes || '',
              updated_at: new Date().toISOString()
            }
          })
        });
        if (syncRes.ok) {
          const syncJson = await syncRes.json();
          if (!syncJson.success) {
            console.error('[AdminDataService] Supabase approve sync failed:', syncJson.error);
            return { success: false, message: `Gagal memperbarui database: ${syncJson.error}` };
          }
        } else {
          const errText = await syncRes.text();
          console.error('[AdminDataService] Supabase proxy returned error status:', syncRes.status, errText);
          return { success: false, message: `Gagal menghubungi database (HTTP ${syncRes.status})` };
        }
      } catch (err) {
        console.warn('[AdminDataService] Supabase approve withdrawal sync warning:', err.message);
        return { success: false, message: `Gagal sinkronisasi ke server: ${err.message}` };
      }

      // Siarkan ke user tab via BroadcastChannel
      this._broadcastSync({
        type: 'WITHDRAWAL_APPROVED',
        transactionId,
        userId: targetUserId,
        status: 'success',
        amount: Number(tx.amount || 0),
        proofImage: proofImage || '',
        proofNotes: notes || ''
      });

      // Proses Bagi Hasil / Komisi Kode Referral jika penarikan memiliki potongan referral
      let referralCode = (optRefCode || tx.referralCode || tx.referredBy || '').trim().toUpperCase();
      let referralDeduction = optDeduction !== undefined ? Number(optDeduction) : Number(tx.referralDeduction || tx.referral_deduction || 0);

      // Jika referralCode belum ada, coba cek dari description
      if (!referralCode && tx.description) {
        const matchCode = tx.description.match(/Potongan\s+Referral\s*\(([^)]+)\)/i);
        if (matchCode) referralCode = matchCode[1].trim().toUpperCase();
      }

      // Jika referralDeduction belum ada, coba cek dari description
      if (!referralDeduction && tx.description) {
        const matchNominal = tx.description.match(/Potongan\s+Referral[^:]*:\s*Rp\s*([\d.,]+)/i);
        if (matchNominal) {
          referralDeduction = Number(matchNominal[1].replace(/[.,]/g, '')) || 0;
        }
      }

      // Jika ada referralCode tapi belum ada nominal potongan, hitung dari config
      if (!referralDeduction && referralCode) {
        const adminCfg = this.getAdminConfig?.() || {};
        const refCutPercent = adminCfg.referralPercent || adminCfg.referralCutPercent || 5;
        referralDeduction = Math.round(Number(tx.amount || 0) * (refCutPercent / 100));
      }

      // Pastikan data referral juga tersimpan di transaksi penarikan itu sendiri
      if (referralCode) {
        tx.referralCode = referralCode;
        tx.referredBy = referralCode;
      }
      if (referralDeduction > 0) {
        tx.referralDeduction = referralDeduction;
        tx.referral_deduction = referralDeduction;
      }
      let netPayout = Number(tx.netPayout !== undefined ? tx.netPayout : tx.net_payout);
      if (isNaN(netPayout) || netPayout <= 0 || (referralDeduction > 0 && netPayout >= (Number(tx.amount || 0) - Number(tx.fee || 0)))) {
        netPayout = Math.max(0, Number(tx.amount || 0) - Number(tx.fee || 0) - referralDeduction);
        tx.netPayout = netPayout;
        tx.net_payout = netPayout;
      }
      this._set('transactions', txs);

      if (referralCode && referralDeduction > 0) {
        try {
          // Cari user pemilik referral code secara komprehensif
          let allUsers = this.getUsers();
          let referrer = allUsers.find(u => {
            if ((u.referralCode || u.referral_code || '').trim().toUpperCase() === referralCode) return true;
            const codeById = User.generateReferralCode(u.id);
            const codeByEmail = User.generateReferralCode(u.email);
            const codeByName = User.generateReferralCode(u.name);
            return codeById === referralCode || codeByEmail === referralCode || codeByName === referralCode;
          });

          if (!referrer) {
            const rawAll = this._get('all_users', []);
            referrer = (Array.isArray(rawAll) ? rawAll : []).find(u => {
              if ((u.referral_code || u.referralCode || '').trim().toUpperCase() === referralCode) return true;
              const codeById = User.generateReferralCode(u.id);
              const codeByEmail = User.generateReferralCode(u.email);
              const codeByName = User.generateReferralCode(u.name);
              return codeById === referralCode || codeByEmail === referralCode || codeByName === referralCode;
            });
          }

          // Jika belum ditemukan di data lokal, cek via server / Supabase
          if (!referrer) {
            try {
              const resCheck = await fetch('/api/supabase-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check_referral_code', code: referralCode })
              });
              if (resCheck.ok) {
                const jsonCheck = await resCheck.json();
                if (jsonCheck.success && jsonCheck.referrer) {
                  referrer = jsonCheck.referrer;
                }
              }
            } catch (_) {}
          }

          if (referrer && referrer.id) {
            const referrerId = referrer.id;

            // 1. Tambahkan saldo aktif dompet spesifik referrer (wallet_balance_{userId})
            const refBalanceKey = `wallet_balance_${referrerId}`;
            const currentRefBalance = Number(this._get(refBalanceKey, 0));
            const newRefBalance = currentRefBalance + referralDeduction;
            this._set(refBalanceKey, newRefBalance);

            // 2. Tambahkan saldo seumur hidup (lifetime earnings)
            const refLifetimeKey = `lifetime_earnings_${referrerId}`;
            const currentLifetime = Number(this._get(refLifetimeKey, 0));
            this._set(refLifetimeKey, currentLifetime + referralDeduction);

            // 3. Jika pengguna yang sedang login di tab aktif adalah akun referrer ini, update saldo aktif langsung
            const currUser = this._get('current_user', {});
            if (currUser && (currUser.id === referrerId || (currUser.email && referrer.email && currUser.email.toLowerCase() === referrer.email.toLowerCase()))) {
              const currentActive = Number(this._get('wallet_balance', 0));
              this._set('wallet_balance', currentActive + referralDeduction);

              const curLifetime = Number(this._get('lifetime_earnings', 0));
              this._set('lifetime_earnings', curLifetime + referralDeduction);
            }

            // 4. Update saldo di daftar all_users
            const rawUsers = this._get('all_users', []);
            if (Array.isArray(rawUsers)) {
              const uIdx = rawUsers.findIndex(u => u.id === referrerId || (referrer.email && u.email && u.email.toLowerCase() === referrer.email.toLowerCase()));
              if (uIdx !== -1) {
                rawUsers[uIdx].balance = Number(rawUsers[uIdx].balance || 0) + referralDeduction;
                rawUsers[uIdx].customBalance = rawUsers[uIdx].balance;
                this._set('all_users', rawUsers);
              }
            }

            // 5. Catat mutasi transaksi komisi untuk referrer
            const commTxId = 'comm_' + (transactionId || '').replace(/^tx_/, '') + '_' + Date.now().toString(36);
            const commTx = {
              id: commTxId,
              userId: referrerId,
              userName: referrer.name || 'Pemilik Referral',
              userEmail: referrer.email || '',
              type: 'deposit',
              amount: referralDeduction,
              fee: 0,
              title: 'Komisi Referral Masuk',
              description: `Komisi bagi hasil dari penarikan downline (${tx.userName || 'Member'} • ${referralCode})`,
              status: 'success',
              method: 'referral_commission',
              recipient: referrer.phone || referrer.email || referralCode,
              createdAt: new Date().toISOString()
            };

            // Simpan ke riwayat transaksi spesifik user referrer
            const refUserTxKey = `transactions_${referrerId}`;
            const refUserTxs = this._get(refUserTxKey, []);
            if (Array.isArray(refUserTxs) && !refUserTxs.some(t => t.id === commTxId)) {
              refUserTxs.unshift(commTx);
              this._set(refUserTxKey, refUserTxs);
            }

            // Simpan ke daftar transaksi global admin
            const allTxs = this.getTransactions();
            if (!allTxs.some(t => t.id === commTxId)) {
              allTxs.unshift(commTx);
              this._set('transactions', allTxs);
            }

            // 6. Buat notifikasi khusus untuk akun referrer
            const refNotifsKey = `notifications_${referrerId}`;
            const refNotifs = this._get(refNotifsKey, []);
            const refNotif = {
              id: 'notif_ref_' + Math.random().toString(36).substring(2, 9),
              userId: referrerId,
              type: 'referral_commission',
              title: 'Komisi Referral Masuk!',
              message: `Selamat! Saldo aktif Anda bertambah Rp ${referralDeduction.toLocaleString('id-ID')} dari komisi referral (${referralCode}).`,
              amount: referralDeduction,
              transactionId: commTxId,
              createdAt: new Date().toISOString(),
              isRead: false
            };
            refNotifs.unshift(refNotif);
            this._set(refNotifsKey, refNotifs);

            // 7. Cadangkan transaksi komisi ke Supabase
            try {
              await fetch('/api/supabase-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'insert',
                  table: 'transactions',
                  data: {
                    id: commTx.id,
                    user_id: referrerId,
                    type: 'deposit',
                    amount: commTx.amount,
                    status: 'success',
                    title: commTx.title,
                    description: commTx.description,
                    method: 'referral_commission',
                    recipient: commTx.recipient,
                    created_at: commTx.createdAt
                  }
                })
              });
            } catch (errComm) {
              console.warn('[AdminDataService] Supabase commTx sync warning:', errComm.message);
            }

            // 8. Broadcast ke klien/tab bahwa komisi telah dikreditkan ke saldo aktif
            this._broadcastSync({
              type: 'REFERRAL_COMMISSION_CREDITED',
              referrerId,
              amount: referralDeduction,
              newBalance: newRefBalance,
              transactionId: commTxId,
              referralCode
            });
            this._broadcastSync({
              type: 'BALANCE_UPDATED',
              userId: referrerId,
              balance: newRefBalance
            });
          }
        } catch (refErr) {
          console.warn('[AdminDataService] Crediting referral commission warning:', refErr.message);
        }
      }

      return { success: true, transaction: tx, notification: newNotif };
    }
    return { success: false, message: 'Transaksi tidak ditemukan' };
  }

  /**
   * Mengambil data detail akun user berdasarkan transaksi
   * @param {Object} tx
   * @returns {Object|null}
   */
  getUserByTransaction(tx) {
    if (!tx) return null;
    const users = this.getUsers();
    const user = users.find(u => 
      (u.id && tx.userId && u.id === tx.userId) ||
      (u.email && tx.userEmail && u.email.toLowerCase() === tx.userEmail.toLowerCase())
    );
    if (user) return user;

    const curr = this._get('current_user');
    if (curr && (curr.id === tx.userId || (curr.email && tx.userEmail && curr.email.toLowerCase() === tx.userEmail.toLowerCase()))) {
      return curr;
    }

    return {
      id: tx.userId || 'usr_budi_01',
      name: tx.userName || 'Budi Santoso',
      email: tx.userEmail || '',
      phone: tx.recipient || '081234567890',
      bankName: tx.method ? tx.method.toUpperCase() : 'DANA',
      accountNumber: tx.recipient || '081234567890',
      accountHolder: (tx.userName || 'BUDI SANTOSO').toUpperCase(),
      referralCode: tx.userReferralCode || '',
      referredBy: tx.referredBy || tx.referralCode || '',
      isVerified: Boolean(tx.kycStatus)
    };
  }

  /**
   * Tolak permintaan penarikan dana dan OTOMATIS REFUND saldo ke dompet user
   */
  async rejectWithdrawal(transactionId, reason = 'Data rekening tidak valid') {
    const txs = this.getTransactions();
    const idx = txs.findIndex(t => t.id === transactionId);
    if (idx === -1) {
      return { success: false, message: 'Transaksi tidak ditemukan' };
    }

    const tx = txs[idx];
    if (tx.status === 'failed') {
      return { success: false, message: 'Transaksi ini sudah ditolak sebelumnya' };
    }

    // Update status transaksi
    tx.status = 'failed';
    tx.rejectionReason = reason;
    tx.description = `${tx.description} (Ditolak: ${reason})`;
    tx.processedAt = new Date().toISOString();
    this._set('transactions', txs);

    // Kembalikan saldo pengguna (Refund)
    const refundAmount = Number(tx.amount || 0);
    const currentBalance = Number(this._get('wallet_balance', 0));
    const newBalance = currentBalance + refundAmount;
    this._set('wallet_balance', newBalance);

    // Tambah record mutasi pengembalian saldo
    const refundTx = {
      id: 'tx_ref_' + Math.random().toString(36).substring(2, 8),
      userId: tx.userId || 'usr_budi_01',
      type: 'deposit',
      amount: refundAmount,
      title: 'Pengembalian Dana (Refund)',
      description: `Refund penarikan #${tx.id}: ${reason}`,
      status: 'success',
      createdAt: new Date().toISOString()
    };
    txs.unshift(refundTx);
    this._set('transactions', txs);

    // Sinkronkan juga cache transaksi dan saldo per user (transactions_{userId})
    if (tx.userId) {
      const userTxKey = `transactions_${tx.userId}`;
      const userTxs = this._get(userTxKey, []);
      const uIdx = userTxs.findIndex(t => t.id === transactionId);
      if (uIdx !== -1) {
        userTxs[uIdx].status = 'failed';
        userTxs[uIdx].rejectionReason = reason;
        userTxs[uIdx].description = tx.description;
        userTxs[uIdx].processedAt = tx.processedAt;
      }
      userTxs.unshift(refundTx);
      this._set(userTxKey, userTxs);

      const userBalKey = `wallet_balance_${tx.userId}`;
      const userBal = Number(this._get(userBalKey, 0));
      this._set(userBalKey, userBal + refundAmount);

      // Tambahkan notifikasi ke akun user
      const notifsKey = `notifications_${tx.userId}`;
      const notifs = this._get(notifsKey, []);
      const newNotif = {
        id: 'notif_' + Math.random().toString(36).substring(2, 9),
        userId: tx.userId,
        type: 'withdrawal_failed',
        title: 'Permintaan Penarikan Ditolak',
        message: `Penarikan sebesar Rp ${refundAmount.toLocaleString('id-ID')} ditolak (${reason}). Dana telah dikembalikan ke saldo aktif Anda.`,
        amount: refundAmount,
        createdAt: new Date().toISOString(),
        isRead: false
      };
      notifs.unshift(newNotif);
      this._set(notifsKey, notifs);

      // Cadangkan ke notifikasi global
      const globalNotifs = this._get('notifications', []);
      globalNotifs.unshift(newNotif);
      this._set('notifications', globalNotifs);
    }

    // Sinkronkan update status transaksi ke database Supabase
    try {
      await fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          table: 'transactions',
          id: transactionId,
          data: {
            status: 'failed',
            description: tx.description,
            updated_at: new Date().toISOString()
          }
        })
      });
    } catch (err) {
      console.warn('[AdminDataService] Supabase reject withdrawal sync warning:', err.message);
    }

    // Siarkan refund ke user tab
    this._broadcastSync({
      type: 'WITHDRAWAL_REJECTED',
      transactionId,
      userId: tx.userId,
      status: 'failed',
      reason,
      refundAmount
    });

    return { success: true, refundAmount, newBalance, transaction: tx };
  }

  /**
   * Mengambil dan menyinkronkan data pengguna asli langsung dari database Supabase
   * @returns {Promise<Array>}
   */
  async fetchUsersFromSupabase() {
    try {
      let remoteUsers = null;

      // 1. Ambil dari server proxy (menggunakan service role key admin)
      try {
        const res = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_users', table: 'users' })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            remoteUsers = json.data;
          }
        }
      } catch (proxyErr) {
        console.warn('[AdminDataService] POST proxy warning:', proxyErr.message);
      }

      // 2. Fallback jika POST gagal (coba GET)
      if (!remoteUsers) {
        try {
          const res = await fetch('/api/supabase-proxy');
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
              remoteUsers = json.data;
            }
          }
        } catch (getErr) {
          console.warn('[AdminDataService] GET proxy warning:', getErr.message);
        }
      }

      // 3. Fallback client-side langsung ke Supabase jika proxy offline/gagal
      if (!remoteUsers && isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(data)) {
            remoteUsers = data;
          }
        } catch (clientErr) {
          console.warn('[AdminDataService] Direct Supabase query warning:', clientErr.message);
        }
      }

      if (remoteUsers && Array.isArray(remoteUsers)) {
        // Pertahankan custom / manual balance yang pernah diubah admin jika ada
        const existingUsers = this._get('all_users', []);
        const balanceMap = {};
        const manualMap = {};
        existingUsers.forEach(u => {
          if (u.id) {
            if (u.manualBalance !== undefined) manualMap[u.id] = u.manualBalance;
            if (u.customBalance !== undefined) balanceMap[u.id] = u.customBalance;
          }
        });

        // Filter keluar akun konfigurasi sistem
        const cleanRemote = remoteUsers.filter(row =>
          row.id !== '00000000-0000-0000-0000-000000000001' &&
          row.role !== 'system_config' &&
          !row.email?.includes('system_config')
        );

        // Petakan kolom Supabase ke objek pengguna di admin panel
        const mappedUsers = cleanRemote.map(row => {
          const bank = (row.bank_name || '').trim();
          const acc = (row.account_number || '').trim();
          const phone = (row.phone || '').trim();
          const hasPayment = Boolean(bank && bank !== '-' && ((acc && acc !== '-') || (phone && phone !== '-')));
          const lastActive = row.updated_at ? new Date(row.updated_at).getTime() : 0;
          const isOnline = Boolean(lastActive && (Date.now() - lastActive < 60000));

          const localAccs = this._get('registered_accounts', []);
          const matchedLocal = Array.isArray(localAccs) ? localAccs.find(a => a.id === row.id || (a.email && row.email && a.email.toLowerCase() === row.email.toLowerCase())) : null;
          const localReferredBy = matchedLocal?.referredBy || (this._get('current_user', {})?.id === row.id ? this._get('current_user', {})?.referredBy : '') || '';
          const generatedCode = User.generateReferralCode(row.id || row.email || row.name);

          return {
            id: row.id,
            name: row.name || 'Tanpa Nama',
            email: row.email || '-',
            phone: row.phone || '-',
            bankName: row.bank_name || '-',
            accountNumber: row.account_number || '-',
            accountHolder: row.account_holder || row.name || '-',
            role: row.role || 'user',
            isVerified: Boolean(row.is_verified),
            isOnline: isOnline,
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || null,
            avatar: (row.avatar && row.avatar !== '/avatar.png') ? row.avatar : '',
            nicknameUpdatedAt: row.nickname_updated_at || row.nicknameUpdatedAt || null,
            referralCode: row.referral_code || row.referralCode || generatedCode,
            referredBy: (row.referred_by || row.referredBy || localReferredBy || '').trim().toUpperCase(),
            customBalance: balanceMap[row.id] !== undefined ? balanceMap[row.id] : undefined,
            manualBalance: manualMap[row.id] !== undefined ? manualMap[row.id] : undefined
          };
        });

        this._set('all_users', mappedUsers);
        return this.getUsers();
      }
    } catch (e) {
      console.error('[AdminDataService] Gagal fetch users dari Supabase:', e);
    }

    return this.getUsers();
  }

  /**
   * Mengambil daftar seluruh pengguna dari cache data tersinkron
   */
  getAllUsers(options = {}) {
    return this.getUsers(options);
  }

  getUsers({ search = '' } = {}) {
    const rawUsers = this._get('all_users', []);

    // Filter keluar data dummy dan akun sistem
    const users = (Array.isArray(rawUsers) ? rawUsers : []).filter(u =>
      u &&
      u.id !== 'usr_siti_02' &&
      u.id !== 'usr_ahmad_03' &&
      u.id !== 'usr_dewi_04' &&
      u.id !== 'usr_budi_01' &&
      u.id !== 'usr_admin_master' &&
      u.id !== '00000000-0000-0000-0000-000000000001' &&
      u.role !== 'system_config' &&
      !u.email?.includes('system_config')
    );

    // Hubungkan dengan data setoran kunci & transaksi penarikan
    const apiKeys = this.getApiKeys();
    const transactions = this.getTransactions();

    const enriched = users.map(u => {
      const userKeys = apiKeys.filter(k => k.userId === u.id || (u.email && k.userEmail === u.email));
      const userWithdrawals = transactions.filter(t => (t.userId === u.id || (u.email && t.userEmail === u.email)) && t.type === 'withdrawal' && ['success', 'valid', 'approved', 'completed', 'berhasil'].includes(t.status));
      const totalWithdrawn = userWithdrawals.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      
      const validUserKeys = userKeys.filter(k => k.status === 'valid');
      const validKeysCount = validUserKeys.length;
      const keysEarnings = validUserKeys.reduce((sum, k) => sum + (Number(k.rewardAmount) || 3000), 0);

      const userCommissions = transactions.filter(t => 
        (t.userId === u.id || (u.email && t.userEmail === u.email)) &&
        (t.method === 'referral_commission' || t.title?.includes('Referral') || t.description?.includes('Referral')) &&
        t.status === 'success'
      );
      const totalCommissions = userCommissions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const calculatedBalance = Math.max(0, keysEarnings + totalCommissions - totalWithdrawn);

      // Ambil saldo dari local storage user spesifik jika ada
      const userBalKey = `wallet_balance_${u.id}`;
      const storedUserBal = this._get(userBalKey, null);
      const currUser = this._get('current_user', {});
      const isCurrUser = currUser.id === u.id || (currUser.email && u.email && currUser.email === u.email);
      const storedActiveBal = isCurrUser ? this._get('wallet_balance', null) : null;

      let balance = calculatedBalance;
      if (storedUserBal !== null && !isNaN(Number(storedUserBal))) {
        balance = Number(storedUserBal);
      } else if (storedActiveBal !== null && !isNaN(Number(storedActiveBal))) {
        balance = Number(storedActiveBal);
      }

      // Jika ada manual balance dari admin (Atur Saldo)
      if (u.manualBalance !== undefined && !isNaN(Number(u.manualBalance))) {
        balance = Number(u.manualBalance);
      } else if (u.customBalance !== undefined && !isNaN(Number(u.customBalance))) {
        if (Number(u.customBalance) > balance) {
          balance = Number(u.customBalance);
        }
      }

      // Pastikan saldo tidak pernah tertinggal dari hasil valid keys aktual dikurangi penarikan
      if (balance < calculatedBalance) {
        balance = calculatedBalance;
      }

      return {
        ...u,
        totalKeys: userKeys.length,
        validKeys: validKeysCount,
        totalWithdrawn,
        balance
      };
    });

    if (!search) return enriched;
    const q = search.toLowerCase();
    return enriched.filter(u =>
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      (u.id && u.id.toLowerCase().includes(q)) ||
      (u.referredBy && u.referredBy.toLowerCase().includes(q))
    );
  }

  /**
   * Perbarui profil / status KYC / saldo pengguna (tersinkron ke localStorage dan Supabase)
   */
  async updateUser(userId, updateData) {
    const users = this._get('all_users', []);
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updateData };
      if (updateData.balance !== undefined) {
        const numBal = Number(updateData.balance);
        users[idx].customBalance = numBal;
        users[idx].manualBalance = numBal;
        users[idx].balance = numBal;

        // Sinkronkan ke local storage user spesifik agar User App mendapatkan saldo baru ini
        this._set(`wallet_balance_${userId}`, numBal);

        const curr = this._get('current_user', {});
        if (curr.id === userId || (curr.email && users[idx].email && curr.email === users[idx].email)) {
          this._set('wallet_balance', numBal);
        }

        // Broadcast event BALANCE_UPDATED agar tab User App langsung sinkron tanpa refresh
        if (typeof BroadcastChannel !== 'undefined') {
          try {
            const bc = new BroadcastChannel('panenkunci_sync');
            bc.postMessage({
              type: 'BALANCE_UPDATED',
              userId,
              balance: numBal
            });
            setTimeout(() => bc.close(), 100);
          } catch (e) {}
        }
      }
      this._set('all_users', users);

      // Sinkronkan ke tabel users Supabase di database
      try {
        const payload = {};
        if (updateData.isVerified !== undefined) payload.is_verified = updateData.isVerified;
        if (updateData.name !== undefined) payload.name = updateData.name;
        if (updateData.phone !== undefined) payload.phone = updateData.phone;
        if (updateData.bankName !== undefined) payload.bank_name = updateData.bankName;
        if (updateData.accountNumber !== undefined) payload.account_number = updateData.accountNumber;
        if (updateData.accountHolder !== undefined) payload.account_holder = updateData.accountHolder;
        if (updateData.role !== undefined) payload.role = updateData.role;

        if (Object.keys(payload).length > 0) {
          let proxySuccess = false;
          try {
            const proxyRes = await fetch('/api/supabase-proxy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'update', table: 'users', id: userId, data: payload })
            });
            if (proxyRes.ok) {
              const resJson = await proxyRes.json();
              if (resJson.success) proxySuccess = true;
            }
          } catch (pe) {
            console.warn('[AdminDataService] Proxy update warning:', pe.message);
          }

          if (!proxySuccess && isSupabaseConfigured()) {
            await supabase.from('users').update(payload).eq('id', userId);
          }
        }
      } catch (err) {
        console.warn('[AdminDataService] Sync update ke Supabase warning:', err.message);
      }

      // Jika user yang diupdate adalah current_user aktif
      const curr = this._get('current_user', {});
      if (curr.id === userId) {
        this._set('current_user', { ...curr, ...updateData });
      }

      return true;
    }
    return false;
  }

  /**
   * Hapus pengguna dari daftar dan Supabase
   */
  async deleteUser(userId) {
    let users = this._get('all_users', []);
    users = users.filter(u => u.id !== userId);
    this._set('all_users', users);

    try {
      let proxySuccess = false;
      try {
        const res = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', table: 'users', id: userId })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) proxySuccess = true;
        }
      } catch (pe) {
        console.warn('[AdminDataService] Proxy delete warning:', pe.message);
      }

      if (!proxySuccess && isSupabaseConfigured()) {
        await supabase.from('users').delete().eq('id', userId);
      }
      return true;
    } catch (err) {
      console.warn('[AdminDataService] Delete user Supabase warning:', err.message);
      return false;
    }
  }

  /**
   * Konfigurasi Sistem & Tarif
   */
  getConfig() {
    return this._get('admin_config', {
      rewardPerKey: 3000,
      minWithdrawal: 50000,
      feeDana: 1000,
      feeGopay: 1000,
      feeOvo: 1000,
      feeBank: 2500,
      referralPercent: 5,
      holdDaysNormal: 3,
      holdDaysReferral: 2,
      holdValueNormal: 3,
      holdUnitNormal: 'days',
      holdValueReferral: 2,
      holdUnitReferral: 'days',
      validationMode: 'simulation',
      autoApproveThreshold: 0
    });
  }

  /**
   * Mengambil konfigurasi sistem dari Supabase / Server
   * @returns {Promise<Object>}
   */
  async fetchConfigFromSupabase() {
    try {
      let remoteConfig = null;

      // 1. Coba lewat proxy POST
      try {
        const res = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_system_config' })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.config) {
            remoteConfig = json.config;
          }
        }
      } catch (_) {}

      // 2. Coba lewat proxy GET
      if (!remoteConfig) {
        try {
          const res = await fetch('/api/supabase-proxy?type=config');
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.config) {
              remoteConfig = json.config;
            }
          }
        } catch (_) {}
      }

      // 3. Fallback direct client Supabase
      if (!remoteConfig && isSupabaseConfigured() && supabase) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('avatar')
            .eq('id', '00000000-0000-0000-0000-000000000001')
            .maybeSingle();

          if (!error && data && data.avatar) {
            remoteConfig = typeof data.avatar === 'string' ? JSON.parse(data.avatar) : data.avatar;
          }
        } catch (_) {}
      }

      if (remoteConfig && typeof remoteConfig === 'object') {
        const current = this.getConfig();
        const merged = { ...current, ...remoteConfig };
        this._set('admin_config', merged);
        return merged;
      }
    } catch (err) {
      console.warn('[AdminDataService] fetchConfigFromSupabase error:', err.message);
    }
    return this.getConfig();
  }

  /**
   * Menyimpan konfigurasi sistem ke LocalStorage dan Supabase secara persisten
   * @param {Object} newConfig
   */
  async saveConfig(newConfig) {
    this._set('admin_config', newConfig);

    // Pancarkan event lokal
    try {
      window.dispatchEvent(new CustomEvent('panenkunci:config_updated', { detail: newConfig }));
    } catch (e) {}

    // Broadcast lintas tab / browser window
    this._broadcastSync({
      type: 'CONFIG_UPDATED',
      config: newConfig
    });

    // Simpan ke Supabase (Database Pusat)
    try {
      let proxySaved = false;
      try {
        const res = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_system_config', data: newConfig })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) proxySaved = true;
        }
      } catch (_) {}

      if (!proxySaved && isSupabaseConfigured() && supabase) {
        await supabase
          .from('users')
          .upsert({
            id: '00000000-0000-0000-0000-000000000001',
            name: 'System Config',
            email: 'system_config@panenkunci.internal',
            role: 'system_config',
            avatar: JSON.stringify(newConfig),
            is_verified: true,
            updated_at: new Date().toISOString()
          });
      }
    } catch (err) {
      console.warn('[AdminDataService] saveConfig to Supabase warning:', err.message);
    }

    return true;
  }

  /**
   * Seed Mock Realistis untuk demonstrasi admin yang memukau
   */
  seedDemoData() {
    this._set('api_keys', this._getInitialApiKeys(true));
    this._set('transactions', this._getInitialTransactions(true));
    this._set('wallet_balance', 125000);
    this._set('lifetime_earnings', 580000);
    return true;
  }

  /**
   * Mock data awal API Keys
   */
  _getInitialApiKeys(extended = false) {
    const now = Date.now();
    const base = [
      {
        id: 'key_01',
        keyString: 'sk-kie-8f92a1bc3d4e5f6g7h8i9j0k',
        userId: 'usr_budi_01',
        status: 'valid',
        rewardAmount: 3000,
        credits: 80,
        createdAt: new Date(now - 3600000 * 2).toISOString()
      },
      {
        id: 'key_02',
        keyString: 'sk-kie-x7b9c2da1e4f5a6b7c8d9e0f',
        userId: 'usr_budi_01',
        status: 'invalid',
        rewardAmount: 0,
        credits: 0,
        errorMessage: 'Kuota kredit Kie.ai sudah habis / 0 kredit.',
        createdAt: new Date(now - 86400000 * 1).toISOString()
      },
      {
        id: 'key_03',
        keyString: 'sk-kie-3m5n8pq7r9s1t2u3v4w5x6y7',
        userId: 'usr_budi_01',
        status: 'valid',
        rewardAmount: 3000,
        credits: 80,
        createdAt: new Date(now - 86400000 * 2).toISOString()
      },
      {
        id: 'key_p01',
        keyString: 'sk-kie-p4ss1v3k3y778899aabbcc01',
        userId: 'usr_ahmad_03',
        status: 'pending',
        rewardAmount: 3000,
        credits: 80,
        createdAt: new Date(now - 1800000).toISOString()
      },
      {
        id: 'key_p02',
        keyString: 'sk-kie-p4ss1v3d3w1001122334455',
        userId: 'usr_dewi_04',
        status: 'pending',
        rewardAmount: 3000,
        credits: 80,
        createdAt: new Date(now - 900000).toISOString()
      }
    ];

    if (!extended) return base;

    return [
      ...base,
      {
        id: 'key_04',
        keyString: 'sk-kie-9102837465abcde123456789',
        userId: 'usr_siti_02',
        status: 'valid',
        rewardAmount: 3000,
        credits: 80,
        createdAt: new Date(now - 3600000 * 5).toISOString()
      },
      {
        id: 'key_05',
        keyString: 'sk-kie-aa11bb22cc33dd44ee55ff66',
        userId: 'usr_siti_02',
        status: 'used',
        rewardAmount: 3000,
        credits: 80,
        createdAt: new Date(now - 86400000 * 3).toISOString()
      },
      {
        id: 'key_06',
        keyString: 'sk-kie-invalid0000000000deadbeef',
        userId: 'usr_ahmad_03',
        status: 'invalid',
        rewardAmount: 0,
        credits: 0,
        errorMessage: 'Kunci tidak ditemukan atau diblokir oleh Kie.ai.',
        createdAt: new Date(now - 3600000 * 8).toISOString()
      },
      {
        id: 'key_07',
        keyString: 'sk-kie-778899aabbccddeeff001122',
        userId: 'usr_dewi_04',
        status: 'valid',
        rewardAmount: 3000,
        credits: 80,
        createdAt: new Date(now - 3600000 * 12).toISOString()
      },
      {
        id: 'key_08',
        keyString: 'sk-kie-3344556677889900aabbccdd',
        userId: 'usr_dewi_04',
        status: 'valid',
        rewardAmount: 3000,
        credits: 80,
        createdAt: new Date(now - 86400000 * 4).toISOString()
      }
    ];
  }

  /**
   * Mock data awal Transaksi
   */
  _getInitialTransactions(extended = false) {
    const now = Date.now();
    const base = [
      {
        id: 'tx_01',
        userId: 'usr_budi_01',
        type: 'deposit',
        amount: 3000,
        title: 'Setoran API Key',
        description: 'Validasi kredit Kie.ai penuh (80 kredit)',
        status: 'success',
        createdAt: new Date(now - 3600000 * 2).toISOString()
      },
      {
        id: 'tx_02',
        userId: 'usr_budi_01',
        type: 'withdrawal',
        amount: 50000,
        title: 'Penarikan ke DANA',
        description: 'Pencairan dana ke 081234567890 (a.n. Budi Santoso)',
        status: 'pending', // PENDING untuk demo persetujuan admin!
        method: 'dana',
        recipient: '081234567890',
        fee: 1000,
        createdAt: new Date(now - 3600000 * 4).toISOString()
      },
      {
        id: 'tx_03',
        userId: 'usr_budi_01',
        type: 'deposit',
        amount: 3000,
        title: 'Setoran API Key',
        description: 'Validasi kredit Kie.ai penuh (80 kredit)',
        status: 'success',
        createdAt: new Date(now - 86400000 * 2).toISOString()
      },
      {
        id: 'tx_04',
        userId: 'usr_budi_01',
        type: 'withdrawal',
        amount: 100000,
        title: 'Penarikan ke BCA',
        description: 'Pencairan dana ke Rek. 5410987654 (a.n. BUDI SANTOSO)',
        status: 'success',
        method: 'bank',
        recipient: '5410987654 (BCA)',
        fee: 2500,
        createdAt: new Date(now - 86400000 * 5).toISOString()
      }
    ];

    if (!extended) return base;

    return [
      ...base,
      {
        id: 'tx_05',
        userId: 'usr_siti_02',
        type: 'withdrawal',
        amount: 75000,
        title: 'Penarikan ke GoPay',
        description: 'Pencairan ke 085712345678 (a.n. Siti Rahmawati)',
        status: 'pending',
        method: 'gopay',
        recipient: '085712345678',
        fee: 1000,
        createdAt: new Date(now - 3600000 * 1).toISOString()
      },
      {
        id: 'tx_06',
        userId: 'usr_dewi_04',
        type: 'withdrawal',
        amount: 60000,
        title: 'Penarikan ke OVO',
        description: 'Pencairan ke 081399887766 (a.n. Dewi Lestari)',
        status: 'success',
        method: 'ovo',
        recipient: '081399887766',
        fee: 1000,
        createdAt: new Date(now - 86400000 * 1).toISOString()
      },
      {
        id: 'tx_07',
        userId: 'usr_ahmad_03',
        type: 'withdrawal',
        amount: 50000,
        title: 'Penarikan ke DANA',
        description: 'Pencairan ke 087890123456 (Ditolak: Akun belum terverifikasi)',
        status: 'failed',
        method: 'dana',
        recipient: '087890123456',
        fee: 1000,
        createdAt: new Date(now - 86400000 * 3).toISOString()
      }
    ];
  }
}

export const adminDataService = new AdminDataService();
