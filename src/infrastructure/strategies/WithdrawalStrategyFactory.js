import { DanaStrategy } from './DanaStrategy.js';
import { GopayStrategy } from './GopayStrategy.js';
import { OvoStrategy } from './OvoStrategy.js';
import { ShopeePayStrategy } from './ShopeePayStrategy.js';
import { BankTransferStrategy } from './BankTransferStrategy.js';

/**
 * WithdrawalStrategyFactory
 * Prinsip: Open/Closed Principle (OCP) & Factory Pattern
 * Mengelola pendaftaran dan resolusi strategi penarikan saldo.
 */
export class WithdrawalStrategyFactory {
  constructor() {
    this._strategies = new Map();
    this._registerDefaults();
  }

  _registerDefaults() {
    this.register(new DanaStrategy());
    this.register(new GopayStrategy());
    this.register(new OvoStrategy());
    this.register(new ShopeePayStrategy());
    this.register(new BankTransferStrategy());
  }

  /**
   * Daftarkan strategy baru (Memenuhi OCP: terbuka untuk ekstensi)
   * @param {import('../../core/interfaces/IWithdrawalStrategy.js').IWithdrawalStrategy} strategy
   */
  register(strategy) {
    this._strategies.set(strategy.getMethodName(), strategy);
  }

  /**
   * Ambil strategy berdasarkan nama method
   * @param {string} methodName
   * @returns {import('../../core/interfaces/IWithdrawalStrategy.js').IWithdrawalStrategy}
   */
  get(methodName) {
    const strategy = this._strategies.get(methodName);
    if (!strategy) {
      throw new Error(`Strategi penarikan "${methodName}" tidak ditemukan.`);
    }
    return strategy;
  }

  /**
   * Mengembalikan daftar semua strategi yang tersedia
   * @returns {import('../../core/interfaces/IWithdrawalStrategy.js').IWithdrawalStrategy[]}
   */
  getAll() {
    return Array.from(this._strategies.values());
  }
}
