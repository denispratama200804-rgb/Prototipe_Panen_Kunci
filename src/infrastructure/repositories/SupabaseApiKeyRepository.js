import { IApiKeyRepository } from '../../core/interfaces/IApiKeyRepository.js';
import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient.js';
import { ApiKey } from '../../domain/models/ApiKey.js';

/**
 * SupabaseApiKeyRepository
 * Prinsip: Single Responsibility Principle (SRP) & Liskov Substitution Principle (LSP)
 *
 * Mengimplementasikan IApiKeyRepository untuk operasi data tabel `api_keys` di Supabase.
 */
export class SupabaseApiKeyRepository extends IApiKeyRepository {
  constructor() {
    super();
    this.tableName = 'api_keys';
  }

  /**
   * Mengambil semua API Key, opsional filter by userId
   * @param {string} [userId]
   * @returns {Promise<ApiKey[]>}
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
      console.error('[SupabaseApiKeyRepository] getAll error:', error.message);
      throw new Error(error.message);
    }

    return (data || []).map(this._toDomain);
  }

  /**
   * Mengecek apakah keyString sudah pernah disetorkan sebelumnya
   * @param {string} keyString
   * @returns {Promise<ApiKey|null>}
   */
  async getByKeyString(keyString) {
    if (!isSupabaseConfigured() || !keyString) return null;

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('key_string', keyString)
      .maybeSingle();

    if (error) {
      console.error('[SupabaseApiKeyRepository] getByKeyString error:', error.message);
      throw new Error(error.message);
    }

    return data ? this._toDomain(data) : null;
  }

  /**
   * Menyimpan API Key baru ke database
   * @param {Object} apiKey
   * @returns {Promise<ApiKey>}
   */
  async create(apiKey) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasikan di .env');
    }

    const payload = {
      user_id: apiKey.userId,
      key_string: apiKey.keyString,
      status: apiKey.status || 'valid',
      reward_amount: apiKey.rewardAmount ?? 3000,
      credits: apiKey.credits ?? 80,
      error_message: apiKey.errorMessage || ''
    };

    if (apiKey.id && apiKey.id.includes('-')) {
      payload.id = apiKey.id;
    }

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[SupabaseApiKeyRepository] create error:', error.message);
      throw new Error(error.message);
    }

    return this._toDomain(data);
  }

  /**
   * Memetakan baris database snake_case ke domain model ApiKey
   * @param {Object} row
   * @returns {ApiKey}
   * @private
   */
  _toDomain(row) {
    return new ApiKey({
      id: row.id,
      userId: row.user_id,
      keyString: row.key_string,
      status: row.status,
      rewardAmount: Number(row.reward_amount),
      credits: Number(row.credits),
      errorMessage: row.error_message || '',
      createdAt: row.created_at
    });
  }
}
