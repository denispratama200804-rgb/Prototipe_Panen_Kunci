/**
 * ServiceContainer
 * Prinsip: Dependency Inversion Principle (DIP)
 * IoC (Inversion of Control) container untuk mendaftarkan dan menyelesaikan dependensi
 * secara terpusat tanpa kopling langsung antar kelas konkrit.
 */
export class ServiceContainer {
  constructor() {
    this._services = new Map();
    this._factories = new Map();
  }

  /**
   * Daftarkan singleton instance
   * @param {string} key
   * @param {any} instance
   */
  registerSingleton(key, instance) {
    this._services.set(key, instance);
  }

  /**
   * Daftarkan factory function yang akan menghasilkan instance saat di-resolve
   * @param {string} key
   * @param {Function} factory
   */
  registerFactory(key, factory) {
    this._factories.set(key, factory);
  }

  /**
   * Mengambil instance berdasarkan key
   * @param {string} key
   * @returns {any}
   */
  resolve(key) {
    if (this._services.has(key)) {
      return this._services.get(key);
    }
    if (this._factories.has(key)) {
      const factory = this._factories.get(key);
      const instance = factory(this);
      this._services.set(key, instance); // Cache as singleton
      return instance;
    }
    throw new Error(`Service not registered in container: ${key}`);
  }

  /**
   * Mengecek apakah service terdaftar
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this._services.has(key) || this._factories.has(key);
  }
}
