import { IWithdrawalStrategy } from '../../core/interfaces/IWithdrawalStrategy.js';

/**
 * BankTransferStrategy
 * Prinsip: Open/Closed Principle (OCP) & Liskov Substitution Principle (LSP)
 * Penarikan saldo ke Rekening Bank (BCA, BRI, Mandiri, BNI, dll).
 */
export class BankTransferStrategy extends IWithdrawalStrategy {
  getMethodName() {
    return 'bank';
  }

  getLabel() {
    return 'Bank Transfer';
  }

  calculateFee(amount) {
    try {
      const raw = localStorage.getItem('panenkunci:admin_config');
      if (raw) {
        const config = JSON.parse(raw);
        if (config && config.feeBank !== undefined && !isNaN(Number(config.feeBank))) {
          return Number(config.feeBank);
        }
      }
    } catch (e) {}
    return 2500;
  }

  async process(amount, accountIdentifier) {
    await new Promise(res => setTimeout(res, 900));
    const txId = 'WD-BANK-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    return {
      success: true,
      transactionId: txId,
      message: `Transfer bank Rp ${amount.toLocaleString('id-ID')} ke Rekening ${accountIdentifier} berhasil diajukan!`
    };
  }
}
