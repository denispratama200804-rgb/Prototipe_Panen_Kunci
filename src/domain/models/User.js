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
   * @param {string} [params.referralCode]
   * @param {string} [params.referredBy]
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
    nicknameUpdatedAt = null,
    referralCode = '',
    referredBy = ''
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
    this.referralCode = referralCode || User.generateReferralCode(id || email || name);
    this.referredBy = referredBy || '';

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
   * Menghasilkan kode referral deterministik unik berformat PK-XXXXXX
   * @param {string} identifier
   * @returns {string}
   */
  static generateReferralCode(identifier) {
    if (!identifier) return 'PK-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const str = String(identifier).trim().toLowerCase();
    let h1 = 0x811c9dc5;
    let h2 = 5381;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 0x01000193);
      h2 = ((h2 << 5) + h2) ^ c;
    }
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    let n1 = Math.abs(h1);
    let n2 = Math.abs(h2);
    for (let i = 0; i < 3; i++) {
      code += chars[n1 % chars.length];
      n1 = Math.floor(n1 / chars.length);
    }
    for (let i = 0; i < 3; i++) {
      code += chars[n2 % chars.length];
      n2 = Math.floor(n2 / chars.length);
    }
    return `PK-${code}`;
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
      nicknameUpdatedAt: this.nicknameUpdatedAt,
      referralCode: this.referralCode,
      referredBy: this.referredBy
    };
  }
}
