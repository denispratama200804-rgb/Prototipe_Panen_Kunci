import { IUserRepository } from '../../core/interfaces/IUserRepository.js';
import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient.js';
import { User } from '../../domain/models/User.js';

/**
 * SupabaseUserRepository
 * Prinsip: Single Responsibility Principle (SRP) & Liskov Substitution Principle (LSP)
 *
 * Mengimplementasikan IUserRepository untuk interaksi database tabel `users` di Supabase.
 * Dilengkapi fallback otomatis ke Server Proxy jika terhalang aturan Row-Level Security (RLS).
 */
export class SupabaseUserRepository extends IUserRepository {
  constructor() {
    super();
    this.tableName = 'users';
  }

  /**
   * Mengambil semua pengguna dari tabel users
   * @returns {Promise<User[]>}
   */
  async getAll() {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SupabaseUserRepository] getAll error:', error.message);
      throw new Error(error.message);
    }

    return (data || []).map(this._toDomain);
  }

  /**
   * Mengambil user berdasarkan UUID
   * @param {string} id
   * @returns {Promise<User|null>}
   */
  async getById(id) {
    if (!isSupabaseConfigured() || !id) return null;

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[SupabaseUserRepository] getById error:', error.message);
      throw new Error(error.message);
    }

    return data ? this._toDomain(data) : null;
  }

  /**
   * Mengambil user berdasarkan Email
   * @param {string} email
   * @returns {Promise<User|null>}
   */
  async getByEmail(email) {
    if (!isSupabaseConfigured() || !email) return null;

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .ilike('email', email)
      .maybeSingle();

    if (error) {
      console.error('[SupabaseUserRepository] getByEmail error:', error.message);
      throw new Error(error.message);
    }

    return data ? this._toDomain(data) : null;
  }

  /**
   * Membuat atau menyimpan user baru ke Supabase
   * @param {Object} userData
   * @returns {Promise<User>}
   */
  async create(userData) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasikan di .env');
    }

    const payload = {
      name: userData.name,
      email: userData.email,
      phone: userData.phone || '',
      bank_name: userData.bankName || '',
      account_number: userData.accountNumber || '',
      account_holder: userData.accountHolder || '',
      is_verified: userData.isVerified ?? false
    };

    if (userData.id && userData.id.includes('-')) {
      payload.id = userData.id;
    }

    // 1. Coba simpan langsung via Supabase client
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(payload)
      .select()
      .single();

    if (!error && data) {
      return this._toDomain(data);
    }

    // 2. Jika terhalang RLS (error 42501 atau violates row-level security policy), gunakan Server Proxy
    if (error && (error.code === '42501' || error.message.toLowerCase().includes('row-level security'))) {
      try {
        const proxyRes = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'insert', table: 'users', data: payload })
        });

        const proxyJson = await proxyRes.json();
        if (proxyJson.success && proxyJson.data) {
          return this._toDomain(proxyJson.data);
        }
        if (proxyJson.error) {
          throw new Error(proxyJson.error);
        }
      } catch (proxyErr) {
        console.error('[SupabaseUserRepository] Server Proxy fallback error:', proxyErr);
        throw new Error(proxyErr.message || error.message);
      }
    }

    if (error) {
      console.error('[SupabaseUserRepository] create error:', error.message);
      throw new Error(error.message);
    }

    return this._toDomain(data);
  }

  /**
   * Memperbarui data pengguna di Supabase
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<User>}
   */
  async update(id, updates) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasikan di .env');
    }

    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.bankName !== undefined) payload.bank_name = updates.bankName;
    if (updates.accountNumber !== undefined) payload.account_number = updates.accountNumber;
    if (updates.accountHolder !== undefined) payload.account_holder = updates.accountHolder;
    if (updates.isVerified !== undefined) payload.is_verified = updates.isVerified;

    // 1. Coba update langsung via Supabase client
    const { data, error } = await supabase
      .from(this.tableName)
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      return this._toDomain(data);
    }

    // 2. Jika terhalang RLS, gunakan Server Proxy
    if (error && (error.code === '42501' || error.message.toLowerCase().includes('row-level security'))) {
      try {
        const proxyRes = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', table: 'users', id, data: payload })
        });

        const proxyJson = await proxyRes.json();
        if (proxyJson.success && proxyJson.data) {
          return this._toDomain(proxyJson.data);
        }
        if (proxyJson.error) {
          throw new Error(proxyJson.error);
        }
      } catch (proxyErr) {
        console.error('[SupabaseUserRepository] Proxy update error:', proxyErr);
        throw new Error(proxyErr.message || error.message);
      }
    }

    if (error) {
      console.error('[SupabaseUserRepository] update error:', error.message);
      throw new Error(error.message);
    }

    return this._toDomain(data);
  }

  /**
   * Menghapus pengguna
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[SupabaseUserRepository] delete error:', error.message);
      throw new Error(error.message);
    }
  }

  /**
   * Memetakan kolom database snake_case ke domain model User camelCase
   * @param {Object} row
   * @returns {User}
   * @private
   */
  _toDomain(row) {
    return new User({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone || '',
      bankName: row.bank_name || '',
      accountNumber: row.account_number || '',
      accountHolder: row.account_holder || '',
      isVerified: Boolean(row.is_verified),
      createdAt: row.created_at
    });
  }
}
