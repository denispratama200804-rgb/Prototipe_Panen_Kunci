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
   * @param {'pending'|'valid'|'invalid'|'used'} [params.status]
   * @param {number} params.rewardAmount
   * @param {number} [params.credits]
   * @param {string} [params.createdAt]
   * @param {string} [params.holdUntil]
   * @param {string} [params.errorMessage]
   */
  constructor({
    id,
    keyString,
    userId,
    status = 'pending',
    rewardAmount = 3000,
    credits = 80,
    createdAt = new Date().toISOString(),
    holdUntil = null,
    errorMessage = ''
  }) {
    this.id = id;
    this.keyString = keyString;
    this.userId = userId;
    this.status = status;
    this.rewardAmount = rewardAmount;
    this.credits = credits;
    this.createdAt = createdAt;
    // Masa pemantauan 3 hari (72 jam) sejak dibuat
    this.holdUntil = holdUntil || new Date(new Date(this.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
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
   * Memeriksa apakah masa pemantauan 3 hari telah berakhir
   * @returns {boolean}
   */
  isHoldPeriodExpired() {
    const holdTime = new Date(this.holdUntil || new Date(this.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000).getTime();
    return Date.now() >= holdTime;
  }

  /**
   * Menghitung sisa hari / jam masa pemantauan
   * @returns {{ days: number, hours: number, isReady: boolean, text: string }}
   */
  getHoldRemaining() {
    const holdTime = new Date(this.holdUntil || new Date(this.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000).getTime();
    const diffMs = holdTime - Date.now();
    if (diffMs <= 0) {
      return { days: 0, hours: 0, isReady: true, text: 'Siap divalidasi' };
    }
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) {
      return { days, hours, isReady: false, text: `Sisa ${days} hari ${hours} jam` };
    }
    return { days: 0, hours, isReady: false, text: `Sisa ${hours} jam` };
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
      holdUntil: this.holdUntil,
      errorMessage: this.errorMessage
    };
  }
}
