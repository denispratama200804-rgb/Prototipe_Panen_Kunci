import { Transaction } from '../../domain/models/Transaction.js';
import { AppEvents } from '../../core/events/EventBus.js';

/**
 * WalletService
 * Prinsip: Single Responsibility Principle (SRP) & Dependency Inversion Principle (DIP)
 * Mengelola saldo aktif, pendapatan lifetime, progress limit penarikan,
 * dan memproses penarikan dana menggunakan Strategy Pattern.
 */
export class WalletService {
  /**
   * @param {import('../../core/interfaces/IStorage.js').IStorage} storage
   * @param {import('../../domain/validators/WithdrawalValidator.js').WithdrawalValidator} validator
   * @param {import('../strategies/WithdrawalStrategyFactory.js').WithdrawalStrategyFactory} strategyFactory
   * @param {import('../../core/events/EventBus.js').EventBus} eventBus
   */
  constructor(storage, validator, strategyFactory, eventBus) {
    this._storage = storage;
    this._validator = validator;
    this._strategyFactory = strategyFactory;
    this._eventBus = eventBus;

    this._balance = 85000;
    this._lifetimeEarnings = 450000;
    this._transactions = [];
    this._minWithdrawal = 50000; // Minimum penarikan default Rp 50.000

    this._loadWallet();
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

    const savedLifetime = this._storage.get('lifetime_earnings');
    if (savedLifetime !== null && !isNaN(Number(savedLifetime))) {
      this._lifetimeEarnings = Number(savedLifetime);
    }

    const savedTx = this._storage.get('transactions');
    if (savedTx && Array.isArray(savedTx)) {
      this._transactions = savedTx.map(t => new Transaction(t));
    } else {
      // Mock transaksi awal yang realistis sesuai prototipe
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
  }

  _persist() {
    this._storage.set('wallet_balance', this._balance);
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

    this._eventBus.emit(AppEvents.BALANCE_UPDATED, { balance: this._balance, lifetime: this._lifetimeEarnings });
  }

  /**
   * Proses penarikan saldo menggunakan strategi penarikan (OCP & LSP)
   * @param {Object} params
   * @param {number} params.amount
   * @param {string} params.method
   * @param {string} params.accountIdentifier
   * @param {string} [params.userId]
   * @returns {Promise<{ success: boolean, message: string, transaction?: Transaction }>}
   */
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
   * @returns {Promise<{ success: boolean, message: string, transaction?: Transaction, fee?: number, totalDeduction?: number }>}
   */
  async withdraw({ amount, method, accountIdentifier, userId = 'usr_current' }) {
    const numAmount = Number(amount);

    // 1. Dapatkan strategi dan hitung biaya admin sesuai pengaturan admin panel
    const strategy = this._strategyFactory.get(method);
    const fee = strategy ? strategy.calculateFee(numAmount) : 0;
    const totalReceive = Math.max(0, numAmount - fee);

    // 2. Validasi penarikan (selalu sinkronkan minWithdrawal terkini dari admin)
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

    // 5. Catat transaksi dengan status 'pending' (Wajib diproses manual oleh Admin)
    const tx = new Transaction({
      id: result.transactionId || 'tx_' + Math.random().toString(36).substring(2, 9),
      userId,
      type: 'withdrawal',
      amount: numAmount,
      fee,
      netPayout: totalReceive,
      title: `${strategy.getLabel()}`,
      description: `Penarikan ke ${accountIdentifier}${fee > 0 ? ` (Biaya Admin: Rp ${fee.toLocaleString('id-ID')})` : ''}`,
      status: 'pending',
      method,
      recipient: accountIdentifier,
      createdAt: new Date().toISOString()
    });

    this._transactions.unshift(tx);
    this._persist();

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
