import { User } from '../../domain/models/User.js';
import { AppEvents } from '../../core/events/EventBus.js';

/**
 * AuthService
 * Prinsip: Single Responsibility Principle (SRP) & Dependency Inversion Principle (DIP)
 * Mengelola autentikasi pengguna, sesi login, dan informasi profil akun.
 */
export class AuthService {
  /**
   * @param {import('../../core/interfaces/IStorage.js').IStorage} storage
   * @param {import('../../domain/validators/AuthValidator.js').AuthValidator} validator
   * @param {import('../../core/events/EventBus.js').EventBus} eventBus
   */
  constructor(storage, validator, eventBus) {
    this._storage = storage;
    this._validator = validator;
    this._eventBus = eventBus;
    this._currentUser = null;

    this._loadSession();
  }

  _loadSession() {
    const saved = this._storage.get('current_user');
    if (saved) {
      this._currentUser = new User(saved);
    } else {
      // Default initial mock user untuk kenyamanan eksplorasi prototipe
      this._currentUser = new User({
        id: 'usr_budi_01',
        name: 'Budi Santoso',
        email: 'budi.santoso@example.com',
        phone: '081234567890',
        bankName: 'Bank Central Asia (BCA)',
        accountNumber: '5410987654',
        accountHolder: 'BUDI SANTOSO',
        isVerified: true
      });
      this._storage.set('current_user', this._currentUser.toJSON());
    }
  }

  /**
   * Cek apakah ada sesi user yang aktif
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this._currentUser;
  }

  /**
   * Mengembalikan objek User yang sedang login
   * @returns {User|null}
   */
  getCurrentUser() {
    return this._currentUser;
  }

  /**
   * Proses login pengguna
   * @param {string} emailOrUsername
   * @param {string} password
   * @returns {Promise<{ success: boolean, message?: string }>}
   */
  async login(emailOrUsername, password) {
    if (!emailOrUsername || !password) {
      return { success: false, message: 'Email dan kata sandi wajib diisi.' };
    }

    // Simulasi delay autentikasi
    await new Promise(res => setTimeout(res, 500));

    // Jika belum ada user atau login dengan email baru
    const nameFromEmail = emailOrUsername.split('@')[0];
    const formattedName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);

    this._currentUser = new User({
      id: 'usr_' + Math.random().toString(36).substring(2, 8),
      name: formattedName || 'Budi Santoso',
      email: emailOrUsername.includes('@') ? emailOrUsername : `${emailOrUsername}@example.com`,
      phone: '081234567890',
      bankName: 'Bank Central Asia (BCA)',
      accountNumber: '5410987654',
      accountHolder: formattedName.toUpperCase() || 'BUDI SANTOSO',
      isVerified: true
    });

    this._storage.set('current_user', this._currentUser.toJSON());
    this._eventBus.emit(AppEvents.AUTH_STATE_CHANGED, { isAuthenticated: true, user: this._currentUser });
    return { success: true };
  }

  /**
   * Proses pendaftaran akun baru
   * @param {Object} data
   * @param {string} data.name
   * @param {string} data.email
   * @param {string} data.password
   * @param {string} [data.confirmPassword]
   * @returns {Promise<{ success: boolean, errors?: string[] }>}
   */
  async register(data) {
    const validation = this._validator.validate(data);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    await new Promise(res => setTimeout(res, 700));

    this._currentUser = new User({
      id: 'usr_' + Math.random().toString(36).substring(2, 8),
      name: data.name,
      email: data.email,
      phone: '0812' + Math.floor(10000000 + Math.random() * 90000000),
      bankName: 'Bank Central Asia (BCA)',
      accountNumber: '5410' + Math.floor(100000 + Math.random() * 900000),
      accountHolder: data.name.toUpperCase(),
      isVerified: true
    });

    this._storage.set('current_user', this._currentUser.toJSON());
    this._eventBus.emit(AppEvents.AUTH_STATE_CHANGED, { isAuthenticated: true, user: this._currentUser });
    return { success: true };
  }

  /**
   * Perbarui profil pengguna (rekening, telepon, dsb.)
   * @param {Partial<User>} updates
   */
  updateProfile(updates) {
    if (!this._currentUser) return;
    Object.assign(this._currentUser, updates);
    this._storage.set('current_user', this._currentUser.toJSON());
    this._eventBus.emit(AppEvents.USER_UPDATED, this._currentUser);
  }

  /**
   * Logout dan hapus sesi
   */
  logout() {
    this._currentUser = null;
    this._storage.remove('current_user');
    this._eventBus.emit(AppEvents.AUTH_STATE_CHANGED, { isAuthenticated: false, user: null });
  }
}
