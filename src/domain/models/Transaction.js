/**
 * Model Transaction
 * Prinsip: Single Responsibility Principle (SRP)
 * Entitas domain untuk merepresentasikan mutasi saldo (setoran API Key maupun penarikan dana).
 */
export class Transaction {
  /**
   * @param {Object} params
   * @param {string} params.id
   * @param {string} params.userId
   * @param {'deposit'|'withdrawal'} params.type
   * @param {number} params.amount
   * @param {string} params.title
   * @param {string} [params.description]
   * @param {'success'|'pending'|'failed'} [params.status]
   * @param {string} [params.method]
   * @param {string} [params.recipient]
   * @param {number} [params.fee]
   * @param {string} [params.createdAt]
   */
  constructor({
    id,
    userId,
    type,
    amount,
    title,
    description = '',
    status = 'success',
    method = '',
    recipient = '',
    fee = 0,
    createdAt = new Date().toISOString()
  }) {
    this.id = id;
    this.userId = userId;
    this.type = type;
    this.amount = amount;
    this.title = title;
    this.description = description;
    this.status = status;
    this.method = method;
    this.recipient = recipient;
    this.fee = fee;
    this.createdAt = createdAt;
  }

  /**
   * Mengembalikan format Rupiah (misal +Rp 3.000 atau -Rp 50.000)
   * @returns {string}
   */
  getFormattedAmount() {
    const sign = this.type === 'deposit' ? '+' : '-';
    return `${sign}Rp ${this.amount.toLocaleString('id-ID')}`;
  }

  /**
   * Serialisasi ke object JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      type: this.type,
      amount: this.amount,
      title: this.title,
      description: this.description,
      status: this.status,
      method: this.method,
      recipient: this.recipient,
      fee: this.fee,
      createdAt: this.createdAt
    };
  }
}
