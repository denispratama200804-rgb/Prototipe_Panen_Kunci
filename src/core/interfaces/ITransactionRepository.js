/**
 * Interface ITransactionRepository
 * Prinsip: Dependency Inversion Principle (DIP) & Interface Segregation Principle (ISP)
 * Kontrak abstraksi akses data untuk entitas Transaction (mutasi saldo).
 */
export class ITransactionRepository {
  /**
   * Mengambil semua transaksi user
   * @param {string} [userId]
   * @returns {Promise<import('../../domain/models/Transaction.js').Transaction[]>}
   */
  async getAll(userId) {
    throw new Error('Method getAll() must be implemented');
  }

  /**
   * Menyimpan transaksi baru (deposit / withdrawal)
   * @param {import('../../domain/models/Transaction.js').Transaction|Object} transaction
   * @returns {Promise<import('../../domain/models/Transaction.js').Transaction>}
   */
  async create(transaction) {
    throw new Error('Method create() must be implemented');
  }

  /**
   * Memperbarui status transaksi
   * @param {string} id
   * @param {'pending'|'success'|'failed'} status
   * @returns {Promise<import('../../domain/models/Transaction.js').Transaction>}
   */
  async updateStatus(id, status) {
    throw new Error('Method updateStatus() must be implemented');
  }
}
