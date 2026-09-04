/**
 * Interface IValidator
 * Prinsip: Single Responsibility Principle (SRP) & Interface Segregation Principle (ISP)
 * Kontrak standar untuk semua validator di layer domain.
 */
export class IValidator {
  /**
   * Memvalidasi input data
   * @param {any} input
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  validate(input) {
    throw new Error('Method validate() must be implemented');
  }
}
