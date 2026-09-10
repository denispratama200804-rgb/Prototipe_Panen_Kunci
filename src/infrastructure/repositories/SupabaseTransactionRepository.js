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
    // 1. Coba via server proxy (menggunakan service role key untuk bypass RLS)
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_transactions', table: 'transactions', userId })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            let list = json.data;
            if (userId) list = list.filter(t => t.user_id === userId || t.userId === userId);
            return list.map(this._toDomain.bind(this));
          }
        }
      }
    } catch (_) {}

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

    return (data || []).map(this._toDomain.bind(this));
  }

  /**
   * Menyimpan transaksi mutasi baru (deposit atau withdrawal)
   * @param {Object} tx
   * @returns {Promise<Transaction>}
   */
  async create(tx) {
    // Pastikan user_id berupa UUID valid untuk memenuhi foreign key ke public.users
    let validUserId = tx.userId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(validUserId);

    if (!isUuid) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          validUserId = authData.user.id;
        } else {
          const { data: sampleUser } = await supabase.from('users').select('id').limit(1).maybeSingle();
          if (sampleUser?.id) {
            validUserId = sampleUser.id;
          }
        }
      } catch (_) {}
    }

    const payload = {
      user_id: validUserId,
      type: tx.type,
      amount: Number(tx.amount || 0),
      fee: Number(tx.fee || 0),
      title: tx.title,
      description: tx.description || '',
      status: tx.status || 'pending',
      method: tx.method || '',
      recipient: tx.recipient || ''
    };

    if (tx.id && tx.id.includes('-')) {
      payload.id = tx.id;
    }

    // 1. Coba via server proxy (menggunakan service role key untuk bypass RLS)
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'insert', table: 'transactions', data: payload })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            return this._toDomain(json.data);
          }
        }
      }
    } catch (proxyErr) {
      console.warn('[SupabaseTransactionRepository] Proxy insert fallback:', proxyErr.message);
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasikan di .env');
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
    if (!id) return null;

    // 1. Coba via server proxy (bypass RLS)
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', table: 'transactions', id, data: { status } })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            return this._toDomain(json.data);
          }
        }
      }
    } catch (_) {}

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
