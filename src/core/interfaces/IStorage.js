/**
 * Interface IStorage
 * Prinsip: Dependency Inversion Principle (DIP) & Interface Segregation Principle (ISP)
 * Abstraksi untuk mekanisme penyimpanan data aplikasi (LocalStorage, Memory, Remote API).
 */
export class IStorage {
  /**
   * Mengambil data berdasarkan key
   * @param {string} key
   * @returns {any}
   */
  get(key) {
    throw new Error('Method get() must be implemented');
  }

  /**
   * Menyimpan data
   * @param {string} key
   * @param {any} value
   */
  set(key, value) {
    throw new Error('Method set() must be implemented');
  }

  /**
   * Menghapus data berdasarkan key
   * @param {string} key
   */
  remove(key) {
    throw new Error('Method remove() must be implemented');
  }

  /**
   * Membersihkan seluruh data penyimpanan aplikasi
   */
  clear() {
    throw new Error('Method clear() must be implemented');
  }
}
