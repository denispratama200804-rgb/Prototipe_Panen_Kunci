import { ITransactionRepository } from '../../core/interfaces/ITransactionRepository.js';
import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient.js';
import { Transaction } from '../../domain/models/Transaction.js';

/**
 * SupabaseTransactionRepository
 * Prinsip: Single Responsibility Principle (SRP) & Liskov Substitution Principle (LSP)
 *
 * Mengimplementasikan ITransactionRepository untuk operasi data tabel `transactions` di Supabase.
 */
export class SupabaseTransactionRepository extends ITransactionRepository {
  constructor() {
    super();
    this.tableName = 'transactions';
  }

  /**
   * Mengambil riwayat transaksi, opsional filter berdasarkan userId
   * @param {string} [userId]
   * @returns {Promise<Transaction[]>}
   */
  async getAll(userId) {
    if (!isSupabaseConfigured()) return [];

    let query = supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[SupabaseTransactionRepository] getAll error:', error.message);
      throw new Error(error.message);
    }

    return (data || []).map(this._toDomain);
  }

  /**
   * Menyimpan transaksi mutasi baru (deposit atau withdrawal)
   * @param {Object} tx
   * @returns {Promise<Transaction>}
   */
  async create(tx) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasikan di .env');
    }

    const payload = {
      user_id: tx.userId,
      type: tx.type,
      amount: tx.amount,
      fee: tx.fee || 0,
      title: tx.title,
      description: tx.description || '',
      status: tx.status || 'pending',
      method: tx.method || '',
      recipient: tx.recipient || ''
    };

    if (tx.id && tx.id.includes('-')) {
      payload.id = tx.id;
    }

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[SupabaseTransactionRepository] create error:', error.message);
      throw new Error(error.message);
    }

    return this._toDomain(data);
  }

  /**
   * Memperbarui status transaksi
   * @param {string} id
   * @param {'pending'|'success'|'failed'} status
   * @returns {Promise<Transaction>}
   */
  async updateStatus(id, status) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasikan di .env');
    }

    const { data, error } = await supabase
      .from(this.tableName)
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[SupabaseTransactionRepository] updateStatus error:', error.message);
      throw new Error(error.message);
    }

    return this._toDomain(data);
  }

  /**
   * Memetakan baris database snake_case ke domain model Transaction
   * @param {Object} row
   * @returns {Transaction}
   * @private
   */
  _toDomain(row) {
    return new Transaction({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      amount: Number(row.amount),
      fee: Number(row.fee || 0),
      title: row.title,
      description: row.description || '',
      status: row.status,
      method: row.method || '',
      recipient: row.recipient || '',
      createdAt: row.created_at
    });
  }
}
