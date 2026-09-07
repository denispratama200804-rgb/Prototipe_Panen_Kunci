import { IWithdrawalStrategy } from '../../core/interfaces/IWithdrawalStrategy.js';

/**
 * OvoStrategy
 * Prinsip: Open/Closed Principle (OCP) & Liskov Substitution Principle (LSP)
 * Penarikan saldo ke e-wallet OVO.
 */
export class OvoStrategy extends IWithdrawalStrategy {
  getMethodName() {
    return 'ovo';
  }

  getLabel() {
    return 'OVO';
  }

  calculateFee(amount) {
    try {
      const raw = localStorage.getItem('panenkunci:admin_config');
      if (raw) {
        const config = JSON.parse(raw);
        if (config && config.feeOvo !== undefined && !isNaN(Number(config.feeOvo))) {
          return Number(config.feeOvo);
        }
      }
    } catch (e) {}
    return 1000;
  }

  async process(amount, accountIdentifier) {
    await new Promise(res => setTimeout(res, 800));
    const txId = 'WD-OVO-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    return {
      success: true,
      transactionId: txId,
      message: `Penarikan Rp ${amount.toLocaleString('id-ID')} ke OVO (${accountIdentifier}) berhasil diproses!`
    };
  }
}
