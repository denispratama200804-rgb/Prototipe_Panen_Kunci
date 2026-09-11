import { supabase, isSupabaseConfigured } from '../../../src/infrastructure/supabase/supabaseClient.js';

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
    this._cleanDummyUsers();
    this._cleanDummyKeys();
    this._initRealtimeSync();
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
            this.emit('key_received', data);
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
      } catch (err) {
        console.warn('[AdminDataService] Supabase realtime transactions error:', err.message);
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
    const completedWithdrawals = withdrawals.filter(t => t.status === 'success');

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
        .filter(t => t.type === 'withdrawal' && t.createdAt && t.createdAt.startsWith(dateStr) && t.status === 'success')
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
   * Setujui / Verifikasi API Key dari user
   * Mengubah status key menjadi 'valid', memindahkan reward dari Saldo Pasif ke Saldo Aktif,
   * dan menyinkronkan status ke Supabase.
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
    const uIdx = users.findIndex(u => u.id === targetUserId);
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
      tx.description = `Terverifikasi oleh Admin: ${masked || key.id}`;
      tx.processedAt = new Date().toISOString();
    } else {
      tx = {
        id: 'tx_' + Math.random().toString(36).substring(2, 9),
        userId: targetUserId || 'usr_current',
        type: 'deposit',
        amount: rewardAmount,
        title: 'Setoran API Key (Terverifikasi)',
        description: `Terverifikasi oleh Admin: ${masked || key.id}`,
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
          userTxs[uTxIdx].description = `Terverifikasi oleh Admin: ${masked || key.id}`;
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
               t.description?.includes(keyId))
            );
            if (foundTx) {
              existingTxId = foundTx.id;
            }
          }
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
                description: `Terverifikasi oleh Admin: ${masked || key.id}`
              }
            })
          });
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
                description: `Terverifikasi oleh Admin: ${masked || key.id}`,
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

    if (targetUserId) {
      const userTxKey = `transactions_${targetUserId}`;
      const userTxs = this._get(userTxKey, []);
      if (Array.isArray(userTxs)) {
        const uTxIdx = userTxs.findIndex(t =>
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
      id
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

    // Perkaya data transaksi dengan data profil pengguna pemohon
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

      return {
        ...t,
        userName,
        userEmail,
        userPhone,
        accountHolder,
        userBank,
        userAccountNumber,
        kycStatus
      };
    });

    return enriched.filter(t => {
      const matchType = type === 'all' || t.type === type;
      const matchStatus = status === 'all' || t.status === status;
      const q = search.toLowerCase();
      const matchSearch = !search ||
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.userId && t.userId.toLowerCase().includes(q)) ||
        (t.userName && t.userName.toLowerCase().includes(q)) ||
        (t.userEmail && t.userEmail.toLowerCase().includes(q)) ||
        (t.accountHolder && t.accountHolder.toLowerCase().includes(q)) ||
        (t.recipient && t.recipient.toLowerCase().includes(q)) ||
        (t.title && t.title.toLowerCase().includes(q));
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
          const normalized = json.data.map(t => {
            const amount = Number(t.amount || 0);
            const fee = Number(t.fee || 0);
            const netPayout = t.netPayout !== undefined
              ? Number(t.netPayout)
              : (t.net_payout !== undefined ? Number(t.net_payout) : Math.max(0, amount - fee));

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
              netPayout,
              net_payout: netPayout,
              title: t.title || 'Transaksi Saldo',
              description: t.description || '',
              status: t.status || 'pending',
              method: t.method || '',
              recipient: t.recipient || '',
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
  async approveWithdrawal(transactionId, { proofImage = '', notes = '' } = {}) {
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
        const uIdx = userTxs.findIndex(t => t.id === transactionId);
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
        await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            table: 'transactions',
            id: transactionId,
            data: {
              status: 'success',
              updated_at: new Date().toISOString()
            }
          })
        });
      } catch (err) {
        console.warn('[AdminDataService] Supabase approve withdrawal sync warning:', err.message);
      }

      // Siarkan ke user tab via BroadcastChannel
      this._broadcastSync({
        type: 'WITHDRAWAL_APPROVED',
        transactionId,
        userId: targetUserId,
        status: 'success',
        proofNotes: notes
      });

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
    const user = users.find(u => u.id === tx.userId);
    if (user) return user;

    const curr = this._get('current_user');
    if (curr && curr.id === tx.userId) return curr;

    return {
      id: tx.userId || 'usr_budi_01',
      name: tx.userName || 'Budi Santoso',
      phone: tx.recipient || '081234567890',
      bankName: tx.method ? tx.method.toUpperCase() : 'DANA',
      accountNumber: tx.recipient || '081234567890',
      accountHolder: (tx.userName || 'BUDI SANTOSO').toUpperCase(),
      isVerified: true
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
        // Pertahankan custom balance yang pernah diubah admin jika ada
        const existingUsers = this._get('all_users', []);
        const balanceMap = {};
        existingUsers.forEach(u => {
          if (u.id && u.customBalance !== undefined) {
            balanceMap[u.id] = u.customBalance;
          }
        });

        // Filter keluar akun konfigurasi sistem
        const cleanRemote = remoteUsers.filter(row =>
          row.id !== '00000000-0000-0000-0000-000000000001' &&
          row.role !== 'system_config' &&
          !row.email?.includes('system_config')
        );

        // Petakan kolom Supabase ke objek pengguna di admin panel
        const mappedUsers = cleanRemote.map(row => ({
          id: row.id,
          name: row.name || 'Tanpa Nama',
          email: row.email || '-',
          phone: row.phone || '-',
          bankName: row.bank_name || '-',
          accountNumber: row.account_number || '-',
          accountHolder: row.account_holder || row.name || '-',
          role: row.role || 'user',
          isVerified: Boolean(row.is_verified),
          createdAt: row.created_at || new Date().toISOString(),
          avatar: (row.avatar && row.avatar !== '/avatar.png') ? row.avatar : '',
          customBalance: balanceMap[row.id] !== undefined ? balanceMap[row.id] : 0
        }));

        this._set('all_users', mappedUsers);
        return mappedUsers;
      }
    } catch (e) {
      console.error('[AdminDataService] Gagal fetch users dari Supabase:', e);
    }

    return this.getUsers();
  }

  /**
   * Mengambil daftar seluruh pengguna dari cache data tersinkron
   */
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
      const userWithdrawals = transactions.filter(t => (t.userId === u.id || (u.email && t.userEmail === u.email)) && t.type === 'withdrawal' && t.status === 'success');
      const totalWithdrawn = userWithdrawals.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const balance = u.customBalance !== undefined ? u.customBalance : 0;

      return {
        ...u,
        totalKeys: userKeys.length,
        validKeys: userKeys.filter(k => k.status === 'valid').length,
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
      (u.id && u.id.toLowerCase().includes(q))
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
        users[idx].customBalance = updateData.balance;
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
