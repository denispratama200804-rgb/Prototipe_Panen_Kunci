import { Transaction } from '../../domain/models/Transaction.js';
import { AppEvents } from '../../core/events/EventBus.js';

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
  constructor(storage, validator, strategyFactory, eventBus, transactionRepository = null) {
    this._storage = storage;
    this._validator = validator;
    this._strategyFactory = strategyFactory;
    this._eventBus = eventBus;
    this._transactionRepository = transactionRepository;

    this._balance = 0;
    this._passiveBalance = 0;
    this._lifetimeEarnings = 0;
    this._transactions = [];
    this._minWithdrawal = 50000;

    this._loadWallet();

    // Listen auth state changed: saat user login/register/logout, reset dan muat ulang dompet milik user tersebut
    this._eventBus.on(AppEvents.AUTH_STATE_CHANGED, () => {
      this._loadWallet();
      this._syncFromRemote();
      this._eventBus.emit(AppEvents.BALANCE_UPDATED, {
        balance: this._balance,
        passiveBalance: this._passiveBalance,
        lifetime: this._lifetimeEarnings
      });
    });

    // Cross-tab synchronization via storage event
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (
          e.key &&
          (e.key.includes('wallet_balance') ||
           e.key.includes('wallet_passive_balance') ||
           e.key.includes('transactions') ||
           e.key.includes('api_keys'))
        ) {
          this._loadWallet();
          this._eventBus.emit(AppEvents.BALANCE_UPDATED, {
            balance: this._balance,
            passiveBalance: this._passiveBalance,
            lifetime: this._lifetimeEarnings
          });
        }
      });
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
      validationMode: 'simulation'
    };
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
        .map(t => new Transaction(t));
    }

    // Hitung total penarikan aktif
    const totalWithdrawals = loadedTxs
      .filter(t => t.type === 'withdrawal' && (t.status === 'success' || t.status === 'pending'))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    if (combinedKeys.length === 0 && loadedTxs.length === 0) {
      this._balance = 0;
      this._passiveBalance = 0;
      this._lifetimeEarnings = 0;
      this._transactions = [];
      this._persist();
    } else {
      // Saldo aktif adalah akumulasi deposit valid dikurangi penarikan
      const calculatedActive = Math.max(0, expectedActiveDeposit - totalWithdrawals);
      this._balance = calculatedActive;

      // Saldo pasif SELALU bersumber secara authoritative dari total reward API key yang berstatus pending
      this._passiveBalance = expectedPassiveDeposit;

      // Lifetime earnings
      this._lifetimeEarnings = expectedActiveDeposit;
      this._transactions = loadedTxs;

      // Pastikan jika ada key valid/pending yang belum ada di riwayat mutasi transaksi, tambahkan ke transaksi
      this._ensureDepositTransactions(combinedKeys);
    }

    // Sync remote transactions dari Supabase
    this._syncFromRemote();
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
      if (k.status !== 'valid' && k.status !== 'pending') return;

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

      const isVerified = k.status === 'valid';
      const reward = Number(k.rewardAmount) || 3000;

      if (!existing) {
        const newTx = new Transaction({
          id: 'tx_' + Math.random().toString(36).substring(2, 9),
          userId,
          type: 'deposit',
          amount: reward,
          title: isVerified ? 'Setoran API Key (Terverifikasi)' : 'Setoran API Key',
          description: isVerified ? `Terverifikasi oleh Admin: ${masked}` : `Menunggu verifikasi admin: ${masked}`,
          status: isVerified ? 'success' : 'pending',
          createdAt: k.createdAt || new Date().toISOString()
        });

        this._transactions.unshift(newTx);
        hasNewTx = true;

        if (this._transactionRepository) {
          this._transactionRepository.create(newTx).catch(() => {});
        }
      } else if (isVerified && existing.status === 'pending') {
        existing.status = 'success';
        existing.title = 'Setoran API Key (Terverifikasi)';
        existing.description = `Terverifikasi oleh Admin: ${masked}`;
        hasNewTx = true;

        if (this._transactionRepository && existing.id && existing.id.includes('-')) {
          this._transactionRepository.updateStatus(existing.id, 'success').catch(() => {});
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

    try {
      // Filter transaksi HANYA untuk pengguna yang sedang aktif
      const remoteTxs = await this._transactionRepository.getAll(userId);

      // Ambil daftar key pengguna terkini
      const userKeysKey = `api_keys_${userId}`;
      const savedUserKeys = this._storage.get(userKeysKey) || [];
      const globalKeys = (this._storage.get('api_keys') || []).filter(k => k.userId === userId);
      const combinedKeys = savedUserKeys.length > 0 ? savedUserKeys : globalKeys;

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

        // Hapus transaksi duplikat dari Supabase secara otomatis di background
        if (duplicateIdsToDelete.length > 0 && typeof fetch !== 'undefined') {
          duplicateIdsToDelete.forEach(dupId => {
            if (dupId && dupId.includes('-')) {
              fetch('/api/supabase-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', table: 'transactions', id: dupId })
              }).catch(() => {});
            }
          });
        }

        this._transactions = deduplicatedTxs;

        let calculatedLifetime = 0;
        let calculatedBalance = 0;

        deduplicatedTxs.forEach(tx => {
          const amt = Number(tx.amount) || 0;
          if (tx.type === 'deposit') {
            if (tx.status === 'success') {
              calculatedBalance += amt;
              calculatedLifetime += amt;
            }
          } else if (tx.type === 'withdrawal') {
            if (tx.status === 'success' || tx.status === 'pending') {
              calculatedBalance -= amt;
            }
          }
        });

        // Selaraskan dengan data key agar tidak ada saldo yang hilang atau menggelembung
        this._balance = Math.max(0, calculatedBalance, expectedActive);
        this._passiveBalance = expectedPassive;
        this._lifetimeEarnings = Math.max(calculatedLifetime, expectedActive);
      } else {
        // Jika remoteTxs belum ada/kosong di database, gunakan perhitungan authoritative dari daftar key user!
        const totalWithdrawals = this._transactions
          .filter(t => t.type === 'withdrawal' && (t.status === 'success' || t.status === 'pending'))
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        this._balance = Math.max(0, expectedActive - totalWithdrawals);
        this._passiveBalance = expectedPassive;
        this._lifetimeEarnings = expectedActive;
      }

      this._ensureDepositTransactions(combinedKeys);
      this._persist();

      this._eventBus.emit(AppEvents.BALANCE_UPDATED, {
        balance: this._balance,
        passiveBalance: this._passiveBalance,
        lifetime: this._lifetimeEarnings
      });
    } catch (err) {
      console.warn('[WalletService] Remote tx sync fallback to local cache:', err.message);
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
    this._storage.set('wallet_balance', this._balance);
    this._storage.set('wallet_passive_balance', this._passiveBalance);
    this._storage.set('lifetime_earnings', this._lifetimeEarnings);
    this._storage.set('transactions', this._transactions.map(t => t.toJSON()));
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
   * Ambil transaksi penarikan saja
   * @returns {Transaction[]}
   */
  getWithdrawals() {
    return this.getTransactions().filter(t => t.type === 'withdrawal');
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
      userId: apiKey.userId || 'usr_current',
      type: 'deposit',
      amount,
      title: 'Setoran API Key',
      description: `Validasi berhasil: ${apiKey.getMaskedKey()}`,
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
  async withdraw({ amount, method, accountIdentifier, userId = 'usr_current' }) {
    const numAmount = Number(amount);

    // 1. Dapatkan strategi dan hitung biaya admin sesuai pengaturan
    const strategy = this._strategyFactory.get(method);
    const fee = strategy ? strategy.calculateFee(numAmount) : 0;
    const totalReceive = Math.max(0, numAmount - fee);

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
    const tx = new Transaction({
      id: result.transactionId || 'tx_' + Math.random().toString(36).substring(2, 9),
      userId,
      type: 'withdrawal',
      amount: numAmount,
      fee,
      title: `${strategy.getLabel()}`,
      description: `Penarikan ke ${accountIdentifier}${fee > 0 ? ` (Biaya Admin: Rp ${fee.toLocaleString('id-ID')})` : ''}`,
      status: 'pending',
      method,
      recipient: accountIdentifier,
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
        .catch(err => console.warn('[WalletService] Supabase create withdrawal tx fallback:', err.message));
    }

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
