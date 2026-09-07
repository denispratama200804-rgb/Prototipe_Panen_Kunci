import { IWithdrawalStrategy } from '../../core/interfaces/IWithdrawalStrategy.js';

/**
 * GopayStrategy
 * Prinsip: Open/Closed Principle (OCP) & Liskov Substitution Principle (LSP)
 * Penarikan saldo ke e-wallet GoPay.
 */
export class GopayStrategy extends IWithdrawalStrategy {
  getMethodName() {
    return 'gopay';
  }

  getLabel() {
    return 'GoPay';
  }

  calculateFee(amount) {
    try {
      const raw = localStorage.getItem('panenkunci:admin_config');
      if (raw) {
        const config = JSON.parse(raw);
        if (config && config.feeGopay !== undefined && !isNaN(Number(config.feeGopay))) {
          return Number(config.feeGopay);
        }
      }
    } catch (e) {}
    return 1000;
  }

  async process(amount, accountIdentifier) {
    await new Promise(res => setTimeout(res, 800));
    const txId = 'WD-GOPAY-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    return {
      success: true,
      transactionId: txId,
      message: `Penarikan Rp ${amount.toLocaleString('id-ID')} ke GoPay (${accountIdentifier}) berhasil diproses!`
    };
  }
}
