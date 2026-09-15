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
   * @param {string} [params.nicknameUpdatedAt]
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
    avatar = '',
    nicknameUpdatedAt = null
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
    this.createdAt = createdAt;
    this.avatar = (avatar && avatar !== '/avatar.png') ? avatar : '';
    this.nicknameUpdatedAt = nicknameUpdatedAt || null;

    // Akun terverifikasi jika sudah mendaftarkan rekening e-wallet atau merupakan administrator
    const hasPayment = this.hasPaymentDetails();
    this.isVerified = this.isAdmin() ? Boolean(isVerified) : hasPayment;
  }

  /**
   * Mengecek apakah pengguna sudah mendaftarkan rekening atau e-wallet pencairan yang valid
   * @returns {boolean}
   */
  hasPaymentDetails() {
    const b = (this.bankName || '').trim();
    const a = (this.accountNumber || '').trim();
    const p = (this.phone || '').trim();
    return Boolean(b && b !== '-' && ((a && a !== '-') || (p && p !== '-')));
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
   * Mengecek apakah pengguna diperbolehkan mengganti nickname (aturan: 1 bulan / 30 hari sekali)
   * @returns {{ allowed: boolean, daysLeft: number, nextDate: Date | null }}
   */
  canChangeNickname() {
    if (!this.nicknameUpdatedAt) {
      return { allowed: true, daysLeft: 0, nextDate: null };
    }

    const lastTime = new Date(this.nicknameUpdatedAt).getTime();
    if (isNaN(lastTime)) {
      return { allowed: true, daysLeft: 0, nextDate: null };
    }

    const cooldownMs = 30 * 24 * 60 * 60 * 1000; // 30 hari dalam milidetik
    const elapsed = Date.now() - lastTime;

    if (elapsed >= cooldownMs) {
      return { allowed: true, daysLeft: 0, nextDate: null };
    }

    const remainingMs = cooldownMs - elapsed;
    const daysLeft = Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
    const nextDate = new Date(lastTime + cooldownMs);

    return {
      allowed: false,
      daysLeft,
      nextDate
    };
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
      avatar: this.avatar,
      nicknameUpdatedAt: this.nicknameUpdatedAt
    };
  }
}
