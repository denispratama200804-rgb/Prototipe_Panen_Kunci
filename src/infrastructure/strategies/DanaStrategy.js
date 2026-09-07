import { IWithdrawalStrategy } from '../../core/interfaces/IWithdrawalStrategy.js';

/**
 * DanaStrategy
 * Prinsip: Open/Closed Principle (OCP) & Liskov Substitution Principle (LSP)
 * Penarikan saldo ke e-wallet DANA.
 */
export class DanaStrategy extends IWithdrawalStrategy {
  getMethodName() {
    return 'dana';
  }

  getLabel() {
    return 'DANA';
  }

  calculateFee(amount) {
    try {
      const raw = localStorage.getItem('panenkunci:admin_config');
      if (raw) {
        const config = JSON.parse(raw);
        if (config && config.feeDana !== undefined && !isNaN(Number(config.feeDana))) {
          return Number(config.feeDana);
        }
      }
    } catch (e) {}
    return 1000; // Default DANA sesuai konfigurasi admin
  }

  async process(amount, accountIdentifier) {
    // Simulasi delay gateway pencairan
    await new Promise(res => setTimeout(res, 800));
    const txId = 'WD-DANA-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    return {
      success: true,
      transactionId: txId,
      message: `Penarikan Rp ${amount.toLocaleString('id-ID')} ke DANA (${accountIdentifier}) berhasil diproses!`
    };
  }
}
