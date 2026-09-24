import { Transaction } from '../../domain/models/Transaction.js';
import { AppEvents } from '../../core/events/EventBus.js';
import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient.js';
import { telegramService } from './TelegramService.js';

/**
 * WalletService
 * Prinsip: Single Responsibility Principle (SRP) & Dependency Inversion Principle (DIP)
 *
 * Mengelola saldo aktif, pendapatan kumulatif, batas penarikan,
 * dan memproses mutasi saldo dengan Strategy Pattern serta sinkronisasi ITransactionRepository.
 */
export class WalletService {
  /**
   * @param {import('../../core/interfaces/IStorage.js').IStorage} storage
   * @param {import('../../domain/validators/WithdrawalValidator.js').WithdrawalValidator} validator
   * @param {import('../strategies/WithdrawalStrategyFactory.js').WithdrawalStrategyFactory} strategyFactory
   * @param {import('../../core/events/EventBus.js').EventBus} eventBus
   * @param {import('../../core/interfaces/ITransactionRepository.js').ITransactionRepository} [transactionRepository]
   */
  constructor(storage, validator, strategyFactory, eventBus, transactionRepository = null, apiKeyRepository = null) {
    this._storage = storage;
    this._validator = validator;
    this._strategyFactory = strategyFactory;
    this._eventBus = eventBus;
    this._transactionRepository = transactionRepository;
    this._apiKeyRepository = apiKeyRepository;

    this._balance = 0;
    this._passiveBalance = 0;
    this._lifetimeEarnings = 0;
    this._transactions = [];
    this._minWithdrawal = 50000;
    this._realtimeChannel = null;

    this._loadWallet();
    this._syncFromRemote().catch(() => {});

    // Listen auth state changed: saat user login/register/logout, reset dan muat ulang dompet milik user tersebut
    this._eventBus.on(AppEvents.AUTH_STATE_CHANGED, () => {
      this._loadWallet();
      this._syncFromRemote();
      this._setupRealtimeSubscription();
      this._eventBus.emit(AppEvents.BALANCE_UPDATED, {
        balance: this._balance,
        passiveBalance: this._passiveBalance,
        lifetime: this._lifetimeEarnings
      });
    });

    // Sinkronkan konfigurasi sistem (target batas penarikan & tarif) dari database di awal
    this.fetchSystemConfig().catch(() => {});

    if (typeof window !== 'undefined') {
      // 1. Sinkronisasi Antar-Tab via BroadcastChannel instan
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          this._broadcastChannel = new BroadcastChannel('panenkunci_sync');
          this._broadcastChannel.onmessage = async (event) => {
            const data = event.data;
            if (!data) return;

            const currentUserId = this._getUserId();

            if (data.type === 'CONFIG_UPDATED' && data.config) {
              this._applyNewConfig(data.config);
              return;
            }

            // ISOLASI USER: Jika event membawa target userId dan tidak cocok dengan user aktif di tab ini, abaikan!
            if (data.userId && currentUserId && data.userId !== currentUserId) {
              return;
            }

            if (
              data.type === 'KEY_APPROVED' ||
              data.type === 'KEY_REJECTED' ||
              data.type === 'KEY_STATUS_UPDATED' ||
              data.type === 'KEY_DELETED' ||
              data.type === 'BALANCE_UPDATED' ||
              data.type === 'WITHDRAWAL_CREATED' ||
              data.type === 'TRANSACTION_UPDATED' ||
              data.type === 'REFERRAL_COMMISSION_CREDITED'
            ) {
              this._loadWallet();
              await this._syncFromRemote();
              this._eventBus.emit(AppEvents.BALANCE_UPDATED, {
                balance: this._balance,
                passiveBalance: this._passiveBalance,
                lifetime: this._lifetimeEarnings
              });

              if (data.type === 'REFERRAL_COMMISSION_CREDITED' && (!data.referrerId || data.referrerId === currentUserId)) {
                const commAmountStr = data.amount ? `Rp ${Number(data.amount).toLocaleString('id-ID')}` : '';
                this._eventBus.emit('PAYOUT_PROCESSED', {
                  type: 'success',
                  status: 'success',
                  amount: data.amount,
                  title: 'Komisi Referral Masuk!',
                  message: `Selamat! Anda menerima komisi referral ${commAmountStr} dari penarikan downline Anda.`
                });
              }
            } else if (data.type === 'WITHDRAWAL_APPROVED') {
              if (data.userId && currentUserId && data.userId !== currentUserId) return;

              if (Array.isArray(this._transactions)) {
                const matchTx = this._transactions.find(t => 
                  t.id === data.transactionId || 
                  (t.type === 'withdrawal' && ['pending', 'valid'].includes(String(t.status || '').toLowerCase()) && Number(t.amount) === Number(data.amount))
                );
                if (matchTx) {
                  matchTx.id = data.transactionId || matchTx.id;
                  matchTx.status = 'success';
                  if (data.proofImage) matchTx.proofImage = data.proofImage;
                  if (data.proofNotes) matchTx.proofNotes = data.proofNotes;
                  this._persist();
                }
              }
              if (data.newBalance !== undefined && !isNaN(Number(data.newBalance))) {
                this._balance = Number(data.newBalance);
                this._persist();
              }
              this._loadWallet();
              await this._syncFromRemote();
              this._eventBus.emit(AppEvents.BALANCE_UPDATED, {
                balance: this._balance,
                passiveBalance: this._passiveBalance,
                lifetime: this._lifetimeEarnings
              });
              this._eventBus.emit(AppEvents.TRANSACTIONS_LOADED, {
                transactions: this._transactions
              });
              const amountStr = data.amount ? `Rp ${Number(data.amount).toLocaleString('id-ID')}` : '';
              this._eventBus.emit('PAYOUT_PROCESSED', {
                type: 'success',
                status: 'success',
                transactionId: data.transactionId,
                userId: data.userId,
                amount: data.amount,
                proofImage: data.proofImage || '',
                proofNotes: data.proofNotes || '',
                title: 'Penarikan Saldo Diterima!',
                message: `Pencairan dana ${amountStr} telah berhasil disetujui & ditransfer oleh Admin.`
              });
            } else if (data.type === 'WITHDRAWAL_REJECTED') {
              if (data.userId && currentUserId && data.userId !== currentUserId) return;

              this._loadWallet();
              await this._syncFromRemote();
              this._eventBus.emit(AppEvents.BALANCE_UPDATED, {
                balance: this._balance,
                passiveBalance: this._passiveBalance,
                lifetime: this._lifetimeEarnings
              });
              const refundStr = data.refundAmount ? `sebesar Rp ${Number(data.refundAmount).toLocaleString('id-ID')} ` : '';
              this._eventBus.emit('PAYOUT_PROCESSED', {
                type: 'error',
                status: 'failed',
                transactionId: data.transactionId,
                userId: data.userId,
                refundAmount: data.refundAmount,
                title: 'Permintaan Penarikan Ditolak',
                message: `Penarikan ${refundStr}ditolak (${data.reason || 'Data tidak sesuai'}). Dana telah dikembalikan ke saldo aktif Anda.`
              });
            }
          };
        } catch (e) {
          console.warn('[WalletService] BroadcastChannel not supported:', e.message);
        }
      }

      // 2. Cross-tab synchronization via storage event (dengan filter ketat userId)
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.includes('admin_config')) {
          const cfg = this._storage.get('admin_config');
          if (cfg) {
            this._validator.minWithdrawal = this.minWithdrawal;
          }
          this._eventBus.emit(AppEvents.BALANCE_UPDATED, {
            balance: this._balance,
            passiveBalance: this._passiveBalance,
            lifetime: this._lifetimeEarnings
          });
          window.dispatchEvent(new CustomEvent('panenkunci:config_updated', { detail: cfg }));
        } else if (e.key) {
          const currentUserId = this._getUserId();
          if (!currentUserId) return;

          // HANYA bereaksi jika storage event merupakan key milik user yang sedang aktif
          const isUserStorageKey =
            e.key === `wallet_balance_${currentUserId}` ||
            e.key === `wallet_passive_balance_${currentUserId}` ||
            e.key === `lifetime_earnings_${currentUserId}` ||
            e.key === `transactions_${currentUserId}` ||
            e.key === `api_keys_${currentUserId}`;

          if (isUserStorageKey) {
            this._loadWallet();
            this._eventBus.emit(AppEvents.BALANCE_UPDATED, {
              balance: this._balance,
              passiveBalance: this._passiveBalance,
              lifetime: this._lifetimeEarnings
            });
          }
        }
      });

      // 3. Tab Visibility & Focus listener: otomatis re-sync saat tab aktif kembali
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this._loadWallet();
          this._syncFromRemote();
          this.fetchSystemConfig().catch(() => {});
        }
      });
      window.addEventListener('focus', () => {
        this._loadWallet();
        this._syncFromRemote();
        this.fetchSystemConfig().catch(() => {});
      });

      // 4. Background Polling berkala (setiap 3,5 detik saat tab aktif)
      this._pollTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          const userId = this._getUserId();
          if (userId) {
            this._loadWallet();
            this._syncFromRemote();
          }
          this.fetchSystemConfig().catch(() => {});
        }
      }, 3500);

      // 5. Supabase Realtime Subscription untuk tabel transactions & system_config
      this._setupRealtimeSubscription();
    }
  }

  /**
   * Menghubungkan Supabase Realtime channel untuk memantau perubahan transaksi dan pengaturan sistem secara langsung
   */
  _setupRealtimeSubscription() {
    if (!isSupabaseConfigured() || !supabase) return;

    try {
      if (this._realtimeChannel) {
        supabase.removeChannel(this._realtimeChannel);
        this._realtimeChannel = null;
      }

      const userId = this._getUserId();
      this._realtimeChannel = supabase
        .channel(`client_tx_${userId || 'public'}_${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transactions' },
          (payload) => {
            const currentUserId = this._getUserId();
            const isTargetUser = !payload.new?.user_id || payload.new?.user_id === currentUserId || payload.old?.user_id === currentUserId;
            if (isTargetUser) {
              this._loadWallet();
              this._syncFromRemote();
            }
          }
        )
        .subscribe();

      // Realtime channel untuk memantau perubahan batas penarikan & konfigurasi sistem dari admin secara instan
      if (this._configRealtimeChannel) {
        supabase.removeChannel(this._configRealtimeChannel);
        this._configRealtimeChannel = null;
      }

      this._configRealtimeChannel = supabase
        .channel(`client_sys_config_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'users',
            filter: 'id=eq.00000000-0000-0000-0000-000000000001'
          },
          (payload) => {
            if (payload.new && payload.new.avatar) {
              try {
                const cfg = typeof payload.new.avatar === 'string' ? JSON.parse(payload.new.avatar) : payload.new.avatar;
                this._applyNewConfig(cfg);
              } catch (_) {}
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[WalletService] Realtime subscription init warning:', e.message);
    }
  }

  /**
   * Mengambil ID pengguna yang sedang aktif
   * @returns {string|null}
   * @private
   */
  _getUserId() {
    const user = this._storage.get('current_user');
    return user?.id || null;
  }

  /**
   * Batas minimal penarikan dinamis dari konfigurasi admin panel
   * @returns {number}
   */
  get minWithdrawal() {
    const config = this._storage.get('admin_config');
    if (config && config.minWithdrawal && !isNaN(Number(config.minWithdrawal))) {
      return Number(config.minWithdrawal);
    }
    return this._minWithdrawal || 50000;
  }

  set minWithdrawal(value) {
    this._minWithdrawal = Number(value);
  }

  /**
   * Persentase komisi / potongan kode referral dinamis dari konfigurasi admin panel (%)
   * @returns {number}
   */
  get referralCutPercent() {
    const config = this.getAdminConfig();
    if (config && config.referralPercent !== undefined && !isNaN(Number(config.referralPercent))) {
      return Math.max(0, Number(config.referralPercent));
    }
    return 5;
  }

  /**
   * Ambil seluruh konfigurasi sistem admin
   * @returns {Object}
   */
  getAdminConfig() {
    return this._storage.get('admin_config') || {
      rewardPerKey: 3000,
      minWithdrawal: 50000,
      feeDana: 1000,
      feeGopay: 1000,
      feeOvo: 1000,
      feeBank: 2500,
      referralPercent: 5,
      validationMode: 'simulation'
    };
  }

  /**
   * Mengambil konfigurasi sistem terbaru (target batas penarikan, reward, tarif) dari Supabase
   * @returns {Promise<Object>}
   */
  async fetchSystemConfig() {
    try {
      let remoteConfig = null;

      // 1. Coba via Proxy POST
      if (typeof fetch !== 'undefined') {
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

        // 2. Coba via Proxy GET
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
        this._applyNewConfig(remoteConfig);
        return remoteConfig;
      }
    } catch (err) {
      console.warn('[WalletService] fetchSystemConfig error:', err.message);
    }
    return this.getAdminConfig();
  }

  /**
   * Terapkan konfigurasi sistem baru ke dompet dan emit event pembaruan
   * @param {Object} newConfig
   * @private
   */
  _applyNewConfig(newConfig) {
    if (!newConfig) return;
    const current = this.getAdminConfig();
    const isDiff = JSON.stringify(current) !== JSON.stringify(newConfig);
    if (isDiff) {
      const merged = { ...current, ...newConfig };
      this._storage.set('admin_config', merged);
      this._validator.minWithdrawal = this.minWithdrawal;

      this._eventBus.emit(AppEvents.BALANCE_UPDATED, {
        balance: this._balance,
        passiveBalance: this._passiveBalance,
        lifetime: this._lifetimeEarnings
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('panenkunci:config_updated', { detail: merged }));
      }
    }
  }

  _loadWallet() {
    const userId = this._getUserId();

    // Jika tidak ada user login, pastikan semua data 0 dan kosong
    if (!userId) {
      this._balance = 0;
      this._passiveBalance = 0;
      this._lifetimeEarnings = 0;
      this._transactions = [];
      return;
    }

    const balanceKey = `wallet_balance_${userId}`;
    const passiveKey = `wallet_passive_balance_${userId}`;
    const lifetimeKey = `lifetime_earnings_${userId}`;
    const txKey = `transactions_${userId}`;
    const userKeysKey = `api_keys_${userId}`;

    // Ambil daftar key pengguna sebagai referensi nilai riil
    const savedUserKeys = this._storage.get(userKeysKey) || [];
    const globalKeys = (this._storage.get('api_keys') || []).filter(k => k.userId === userId);
    const combinedKeys = savedUserKeys.length > 0 ? savedUserKeys : globalKeys;

    const validKeys = combinedKeys.filter(k => k.status === 'valid');
    const pendingKeys = combinedKeys.filter(k => k.status === 'pending');

    const expectedActiveDeposit = validKeys.reduce((sum, k) => sum + (Number(k.rewardAmount) || 3000), 0);
    const expectedPassiveDeposit = pendingKeys.reduce((sum, k) => sum + (Number(k.rewardAmount) || 3000), 0);

    const savedBalance = this._storage.get(balanceKey);
    const rawSavedBal = (savedBalance !== null && !isNaN(Number(savedBalance))) ? Number(savedBalance) : null;

    const savedPassive = this._storage.get(passiveKey);
    const rawSavedPassive = (savedPassive !== null && !isNaN(Number(savedPassive))) ? Number(savedPassive) : null;

    const savedLifetime = this._storage.get(lifetimeKey);
    const rawSavedLifetime = (savedLifetime !== null && !isNaN(Number(savedLifetime))) ? Number(savedLifetime) : null;

    const savedTx = this._storage.get(txKey);
    let loadedTxs = [];
    if (savedTx && Array.isArray(savedTx)) {
      loadedTxs = savedTx
        .filter(t => t.userId === userId || !t.userId)
        .filter(t => {
          // Transaksi komisi referral SELALU diizinkan!
          if (t.method === 'referral_commission' || t.title?.includes('Referral') || t.description?.includes('Referral')) {
            return true;
          }
          // Hanya izinkan transaksi deposit API key jika key terkait ada di combinedKeys
          if (t.type === 'deposit') {
            return combinedKeys.some(k => {
              const suffix = (k.keyString && k.keyString.length >= 4) ? k.keyString.slice(-4) : '';
              const masked = k.keyString && k.keyString.length > 12
                ? `${k.keyString.slice(0, 9)}...${k.keyString.slice(-4)}`
                : (k.keyString || '');
              return (
                (suffix && t.description?.includes(suffix)) ||
                (masked && t.description?.includes(masked)) ||
                (k.keyString && t.description?.includes(k.keyString)) ||
                (k.id && t.description?.includes(k.id))
              );
            });
          }
          return true;
        })
        .map(t => new Transaction(t));

      // Deduplikasi transaksi agar tidak ada ID atau entri ganda
      const seenTxIds = new Set();
      const dedupedTxs = [];
      loadedTxs.forEach(t => {
        const txId = t.id || `${t.type}_${t.amount}_${t.createdAt}`;
        if (!seenTxIds.has(txId)) {
          seenTxIds.add(txId);
          dedupedTxs.push(t);
        }
      });
      loadedTxs = dedupedTxs;
    }

    // Hitung total komisi referral aktif yang masuk
    const totalReferralCommissions = loadedTxs
      .filter(t => (t.method === 'referral_commission' || t.title?.includes('Referral') || t.description?.includes('Referral')) && t.status === 'success')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Hitung total penarikan aktif (termasuk status valid, success, approved, completed, pending, berhasil)
    const isWdStatusActive = (s) => {
      const raw = String(s || '').trim().toLowerCase();
      return raw === 'success' || raw === 'valid' || raw === 'approved' || raw === 'completed' || raw === 'pending' || raw === 'berhasil';
    };

    const totalWithdrawals = loadedTxs
      .filter(t => t.type === 'withdrawal' && isWdStatusActive(t.status))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    if (combinedKeys.length === 0 && loadedTxs.length === 0) {
      this._balance = 0;
      this._passiveBalance = 0;
      this._lifetimeEarnings = 0;
      this._transactions = [];
      this._persist();
    } else {
      // Saldo aktif adalah akumulasi deposit valid + komisi referral dikurangi seluruh penarikan aktif
      const calculatedActive = Math.max(0, expectedActiveDeposit + totalReferralCommissions - totalWithdrawals);
      this._balance = calculatedActive;

      // Saldo pasif SELALU bersumber secara authoritative dari total reward API key yang berstatus pending
      this._passiveBalance = expectedPassiveDeposit;

      // Lifetime earnings
      this._lifetimeEarnings = Math.max(calculatedActive + totalWithdrawals, expectedActiveDeposit + totalReferralCommissions);
      this._transactions = loadedTxs;

      // Pastikan jika ada key valid/pending yang belum ada di riwayat mutasi transaksi, tambahkan ke transaksi
      this._ensureDepositTransactions(combinedKeys);
    }
  }

  /**
   * Memastikan setiap API Key valid/pending memiliki rekaman transaksi mutasi deposit
   * @param {Array} userKeys
   * @private
   */
  _ensureDepositTransactions(userKeys) {
    const userId = this._getUserId();
    if (!userId || !Array.isArray(userKeys) || userKeys.length === 0) return;

    let hasNewTx = false;

    userKeys.forEach(k => {
      const masked = k.keyString && k.keyString.length > 12
        ? `${k.keyString.slice(0, 9)}...${k.keyString.slice(-4)}`
        : (k.keyString || '');

      const keySuffix = k.keyString && k.keyString.length >= 4 ? k.keyString.slice(-4) : '';

      const existing = this._transactions.find(t =>
        t.type === 'deposit' &&
        ((keySuffix && t.description?.includes(keySuffix)) ||
         (masked && t.description?.includes(masked)) ||
         (k.keyString && t.description?.includes(k.keyString)) ||
         t.description?.includes(k.id))
      );

      const isValid = k.status === 'valid';
      const isPending = k.status === 'pending';
      const isInvalid = !isValid && !isPending;
      const reward = Number(k.rewardAmount) || 3000;

      const title = isValid
        ? 'Setoran API Key (Terverifikasi)'
        : (isPending ? 'Setoran API Key (Pending)' : 'Setoran API Key (Invalid)');
      const txStatus = isValid ? 'success' : (isPending ? 'pending' : 'failed');

      if (!existing) {
        const newTx = new Transaction({
          id: 'tx_' + Math.random().toString(36).substring(2, 9),
          userId,
          type: 'deposit',
          amount: reward,
          title,
          description: isValid
            ? `Terverifikasi oleh Admin: ${masked}`
            : (isPending ? `Menunggu verifikasi admin: ${masked}` : (k.errorMessage || `API Key Invalid: ${masked}`)),
          status: txStatus,
          createdAt: k.createdAt || new Date().toISOString()
        });

        this._transactions.unshift(newTx);
        hasNewTx = true;

        if (this._transactionRepository && newTx.amount > 0) {
          this._transactionRepository.create(newTx).catch(() => {});
        }
      } else {
        if (isValid && existing.status !== 'success') {
          existing.status = 'success';
          existing.title = 'Setoran API Key (Terverifikasi)';
          existing.description = `Terverifikasi oleh Admin: ${masked}`;
          existing.amount = reward;
          hasNewTx = true;

          if (this._transactionRepository && existing.id && existing.id.includes('-')) {
            this._transactionRepository.updateStatus(existing.id, 'success').catch(() => {});
          }
        } else if (isInvalid && existing.status !== 'failed') {
          existing.status = 'failed';
          existing.title = 'Setoran API Key (Invalid)';
          existing.description = k.errorMessage || `API Key Invalid: ${masked}`;
          existing.amount = Number(existing.amount) > 0 ? Number(existing.amount) : reward;
          hasNewTx = true;

          if (this._transactionRepository && existing.id && existing.id.includes('-')) {
            this._transactionRepository.updateStatus(existing.id, 'failed').catch(() => {});
          }
        }
      }
    });

    if (hasNewTx) {
      this._persist();
    }
  }

  async _syncFromRemote() {
    const userId = this._getUserId();
    if (!this._transactionRepository || !userId) return;

    // Concurrency lock: cegah request sinkronisasi ganda yang berjalan bersamaan
    if (this._isSyncing) return;
    this._isSyncing = true;

    try {
      const prevBalance = this._balance;
      const prevPassive = this._passiveBalance;
      const prevLifetime = this._lifetimeEarnings;
      const prevTxCount = Array.isArray(this._transactions) ? this._transactions.length : 0;

      // Filter transaksi HANYA untuk pengguna yang sedang aktif
      const remoteTxs = await this._transactionRepository.getAll(userId);

      // Ambil daftar key pengguna terkini
      const userKeysKey = `api_keys_${userId}`;
      const savedUserKeys = this._storage.get(userKeysKey) || [];
      const globalKeys = (this._storage.get('api_keys') || []).filter(k => k.userId === userId);
      let combinedKeys = savedUserKeys.length > 0 ? savedUserKeys : globalKeys;

      // Ambil data remoteKeys untuk menyelaraskan data key, tetapi JANGAN PERNAH menghapus cache lokal jika remote kosong!
      if (this._apiKeyRepository) {
        try {
          const remoteKeys = await this._apiKeyRepository.getAll(userId);
          if (Array.isArray(remoteKeys) && remoteKeys.length > 0) {
            const keyMap = new Map();
            combinedKeys.forEach(k => {
              const id = k.id || k.keyString;
              keyMap.set(id, k);
            });

            remoteKeys.forEach(rk => {
              const id = rk.id || rk.keyString;
              if (keyMap.has(id)) {
                const existing = keyMap.get(id);
                // Jika lokal sudah valid, pertahankan status valid (jangan downgrade ke pending)
                if (existing.status === 'valid' && rk.status !== 'valid') {
                  // Tetap valid
                } else {
                  keyMap.set(id, { ...existing, ...rk });
                }
              } else {
                keyMap.set(id, rk);
              }
            });

            combinedKeys = Array.from(keyMap.values());
            this._storage.set(userKeysKey, combinedKeys);
          }
        } catch (e) {}
      }

      const validKeys = combinedKeys.filter(k => k.status === 'valid');
      const pendingKeys = combinedKeys.filter(k => k.status === 'pending');
      const expectedActive = validKeys.reduce((sum, k) => sum + (Number(k.rewardAmount) || 3000), 0);
      const expectedPassive = pendingKeys.reduce((sum, k) => sum + (Number(k.rewardAmount) || 3000), 0);

      if (combinedKeys.length === 0 && (!remoteTxs || remoteTxs.length === 0)) {
        this._balance = 0;
        this._passiveBalance = 0;
        this._lifetimeEarnings = 0;
        this._transactions = [];
        this._persist();
        this._eventBus.emit(AppEvents.BALANCE_UPDATED, {
          balance: 0,
          passiveBalance: 0,
          lifetime: 0
        });
        return;
      }

      if (Array.isArray(remoteTxs) && remoteTxs.length > 0) {
        // Deduplikasi transaksi: untuk setiap key unik (berdasarkan 4 karakter terakhir di deskripsi), pertahankan 1 transaksi terbaik
        const deduplicatedTxs = [];
        const seenDepositKeys = new Map();
        const duplicateIdsToDelete = [];

        remoteTxs.forEach(tx => {
          if (tx.type === 'deposit') {
            const match = tx.description?.match(/([a-zA-Z0-9]{4})$/);
            const keyIdentifier = match ? match[1] : tx.id;

            if (seenDepositKeys.has(keyIdentifier)) {
              const existingIdx = seenDepositKeys.get(keyIdentifier);
              if (tx.status === 'success' && deduplicatedTxs[existingIdx].status !== 'success') {
                if (deduplicatedTxs[existingIdx].id) duplicateIdsToDelete.push(deduplicatedTxs[existingIdx].id);
                deduplicatedTxs[existingIdx] = tx;
              } else {
                if (tx.id) duplicateIdsToDelete.push(tx.id);
              }
            } else {
              seenDepositKeys.set(keyIdentifier, deduplicatedTxs.length);
              deduplicatedTxs.push(tx);
            }
          } else {
            deduplicatedTxs.push(tx);
          }
        });

        // Pertahankan penarikan pending lokal yang belum selesai tersinkron ke Supabase
        const currentLocalTxs = Array.isArray(this._transactions) ? this._transactions : (this._storage.get(`transactions_${userId}`) || []);
        currentLocalTxs.forEach(localTx => {
          if (localTx.type === 'withdrawal' && String(localTx.status || '').toLowerCase() === 'pending') {
            const existsInRemote = deduplicatedTxs.some(dt => 
              dt.id === localTx.id || 
              (dt.type === 'withdrawal' && Number(dt.amount) === Number(localTx.amount) && Math.abs(new Date(dt.createdAt || dt.created_at || 0) - new Date(localTx.createdAt || 0)) < 300000)
            );
            if (!existsInRemote) {
              deduplicatedTxs.unshift(localTx);
            }
          }
        });

        // Hapus transaksi duplikat dari Supabase secara otomatis di background
        const orphanIdsToDelete = [];
        const reconciledTxs = [];

        deduplicatedTxs.forEach(tx => {
          if (tx.type === 'deposit') {
            // JANGAN hapus jika transaksi berupa komisi referral!
            if (tx.method === 'referral_commission' || tx.title?.includes('Referral') || tx.description?.includes('Referral')) {
              reconciledTxs.push(tx);
              return;
            }

            const matchingKey = combinedKeys.find(k => {
              const suffix = (k.keyString && k.keyString.length >= 4) ? k.keyString.slice(-4) : '';
              const masked = k.keyString && k.keyString.length > 12
                ? `${k.keyString.slice(0, 9)}...${k.keyString.slice(-4)}`
                : (k.keyString || '');

              return (
                (suffix && tx.description?.includes(suffix)) ||
                (masked && tx.description?.includes(masked)) ||
                (k.keyString && tx.description?.includes(k.keyString)) ||
                (k.id && tx.description?.includes(k.id))
              );
            });

            if (!matchingKey) {
              if (tx.id) orphanIdsToDelete.push(tx.id);
              return;
            }

            // Rekonsiliasi status transaksi deposit dengan status key saat ini
            if (matchingKey.status === 'valid') {
              if (tx.status !== 'success') {
                tx.status = 'success';
                tx.title = 'Setoran API Key (Terverifikasi)';
                tx.amount = Number(matchingKey.rewardAmount) || tx.amount || 3000;
                if (this._transactionRepository && tx.id) {
                  this._transactionRepository.updateStatus(tx.id, 'success').catch(() => {});
                }
              }
            } else if (matchingKey.status === 'invalid') {
              if (tx.status !== 'failed') {
                tx.status = 'failed';
                tx.title = 'Setoran API Key (Invalid)';
                if (this._transactionRepository && tx.id) {
                  this._transactionRepository.updateStatus(tx.id, 'failed').catch(() => {});
                }
              }
            }
          }
          reconciledTxs.push(tx);
        });

        const allIdsToDelete = [...duplicateIdsToDelete, ...orphanIdsToDelete];
        if (allIdsToDelete.length > 0 && typeof fetch !== 'undefined') {
          allIdsToDelete.forEach(delId => {
            if (delId && delId.includes('-')) {
              fetch('/api/supabase-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', table: 'transactions', id: delId })
              }).catch(() => {});
            }
          });
        }

        this._transactions = reconciledTxs;

        // Pastikan semua key valid/pending terjamin memiliki mutasi transaksi di daftar
        this._ensureDepositTransactions(combinedKeys);

        let calculatedLifetime = 0;
        let calculatedDepositSuccess = 0;
        let calculatedWithdrawals = 0;

        this._transactions.forEach(tx => {
          const amt = Number(tx.amount) || 0;
          if (tx.type === 'deposit') {
            if (tx.status === 'success') {
              calculatedDepositSuccess += amt;
              calculatedLifetime += amt;
            }
          } else if (tx.type === 'withdrawal') {
            const rawStatus = String(tx.status || '').trim().toLowerCase();
            if (['success', 'valid', 'approved', 'completed', 'pending', 'berhasil'].includes(rawStatus)) {
              calculatedWithdrawals += amt;
            }
          }
        });

        // Selaraskan dengan data key agar tidak ada saldo yang hilang atau menggelembung
        const remoteCommissions = this._transactions
          .filter(t => (t.method === 'referral_commission' || t.title?.includes('Referral') || t.description?.includes('Referral')) && t.status === 'success')
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        // Saldo deposit valid authoritative: dijamin tidak boleh lebih kecil dari expectedActive yang dihitung dari key valid!
        const totalValidDeposit = Math.max(calculatedDepositSuccess, expectedActive);

        this._balance = Math.max(0, totalValidDeposit + remoteCommissions - calculatedWithdrawals);
        this._passiveBalance = expectedPassive;
        this._lifetimeEarnings = Math.max(calculatedLifetime, expectedActive + remoteCommissions, this._lifetimeEarnings || 0);
      } else {
        // Jika remoteTxs belum ada/kosong di database, gunakan perhitungan authoritative dari daftar key user + komisi referral!
        this._ensureDepositTransactions(combinedKeys);

        const totalWithdrawals = this._transactions
          .filter(t => {
            if (t.type !== 'withdrawal') return false;
            const rawStatus = String(t.status || '').trim().toLowerCase();
            return ['success', 'valid', 'approved', 'completed', 'pending', 'berhasil'].includes(rawStatus);
          })
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const totalCommissions = this._transactions
          .filter(t => (t.method === 'referral_commission' || t.title?.includes('Referral') || t.description?.includes('Referral')) && t.status === 'success')
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        this._balance = Math.max(0, expectedActive + totalCommissions - totalWithdrawals);
        this._passiveBalance = expectedPassive;
        this._lifetimeEarnings = Math.max(expectedActive + totalCommissions, this._lifetimeEarnings || 0);
      }

      this._persist();

      // Change Detection: HANYA pancarkan event jika terjadi perubahan nilai riil
      const balanceChanged =
        prevBalance !== this._balance ||
        prevPassive !== this._passiveBalance ||
        prevLifetime !== this._lifetimeEarnings;

      if (balanceChanged) {
        this._eventBus.emit(AppEvents.BALANCE_UPDATED, {
          balance: this._balance,
          passiveBalance: this._passiveBalance,
          lifetime: this._lifetimeEarnings
        });
      }

      const txsChanged = prevTxCount !== this._transactions.length || balanceChanged;
      if (txsChanged) {
        this._eventBus.emit(AppEvents.TRANSACTIONS_LOADED, {
          transactions: this._transactions
        });
      }
    } catch (err) {
      console.warn('[WalletService] Remote tx sync fallback to local cache:', err.message);
    } finally {
      this._isSyncing = false;
    }
  }

  _persist() {
    const userId = this._getUserId();
    if (userId) {
      this._storage.set(`wallet_balance_${userId}`, this._balance);
      this._storage.set(`wallet_passive_balance_${userId}`, this._passiveBalance);
      this._storage.set(`lifetime_earnings_${userId}`, this._lifetimeEarnings);
      this._storage.set(`transactions_${userId}`, this._transactions.map(t => t.toJSON()));
    }
    // Hanya simpan ke storage global jika user yang sedang aktif di session adalah pemilik data ini
    const currentUser = this._authService ? this._authService.getCurrentUser() : null;
    if (!currentUser || !userId || currentUser.id === userId) {
      this._storage.set('wallet_balance', this._balance);
      this._storage.set('wallet_passive_balance', this._passiveBalance);
      this._storage.set('lifetime_earnings', this._lifetimeEarnings);
      this._storage.set('transactions', this._transactions.map(t => t.toJSON()));
    }
  }

  /**
   * Saldo aktif yang dapat dicairkan
   * @returns {number}
   */
  getBalance() {
    return this._balance;
  }

  /**
   * Saldo pasif yang menunggu verifikasi admin
   * @returns {number}
   */
  getPassiveBalance() {
    return this._passiveBalance;
  }

  /**
   * Total saldo kumulatif yang pernah didapatkan
   * @returns {number}
   */
  getLifetimeEarnings() {
    return this._lifetimeEarnings;
  }

  /**
   * Total penghasilan hari ini
   * @returns {number}
   */
  getTodayEarnings() {
    const today = new Date().toDateString();
    return this._transactions
      .filter(t => t.type === 'deposit' && t.status === 'success' && new Date(t.createdAt).toDateString() === today)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  /**
   * Persentase progress batas penarikan minimum (0 - 100%)
   * @returns {{ percentage: number, remaining: number, isEligible: boolean }}
   */
  getWithdrawalProgress() {
    const percentage = Math.min(100, Math.round((this._balance / this.minWithdrawal) * 100));
    const remaining = Math.max(0, this.minWithdrawal - this._balance);
    return {
      percentage,
      remaining,
      isEligible: this._balance >= this.minWithdrawal
    };
  }

  /**
   * Ambil semua riwayat transaksi
   * @returns {Transaction[]}
   */
  getTransactions() {
    return [...this._transactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Pemicu sinkronisasi data transaksi dan saldo dari remote Supabase secara publik
   * @returns {Promise<void>}
   */
  async syncFromRemote() {
    return this._syncFromRemote();
  }

  /**
   * Ambil transaksi penarikan saja (terdeduplikasi)
   * @returns {Transaction[]}
   */
  getWithdrawals() {
    const seen = new Set();
    return this.getTransactions()
      .filter(t => t.type === 'withdrawal')
      .filter(t => {
        const key = t.id || `${t.amount}_${t.createdAt}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  /**
   * Ambil riwayat potongan kode referral pada saat penarikan dana
   * Berfungsi saat akun terikat oleh akun lain melalui kode referral saat daftar akun
   * Selaras 100% dengan data transaksi penarikan (Single Source of Truth)
   * @returns {Array<Object>}
   */
  getReferralHistory() {
    const userId = this._getUserId();
    const currentUser = this._storage.get('current_user');
    const userReferredBy = (currentUser?.referredBy || '').trim().toUpperCase();

    // Transaksi penarikan adalah Single Source of Truth untuk potongan kode referral
    const withdrawals = this.getWithdrawals();
    const currentRefPercent = this.referralCutPercent;

    const withdrawalRef = withdrawals
      .filter(w => {
        if (Number(w.referralDeduction) > 0) return true;
        if (w.description && /Potongan\s+Referral/i.test(w.description)) return true;
        if (userReferredBy && Number(w.amount) > 0) return true;
        return false;
      })
      .map(w => {
        let refCode = (w.referralCode || w.referredBy || userReferredBy || '').trim().toUpperCase();
        if (!refCode && w.description) {
          const match = w.description.match(/Potongan\s+Referral\s*\(([^)]+)\)/i);
          if (match) refCode = match[1].trim().toUpperCase();
        }
        if (!refCode) refCode = 'TERIKAT';

        let deduction = Number(w.referralDeduction || 0);
        if (!deduction && w.description) {
          const matchNominal = w.description.match(/Potongan\s+Referral[^:]*:\s*Rp\s*([\d.,]+)/i);
          if (matchNominal) {
            deduction = Number(matchNominal[1].replace(/[.,]/g, '')) || 0;
          }
        }
        if (!deduction) {
          deduction = Math.round(Number(w.amount || 0) * (currentRefPercent / 100));
        }

        const effectivePercent = (deduction > 0 && w.amount > 0)
          ? Math.round((deduction / w.amount) * 100)
          : currentRefPercent;

        return {
          id: 'ref_' + String(w.id || '').replace('tx_', ''),
          withdrawalId: w.id,
          userId: w.userId || userId,
          userName: w.userName || currentUser?.name || 'Pengguna',
          type: 'referral_deduction',
          referralCode: refCode,
          withdrawalAmount: Number(w.amount || 0),
          deductionAmount: deduction,
          deductionPercent: effectivePercent,
          status: w.status || 'pending',
          method: w.method || 'dana',
          recipient: w.recipient || '',
          createdAt: w.createdAt,
          proofImage: w.proofImage || '',
          proofNotes: w.proofNotes || '',
          rejectionReason: w.rejectionReason || '',
          title: 'Potongan Kode Referral',
          description: `Potongan ${refCode} saat penarikan ${w.title || 'Dana'}`
        };
      });

    // Simpan data bersih dan tersinkron ke storage agar konsisten
    if (userId) {
      const refKey = `referral_transactions_${userId}`;
      this._storage.set(refKey, withdrawalRef);
    }

    return withdrawalRef.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Mencatat mutasi riwayat potongan referral ke local storage (sinkron otomatis)
   * @param {Object} [item]
   * @private
   */
  _recordReferralTransaction(item) {
    const userId = this._getUserId();
    if (!userId) return;
    const refKey = `referral_transactions_${userId}`;
    const list = this.getReferralHistory();
    this._storage.set(refKey, list);
  }

  /**
   * Ambil transaksi setoran saja
   * @returns {Transaction[]}
   */
  getDeposits() {
    return this.getTransactions().filter(t => t.type === 'deposit');
  }

  /**
   * Menambahkan saldo reward dari setoran API key
   * @param {number} amount
   * @param {import('../../domain/models/ApiKey.js').ApiKey} apiKey
   */
  addDeposit(amount, apiKey) {
    this._balance += amount;
    this._lifetimeEarnings += amount;

    const tx = new Transaction({
      id: 'tx_' + Math.random().toString(36).substring(2, 9),
      userId: apiKey?.userId || 'usr_current',
      type: 'deposit',
      amount,
      title: 'Setoran API Key',
      description: `Validasi berhasil: ${typeof apiKey?.getMaskedKey === 'function' ? apiKey.getMaskedKey() : (apiKey?.keyString || apiKey || 'Sistem')}`,
      status: 'success',
      createdAt: new Date().toISOString()
    });

    this._transactions.unshift(tx);
    this._persist();

    // Simpan ke Supabase jika repositori aktif
    if (this._transactionRepository) {
      this._transactionRepository.create(tx)
        .then(saved => {
          if (saved && saved.id) tx.id = saved.id;
        })
        .catch(err => console.warn('[WalletService] Supabase create tx fallback:', err.message));
    }

    this._eventBus.emit(AppEvents.BALANCE_UPDATED, { balance: this._balance, lifetime: this._lifetimeEarnings });
  }

  /**
   * Menambahkan saldo reward ke Saldo Pasif (menunggu verifikasi admin)
   * @param {number} amount
   * @param {import('../../domain/models/ApiKey.js').ApiKey} apiKey
   */
  addPassiveDeposit(amount, apiKey) {
    this._passiveBalance += amount;

    const tx = new Transaction({
      id: 'tx_' + Math.random().toString(36).substring(2, 9),
      userId: apiKey.userId || 'usr_current',
      type: 'deposit',
      amount,
      title: 'Setoran API Key',
      description: `Menunggu verifikasi admin: ${apiKey.getMaskedKey()}`,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    this._transactions.unshift(tx);
    this._persist();

    if (this._transactionRepository) {
      this._transactionRepository.create(tx)
        .then(saved => {
          if (saved && saved.id) tx.id = saved.id;
        })
        .catch(err => console.warn('[WalletService] Supabase create tx fallback:', err.message));
    }

    this._eventBus.emit(AppEvents.BALANCE_UPDATED, {
      balance: this._balance,
      passiveBalance: this._passiveBalance,
      lifetime: this._lifetimeEarnings
    });
  }

  /**
   * Menambahkan catatan riwayat setoran API key yang invalid / ditolak
   * @param {import('../../domain/models/ApiKey.js').ApiKey} apiKey
   */
  addFailedDeposit(apiKey) {
    const masked = typeof apiKey?.getMaskedKey === 'function' ? apiKey.getMaskedKey() : (apiKey?.keyString || 'API Key');
    const reward = Number(apiKey?.rewardAmount) || 3000;
    const tx = new Transaction({
      id: 'tx_' + Math.random().toString(36).substring(2, 9),
      userId: apiKey?.userId || this._getUserId() || 'usr_current',
      type: 'deposit',
      amount: reward,
      title: 'Setoran API Key (Invalid)',
      description: apiKey?.errorMessage || `Verifikasi gagal (Invalid): ${masked}`,
      status: 'failed',
      createdAt: apiKey?.createdAt || new Date().toISOString()
    });

    this._transactions.unshift(tx);
    this._persist();

    if (this._transactionRepository && tx.amount > 0) {
      this._transactionRepository.create(tx)
        .then(saved => {
          if (saved && saved.id) tx.id = saved.id;
        })
        .catch(err => console.warn('[WalletService] Supabase create tx fallback:', err.message));
    }

    this._eventBus.emit(AppEvents.BALANCE_UPDATED, {
      balance: this._balance,
      passiveBalance: this._passiveBalance,
      lifetime: this._lifetimeEarnings
    });
  }

  /**
   * Mengonversi saldo pasif menjadi saldo aktif saat disetujui admin
   * @param {number} amount
   * @param {string} [keyString]
   */
  convertPassiveToActive(amount, keyString = '') {
    this._passiveBalance = Math.max(0, this._passiveBalance - amount);
    this._balance += amount;
    this._lifetimeEarnings += amount;

    const pendingTx = this._transactions.find(t =>
      t.type === 'deposit' &&
      t.status === 'pending' &&
      (!keyString || (t.description && t.description.includes(keyString)))
    );

    if (pendingTx) {
      pendingTx.status = 'success';
      pendingTx.title = 'Setoran API Key (Terverifikasi)';
      pendingTx.description = `Terverifikasi oleh admin: ${keyString || 'API Key'}`;
    }

    this._persist();

    this._eventBus.emit(AppEvents.BALANCE_UPDATED, {
      balance: this._balance,
      passiveBalance: this._passiveBalance,
      lifetime: this._lifetimeEarnings
    });
  }

  /**
   * Mengambil biaya admin terkini untuk metode penarikan
   * @param {string} method
   * @param {number} [amount=0]
   * @returns {number}
   */
  getFeeForMethod(method, amount = 0) {
    try {
      const strategy = this._strategyFactory.get(method);
      return strategy ? strategy.calculateFee(amount) : 0;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Proses penarikan saldo menggunakan strategi penarikan (OCP & LSP)
   * @param {Object} params
   * @param {number} params.amount
   * @param {string} params.method
   * @param {string} params.accountIdentifier
   * @param {string} [params.userId]
   * @returns {Promise<{ success: boolean, message: string, transaction?: Transaction, fee?: number, totalReceive?: number }>}
   */
  async withdraw({
    amount,
    method,
    accountIdentifier,
    userId = 'usr_current',
    userName = '',
    userEmail = '',
    userPhone = '',
    accountHolder = '',
    bankName = '',
    referredBy = '',
    referralDeduction = 0
  }) {
    const numAmount = Number(amount);

    // 1. Dapatkan strategi dan hitung biaya admin sesuai pengaturan
    const strategy = this._strategyFactory.get(method);
    const fee = strategy ? strategy.calculateFee(numAmount) : 0;

    // Evaluasi potongan kode referral (aktif jika akun terikat kode referral)
    const currentUser = this._storage.get('current_user');
    const effectiveReferredBy = (referredBy || currentUser?.referredBy || '').trim().toUpperCase();
    let finalReferralDeduction = Number(referralDeduction || 0);
    const referralCutPercent = this.referralCutPercent;

    if (effectiveReferredBy && finalReferralDeduction <= 0 && referralCutPercent > 0) {
      finalReferralDeduction = Math.round(numAmount * (referralCutPercent / 100));
    }

    const totalReceive = Math.max(0, numAmount - fee - finalReferralDeduction);

    // 2. Validasi penarikan
    this._validator.minWithdrawal = this.minWithdrawal;
    const validation = this._validator.validate({
      amount: numAmount,
      currentBalance: this._balance,
      method,
      accountIdentifier
    });

    if (!validation.isValid) {
      return { success: false, message: validation.errors[0] };
    }

    // 3. Jalankan eksekusi strategi
    const result = await strategy.process(totalReceive, accountIdentifier);
    if (!result.success) {
      return { success: false, message: result.message };
    }

    // 4. Kurangi saldo pengguna
    this._balance -= numAmount;

    // 5. Catat transaksi dengan status 'pending' (perlu konfirmasi admin)
    const descParts = [`Penarikan ke ${accountIdentifier}`];
    if (fee > 0) descParts.push(`Biaya Admin: Rp ${fee.toLocaleString('id-ID')}`);
    if (finalReferralDeduction > 0 && effectiveReferredBy) {
      descParts.push(`Potongan Referral (${effectiveReferredBy}): Rp ${finalReferralDeduction.toLocaleString('id-ID')}`);
    }

    const tx = new Transaction({
      id: result.transactionId || 'tx_' + Math.random().toString(36).substring(2, 9),
      userId,
      userName,
      userEmail,
      userPhone,
      accountHolder,
      bankName: bankName || (strategy ? strategy.getLabel() : method),
      type: 'withdrawal',
      amount: numAmount,
      fee,
      referralCode: effectiveReferredBy,
      referralDeduction: finalReferralDeduction,
      referredBy: effectiveReferredBy,
      netPayout: totalReceive,
      title: `${strategy.getLabel()}`,
      description: descParts.join(' • '),
      status: 'pending',
      method,
      recipient: accountIdentifier,
      createdAt: new Date().toISOString()
    });

    this._transactions.unshift(tx);

    // Jika ada potongan kode referral, catat ke riwayat potongan referral
    if (finalReferralDeduction > 0 && effectiveReferredBy) {
      this._recordReferralTransaction({
        id: 'ref_' + tx.id.replace('tx_', ''),
        withdrawalId: tx.id,
        userId,
        userName,
        type: 'referral_deduction',
        referralCode: effectiveReferredBy,
        withdrawalAmount: numAmount,
        deductionAmount: finalReferralDeduction,
        deductionPercent: referralCutPercent,
        status: 'pending',
        method,
        recipient: accountIdentifier,
        createdAt: tx.createdAt,
        title: 'Potongan Kode Referral',
        description: `Potongan ${effectiveReferredBy} saat penarikan ${strategy.getLabel()}`
      });
    }

    this._persist();

    // Simpan ke Supabase jika repositori aktif
    if (this._transactionRepository) {
      try {
        const saved = await this._transactionRepository.create(tx);
        if (saved && saved.id) {
          tx.id = saved.id;
          this._persist();
        }
      } catch (err) {
        console.warn('[WalletService] Supabase create withdrawal tx fallback:', err.message);
      }
    }

    // Siarkan ke Admin Panel dan tab lain via BroadcastChannel
    if (this._broadcastChannel) {
      try {
        this._broadcastChannel.postMessage({
          type: 'WITHDRAWAL_REQUESTED',
          transaction: tx,
          userId,
          amount: numAmount,
          method,
          recipient: accountIdentifier,
          timestamp: Date.now()
        });
      } catch (e) {}
    }

    // Kirim notifikasi real-time ke Telegram Bot Admin (Grup)
    try {
      telegramService.notifyWithdrawalRequest({
        transactionId: tx.id,
        userId,
        userName: userName || currentUser?.name || '',
        userEmail: userEmail || currentUser?.email || '',
        userPhone: userPhone || currentUser?.phone || accountIdentifier,
        amount: numAmount,
        fee,
        referralDeduction: finalReferralDeduction,
        referralCode: effectiveReferredBy,
        netPayout: totalReceive,
        method: method || tx.bankName,
        recipient: accountIdentifier,
        accountHolder: accountHolder || currentUser?.accountHolder || userName,
        createdAt: tx.createdAt
      }).catch(e => console.warn('[WalletService] Telegram payout notification warning:', e.message));
    } catch (_) {}

    // 6. Emit balance & withdrawal event
    this._eventBus.emit(AppEvents.BALANCE_UPDATED, { balance: this._balance, lifetime: this._lifetimeEarnings });
    this._eventBus.emit(AppEvents.WITHDRAWAL_COMPLETED, { transaction: tx, newBalance: this._balance });

    return {
      success: true,
      transaction: tx,
      fee,
      totalReceive,
      message: `Permintaan penarikan Rp ${numAmount.toLocaleString('id-ID')} berhasil diajukan!`
    };
  }
}
