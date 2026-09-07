import { IValidator } from '../../core/interfaces/IValidator.js';

/**
 * WithdrawalValidator
 * Prinsip: Single Responsibility Principle (SRP)
 * Menangani validasi penarikan saldo (nominal minimum, saldo cukup, kelayakan rekening tujuan).
 */
export class WithdrawalValidator extends IValidator {
  constructor(minWithdrawal = 50000) {
    super();
    this.minWithdrawal = minWithdrawal;
  }

  /**
   * @param {Object} data
   * @param {number} data.amount
   * @param {number} data.currentBalance
   * @param {string} data.method
   * @param {string} data.accountIdentifier
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  validate(data) {
    const errors = [];
    const amount = Number(data.amount);

    if (isNaN(amount) || amount <= 0) {
      errors.push('Nominal penarikan harus berupa angka lebih dari 0.');
    } else if (amount < this.minWithdrawal) {
      errors.push(`Batas minimal penarikan adalah Rp ${this.minWithdrawal.toLocaleString('id-ID')}.`);
    } else if (amount > data.currentBalance) {
      errors.push(`Saldo tidak mencukupi. Saldo aktif Anda: Rp ${data.currentBalance.toLocaleString('id-ID')}.`);
    }

    if (!data.method) {
      errors.push('Silakan pilih metode pencairan saldo.');
    }

    if (!data.accountIdentifier || data.accountIdentifier.trim().length < 8) {
      errors.push('Nomor handphone e-wallet atau rekening bank harus valid (minimal 8 karakter).');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
