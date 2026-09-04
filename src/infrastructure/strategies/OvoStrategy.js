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
    return 0; // Bebas biaya admin
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
