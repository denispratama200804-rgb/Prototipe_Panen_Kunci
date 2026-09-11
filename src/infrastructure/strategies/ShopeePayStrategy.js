import { IWithdrawalStrategy } from '../../core/interfaces/IWithdrawalStrategy.js';

/**
 * ShopeePayStrategy
 * Prinsip: Open/Closed Principle (OCP) & Liskov Substitution Principle (LSP)
 * Penarikan saldo ke e-wallet ShopeePay.
 */
export class ShopeePayStrategy extends IWithdrawalStrategy {
  getMethodName() {
    return 'shopeepay';
  }

  getLabel() {
    return 'ShopeePay';
  }

  calculateFee(amount) {
    try {
      const raw = localStorage.getItem('panenkunci:admin_config');
      if (raw) {
        const config = JSON.parse(raw);
        if (config && config.feeShopeePay !== undefined && !isNaN(Number(config.feeShopeePay))) {
          return Number(config.feeShopeePay);
        }
        if (config && config.feeDana !== undefined && !isNaN(Number(config.feeDana))) {
          return Number(config.feeDana);
        }
      }
    } catch (e) {}
    return 1000;
  }

  async process(amount, accountIdentifier) {
    await new Promise(res => setTimeout(res, 800));
    const txId = 'WD-SPAY-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    return {
      success: true,
      transactionId: txId,
      message: `Penarikan Rp ${amount.toLocaleString('id-ID')} ke ShopeePay (${accountIdentifier}) berhasil diproses!`
    };
  }
}
