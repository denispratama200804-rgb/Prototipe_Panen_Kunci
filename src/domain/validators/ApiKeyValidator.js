import { IValidator } from '../../core/interfaces/IValidator.js';

/**
 * ApiKeyValidator
 * Prinsip: Single Responsibility Principle (SRP)
 * Menangani validasi format dan integritas sintaks API Key.
 */
export class ApiKeyValidator extends IValidator {
  /**
   * @param {string} apiKey
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  validate(apiKey) {
    const errors = [];

    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      errors.push('API Key tidak boleh kosong.');
      return { isValid: false, errors };
    }

    const trimmed = apiKey.trim();

    // Cek jika mengandung spasi
    if (/\s/.test(trimmed)) {
      errors.push('API Key tidak boleh mengandung spasi.');
      return { isValid: false, errors };
    }

    // Minimal panjang string key yang wajar untuk API Key resmi Kie.ai
    if (trimmed.length < 8) {
      errors.push('Format API Key terlalu pendek. Pastikan menyalin key lengkap dari akun Kie.ai Anda.');
    }

    // Hanya izinkan karakter token yang valid (alfanumerik, tanda hubung, underscore, dll)
    if (/[<>"'`\\$]/.test(trimmed)) {
      errors.push('API Key mengandung karakter yang tidak valid.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
