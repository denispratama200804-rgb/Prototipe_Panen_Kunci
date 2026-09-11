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
    // 1. Coba via server proxy (menggunakan service role key untuk bypass RLS)
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_api_keys', table: 'api_keys' })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            let list = json.data;
            if (userId) list = list.filter(k => k.userId === userId || k.user_id === userId);
            return list.map(item => {
              let domainStatus = item.status;
              let errorMessage = item.errorMessage || item.error_message || '';
              if (errorMessage.startsWith('__PENDING__')) {
                domainStatus = 'pending';
                errorMessage = errorMessage.replace('__PENDING__', '');
              }
              const k = new ApiKey({
                id: item.id,
                userId: item.userId || item.user_id,
                keyString: item.keyString || item.key_string,
                status: domainStatus,
                rewardAmount: Number(item.rewardAmount ?? item.reward_amount ?? 3000),
                credits: Number(item.credits ?? 80),
                errorMessage: errorMessage,
                createdAt: item.createdAt || item.created_at
              });
              k.userName = item.userName || 'Pengguna';
              k.userEmail = item.userEmail || '-';
              return k;
            });
          }
        }
      }
    } catch (_) {}

    if (!isSupabaseConfigured()) return [];

    let query = supabase
      .from(this.tableName)
      .select('*, users:user_id(id, name, email)')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[SupabaseApiKeyRepository] getAll error:', error.message);
      throw new Error(error.message);
    }

    return (data || []).map(this._toDomain.bind(this));
  }

  /**
   * Mengecek apakah keyString sudah pernah disetorkan sebelumnya (Global Check bypass RLS)
   * @param {string} keyString
   * @returns {Promise<ApiKey|null>}
   */
  async getByKeyString(keyString) {
    if (!keyString) return null;

    // 1. Coba via proxy untuk memeriksa keunikan lintas seluruh pengguna (bypass RLS)
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check_key_exists', keyString })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.exists && json.key) {
            return this._toDomain(json.key);
          } else if (json.success && !json.exists) {
            return null;
          }
        }
      }
    } catch (e) {
      console.warn('[SupabaseApiKeyRepository] Proxy check key warning:', e.message);
    }

    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*, users:user_id(id, name, email)')
      .eq('key_string', keyString)
      .maybeSingle();

    if (error) {
      console.error('[SupabaseApiKeyRepository] getByKeyString error:', error.message);
      throw new Error(error.message);
    }

    return data ? this._toDomain(data) : null;
  }

  /**
   * Menyimpan API Key baru ke database dengan penanganan status pending dan validasi UUID
   * @param {Object} apiKey
   * @returns {Promise<ApiKey>}
   */
  async create(apiKey) {
    // Pastikan user_id berupa UUID valid untuk memenuhi foreign key ke public.users
    let validUserId = apiKey.userId;
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
      key_string: apiKey.keyString,
      status: apiKey.status || 'valid',
      reward_amount: apiKey.rewardAmount ?? 3000,
      credits: apiKey.credits ?? 80,
      error_message: apiKey.errorMessage || ''
    };

    if (apiKey.id && apiKey.id.includes('-')) {
      payload.id = apiKey.id;
    }

    // 1. Coba via server proxy (menggunakan service role key untuk bypass RLS)
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'insert', table: 'api_keys', data: payload })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            return this._toDomain(json.data);
          }
        } else {
          const errJson = await res.json().catch(() => ({}));
          const errMsg = errJson.error || `Proxy insert failed (status ${res.status})`;
          throw new Error(errMsg);
        }
      }
    } catch (proxyErr) {
      if (proxyErr.message && (proxyErr.message.includes('duplicate') || proxyErr.message.includes('unique') || proxyErr.message.includes('violates'))) {
        throw proxyErr;
      }
      console.warn('[SupabaseApiKeyRepository] Proxy insert fallback:', proxyErr.message);
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasikan di .env');
    }

    let { data, error } = await supabase
      .from(this.tableName)
      .insert(payload)
      .select('*, users:user_id(id, name, email)')
      .single();

    // Kompatibilitas check constraint jika skema Supabase belum dimigrasi (hanya valid/invalid)
    if (error && error.message && error.message.includes('api_keys_status_check') && payload.status === 'pending') {
      payload.status = 'valid';
      payload.error_message = '__PENDING__' + (payload.error_message || '');

      const retry = await supabase
        .from(this.tableName)
        .insert(payload)
        .select('*, users:user_id(id, name, email)')
        .single();

      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('[SupabaseApiKeyRepository] create error:', error.message);
      throw new Error(error.message);
    }

    return this._toDomain(data);
  }

  /**
   * Memperbarui data API Key (misal: verifikasi admin atau penolakan)
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<ApiKey>}
   */
  async update(id, updates) {
    if (!id) return null;

    let payload = { ...updates };
    if (payload.status === 'valid' && payload.error_message && payload.error_message.includes('__PENDING__')) {
      payload.error_message = payload.error_message.replace('__PENDING__', '');
    }

    // 1. Coba via server proxy (bypass RLS)
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', table: 'api_keys', id, data: payload })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            return this._toDomain(json.data);
          }
        }
      }
    } catch (_) {}

    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from(this.tableName)
      .update(payload)
      .eq('id', id)
      .select('*, users:user_id(id, name, email)')
      .single();

    if (error) {
      console.error('[SupabaseApiKeyRepository] update error:', error.message);
      throw new Error(error.message);
    }

    return data ? this._toDomain(data) : null;
  }

  /**
   * Menghapus API Key dari Supabase
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    if (!id) return false;

    // 1. Coba via server proxy (bypass RLS)
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', table: 'api_keys', id })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) return true;
        }
      }
    } catch (_) {}

    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[SupabaseApiKeyRepository] delete error:', error.message);
      throw new Error(error.message);
    }

    return true;
  }

  /**
   * Memetakan baris database snake_case ke domain model ApiKey
   * @param {Object} row
   * @returns {ApiKey}
   * @private
   */
  _toDomain(row) {
    let domainStatus = row.status;
    let errorMessage = row.error_message || '';
    if (errorMessage.startsWith('__PENDING__')) {
      domainStatus = 'pending';
      errorMessage = errorMessage.replace('__PENDING__', '');
    }

    const apiKey = new ApiKey({
      id: row.id,
      userId: row.user_id,
      keyString: row.key_string,
      status: domainStatus,
      rewardAmount: Number(row.reward_amount),
      credits: Number(row.credits),
      errorMessage: errorMessage,
      createdAt: row.created_at
    });

    // Tempelkan informasi pengguna jika query relasi tersedia
    if (row.users) {
      apiKey.userName = row.users.name || 'Pengguna';
      apiKey.userEmail = row.users.email || '-';
    }

    return apiKey;
  }
}
