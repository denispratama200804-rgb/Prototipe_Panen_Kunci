/**
 * Interface IUserRepository
 * Prinsip: Dependency Inversion Principle (DIP) & Interface Segregation Principle (ISP)
 * Kontrak abstraksi akses data untuk entitas User.
 */
export class IUserRepository {
  /**
   * Mengambil semua user
   * @returns {Promise<import('../../domain/models/User.js').User[]>}
   */
  async getAll() {
    throw new Error('Method getAll() must be implemented');
  }

  /**
   * Mengambil user berdasarkan ID
   * @param {string} id
   * @returns {Promise<import('../../domain/models/User.js').User|null>}
   */
  async getById(id) {
    throw new Error('Method getById() must be implemented');
  }

  /**
   * Mengambil user berdasarkan Email
   * @param {string} email
   * @returns {Promise<import('../../domain/models/User.js').User|null>}
   */
  async getByEmail(email) {
    throw new Error('Method getByEmail() must be implemented');
  }

  /**
   * Membuat user baru
   * @param {Object} userData
   * @returns {Promise<import('../../domain/models/User.js').User>}
   */
  async create(userData) {
    throw new Error('Method create() must be implemented');
  }

  /**
   * Memperbarui data user
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<import('../../domain/models/User.js').User>}
   */
  async update(id, updates) {
    throw new Error('Method update() must be implemented');
  }

  /**
   * Menghapus user
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    throw new Error('Method delete() must be implemented');
  }
}
