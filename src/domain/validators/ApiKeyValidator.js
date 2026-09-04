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

    // Minimal panjang string key
    if (trimmed.length < 15) {
      errors.push('Format API Key terlalu pendek. Pastikan menyalin key lengkap dari Kie.ai.');
    }

    // Format prefix standar: sk-kie- atau sk- atau kie_
    const validPrefixes = ['sk-kie-', 'sk-', 'kie_', 'kie-'];
    const hasValidPrefix = validPrefixes.some(p => trimmed.startsWith(p));
    if (!hasValidPrefix && !trimmed.includes('kie')) {
      errors.push('Format API Key tidak sesuai standar Kie.ai (contoh: sk-kie-xxxxxxxxxxxx).');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
