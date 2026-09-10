/**
 * Interface IApiKeyRepository
 * Prinsip: Dependency Inversion Principle (DIP) & Interface Segregation Principle (ISP)
 * Kontrak abstraksi akses data untuk entitas ApiKey.
 */
export class IApiKeyRepository {
  /**
   * Mengambil semua API Key yang disetor oleh user
   * @param {string} [userId]
   * @returns {Promise<import('../../domain/models/ApiKey.js').ApiKey[]>}
   */
  async getAll(userId) {
    throw new Error('Method getAll() must be implemented');
  }

  /**
   * Mengambil API Key berdasarkan string key untuk pencegahan duplikasi
   * @param {string} keyString
   * @returns {Promise<import('../../domain/models/ApiKey.js').ApiKey|null>}
   */
  async getByKeyString(keyString) {
    throw new Error('Method getByKeyString() must be implemented');
  }

  /**
   * Menyimpan API Key baru
   * @param {import('../../domain/models/ApiKey.js').ApiKey|Object} apiKey
   * @returns {Promise<import('../../domain/models/ApiKey.js').ApiKey>}
   */
  async create(apiKey) {
    throw new Error('Method create() must be implemented');
  }

  /**
   * Memperbarui data API Key
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<import('../../domain/models/ApiKey.js').ApiKey>}
   */
  async update(id, updates) {
    throw new Error('Method update() must be implemented');
  }

  /**
   * Menghapus API Key
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    throw new Error('Method delete() must be implemented');
  }
}
