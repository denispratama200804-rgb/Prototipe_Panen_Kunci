/**
 * Model User
 * Prinsip: Single Responsibility Principle (SRP)
 * Entitas domain untuk merepresentasikan pengguna Panen Kunci.
 */
export class User {
  /**
   * @param {Object} params
   * @param {string} params.id
   * @param {string} params.name
   * @param {string} params.email
   * @param {string} [params.role]
   * @param {string} [params.phone]
   * @param {string} [params.bankName]
   * @param {string} [params.accountNumber]
   * @param {string} [params.accountHolder]
   * @param {boolean} [params.isVerified]
   * @param {string} [params.createdAt]
   * @param {string} [params.avatar]
   */
  constructor({
    id,
    name,
    email,
    password = '',
    role = 'user',
    phone = '',
    bankName = '',
    accountNumber = '',
    accountHolder = '',
    isVerified = false,
    createdAt = new Date().toISOString(),
    avatar = '/avatar.png'
  }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.password = password || '';
    this.role = (role || 'user').toLowerCase();
    this.phone = phone || '';
    this.bankName = bankName || '';
    this.accountNumber = accountNumber || '';
    this.accountHolder = accountHolder || '';
    this.isVerified = Boolean(isVerified);
    this.createdAt = createdAt;
    this.avatar = avatar || '/avatar.png';
  }

  /**
   * Cek apakah user adalah administrator
   * @returns {boolean}
   */
  isAdmin() {
    return this.role === 'admin';
  }

  /**
   * Cek apakah user adalah pengguna biasa
   * @returns {boolean}
   */
  isUser() {
    return this.role !== 'admin';
  }

  /**
   * Mengembalikan nomor rekening bertopeng (masked)
   * @returns {string}
   */
  getMaskedAccountNumber() {
    if (!this.accountNumber || this.accountNumber.length < 4) return '****';
    const last4 = this.accountNumber.slice(-4);
    return `**** **** ${last4}`;
  }

  /**
   * Serialisasi ke object JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      password: this.password,
      role: this.role,
      phone: this.phone,
      bankName: this.bankName,
      accountNumber: this.accountNumber,
      accountHolder: this.accountHolder,
      isVerified: this.isVerified,
      createdAt: this.createdAt,
      avatar: this.avatar
    };
  }
}
