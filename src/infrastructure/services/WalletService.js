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

    this._balance = 85000;
    this._passiveBalance = 0;
    this._lifetimeEarnings = 450000;
    this._transactions = [];
    this._minWithdrawal = 50000;

    this._loadWallet();

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
    const savedBalance = this._storage.get('wallet_balance');
    if (savedBalance !== null && !isNaN(Number(savedBalance))) {
      this._balance = Number(savedBalance);
    }

    const savedPassive = this._storage.get('wallet_passive_balance');
    if (savedPassive !== null && !isNaN(Number(savedPassive))) {
      this._passiveBalance = Number(savedPassive);
    } else {
      const savedKeys = this._storage.get('api_keys') || [];
      this._passiveBalance = savedKeys
        .filter(k => k.status === 'pending')
        .reduce((sum, k) => sum + (Number(k.rewardAmount) || 3000), 0);
    }

    const savedLifetime = this._storage.get('lifetime_earnings');
    if (savedLifetime !== null && !isNaN(Number(savedLifetime))) {
      this._lifetimeEarnings = Number(savedLifetime);
    }

    const savedTx = this._storage.get('transactions');
    if (savedTx && Array.isArray(savedTx)) {
      this._transactions = savedTx.map(t => new Transaction(t));
    } else {
      // Mock transaksi awal prototipe
      this._transactions = [
        new Transaction({
          id: 'tx_01',
          userId: 'usr_budi_01',
          type: 'deposit',
          amount: 3000,
          title: 'Setoran API Key',
          description: 'Validasi kredit Kie.ai penuh (80 kredit)',
          status: 'success',
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
        }),
        new Transaction({
          id: 'tx_02',
          userId: 'usr_budi_01',
          type: 'deposit',
          amount: 3000,
          title: 'Setoran API Key',
          description: 'Validasi kredit Kie.ai penuh (80 kredit)',
          status: 'success',
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
        }),
        new Transaction({
          id: 'tx_03',
          userId: 'usr_budi_01',
          type: 'withdrawal',
          amount: 100000,
          title: 'Transfer Bank BCA',
          description: 'Penarikan dana ke rekening 5410987654',
          method: 'bank',
          recipient: '5410987654',
          status: 'success',
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
        }),
        new Transaction({
          id: 'tx_04',
          userId: 'usr_budi_01',
          type: 'withdrawal',
          amount: 150000,
          title: 'GoPay',
          description: 'Penarikan dana ke 081234567890',
          method: 'gopay',
          recipient: '081234567890',
          status: 'success',
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
        })
      ];
      this._persist();
    }

    // Sync remote transactions dari Supabase
    this._syncFromRemote();
  }

  async _syncFromRemote() {
    if (!this._transactionRepository) return;
    try {
      const remoteTxs = await this._transactionRepository.getAll();
      if (remoteTxs && remoteTxs.length > 0) {
        const txMap = new Map();
        remoteTxs.forEach(t => txMap.set(t.id, t));
        this._transactions.forEach(t => {
          if (!txMap.has(t.id)) {
            txMap.set(t.id, t);
          }
        });
        this._transactions = Array.from(txMap.values());
        this._persist();
      }
    } catch (err) {
      console.warn('[WalletService] Remote tx sync fallback to local cache:', err.message);
    }
  }

  _persist() {
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
