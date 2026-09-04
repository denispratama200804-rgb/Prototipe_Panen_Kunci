import { IValidator } from '../../core/interfaces/IValidator.js';

/**
 * AuthValidator
 * Prinsip: Single Responsibility Principle (SRP)
 * Menangani validasi registrasi akun, login, dan kekuatan kata sandi.
 */
export class AuthValidator extends IValidator {
  /**
   * Validasi data registrasi
   * @param {Object} data
   * @param {string} data.name
   * @param {string} data.email
   * @param {string} data.password
   * @param {string} [data.confirmPassword]
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  validate(data) {
    const errors = [];

    if (!data.name || data.name.trim().length < 3) {
      errors.push('Nama lengkap harus terdiri dari minimal 3 karakter.');
    }

    if (!data.email || !this._isValidEmail(data.email)) {
      errors.push('Format alamat email tidak valid.');
    }

    if (!data.password || data.password.length < 8) {
      errors.push('Kata sandi harus terdiri dari minimal 8 karakter.');
    }

    if (data.confirmPassword !== undefined && data.password !== data.confirmPassword) {
      errors.push('Konfirmasi kata sandi tidak cocok dengan kata sandi.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Cek kekuatan kata sandi
   * @param {string} password
   * @returns {{ score: number, label: 'Lemah'|'Sedang'|'Kuat'|'Sangat Kuat' }}
   */
  checkPasswordStrength(password) {
    if (!password) return { score: 0, label: 'Lemah' };

    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score += 1;

    const labels = ['Lemah', 'Lemah', 'Sedang', 'Kuat', 'Sangat Kuat'];
    return {
      score: Math.min(score, 4),
      label: labels[score] || 'Lemah'
    };
  }

  _isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
