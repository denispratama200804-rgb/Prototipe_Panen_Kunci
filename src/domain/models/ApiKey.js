/**
 * Model ApiKey
 * Prinsip: Single Responsibility Principle (SRP)
 * Entitas domain untuk merepresentasikan API Key yang disetorkan pengguna.
 */
export class ApiKey {
  /**
   * @param {Object} params
   * @param {string} params.id
   * @param {string} params.keyString
   * @param {string} params.userId
   * @param {'valid'|'invalid'} params.status
   * @param {number} params.rewardAmount
   * @param {number} [params.credits]
   * @param {string} [params.createdAt]
   * @param {string} [params.errorMessage]
   */
  constructor({
    id,
    keyString,
    userId,
    status = 'valid',
    rewardAmount = 3000,
    credits = 80,
    createdAt = new Date().toISOString(),
    errorMessage = ''
  }) {
    this.id = id;
    this.keyString = keyString;
    this.userId = userId;
    this.status = status;
    this.rewardAmount = rewardAmount;
    this.credits = credits;
    this.createdAt = createdAt;
    this.errorMessage = errorMessage;
  }

  /**
   * Mengembalikan key bertopeng untuk tampilan aman (masked key)
   * Contoh: sk-kie-8f92a...8b9C
   * @returns {string}
   */
  getMaskedKey() {
    if (!this.keyString) return '';
    if (this.keyString.length <= 12) return this.keyString;
    const prefix = this.keyString.slice(0, 9);
    const suffix = this.keyString.slice(-4);
    return `${prefix}...${suffix}`;
  }

  /**
   * Serialisasi ke object JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      keyString: this.keyString,
      userId: this.userId,
      status: this.status,
      rewardAmount: this.rewardAmount,
      credits: this.credits,
      createdAt: this.createdAt,
      errorMessage: this.errorMessage
    };
  }
}
