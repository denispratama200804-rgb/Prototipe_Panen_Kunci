/**
 * Interface IWithdrawalStrategy
 * Prinsip: Open/Closed Principle (OCP) & Liskov Substitution Principle (LSP)
 * Kontrak strategi penarikan saldo untuk berbagai metode pembayaran.
 */
export class IWithdrawalStrategy {
  /**
   * Mengembalikan kode identifikasi metode penarikan (misal: 'dana', 'gopay', 'ovo', 'bank')
   * @returns {string}
   */
  getMethodName() {
    throw new Error('Method getMethodName() must be implemented');
  }

  /**
   * Mengembalikan label display yang ramah pengguna
   * @returns {string}
   */
  getLabel() {
    throw new Error('Method getLabel() must be implemented');
  }

  /**
   * Mengembalikan biaya admin (misal 0 untuk gratis)
   * @param {number} amount
   * @returns {number}
   */
  calculateFee(amount) {
    throw new Error('Method calculateFee() must be implemented');
  }

  /**
   * Menjalankan proses penarikan saldo
   * @param {number} amount
   * @param {string} accountIdentifier
   * @returns {Promise<{ success: boolean, transactionId: string, message: string }>}
   */
  async process(amount, accountIdentifier) {
    throw new Error('Method process() must be implemented');
  }
}
