import { ApiKey } from '../../domain/models/ApiKey.js';
import { AppEvents } from '../../core/events/EventBus.js';

/**
 * ApiKeyService
 * Prinsip: Single Responsibility Principle (SRP) & Dependency Inversion Principle (DIP)
 *
 * Mengelola setoran API Key, validasi format, pencegahan duplikasi, dan integrasi persistensi via IApiKeyRepository.
 */
export class ApiKeyService {
  /**
   * @param {import('../../core/interfaces/IStorage.js').IStorage} storage
   * @param {import('../../domain/validators/ApiKeyValidator.js').ApiKeyValidator} validator
   * @param {import('./WalletService.js').WalletService} walletService
   * @param {import('../../core/events/EventBus.js').EventBus} eventBus
   * @param {import('../../core/interfaces/IApiKeyRepository.js').IApiKeyRepository} [apiKeyRepository]
   */
  constructor(storage, validator, walletService, eventBus, apiKeyRepository = null) {
    this._storage = storage;
    this._validator = validator;
    this._walletService = walletService;
    this._eventBus = eventBus;
    this._apiKeyRepository = apiKeyRepository;
    this._keys = [];

    this._loadKeys();

    // Listen auth state changed: saat user login/register/logout, reset dan muat ulang key milik user tersebut
    this._eventBus.on(AppEvents.AUTH_STATE_CHANGED, () => {
      this._loadKeys();
      this._syncFromRemote();
    });
  }

  /**
   * Mengambil ID pengguna yang sedang aktif
   * @returns {string|null}
   * @private
   */
  _getUserId() {
    const user = this._storage.get('current_user');
    return user?.id || null;
  }

  _loadKeys() {
    const userId = this._getUserId();

    if (!userId) {
      this._keys = [];
      return;
    }

    const keysKey = `api_keys_${userId}`;
    const saved = this._storage.get(keysKey);

    if (saved && Array.isArray(saved)) {
      this._keys = saved
        .filter(k => k.userId === userId || !k.userId)
        .map(k => new ApiKey(k));
    } else {
      // Akun baru default 0 key (bersih tanpa dummy)
      this._keys = [];
    }

    // Sync dari remote Supabase jika repositori tersedia
    this._syncFromRemote();
  }

  async _syncFromRemote() {
    const userId = this._getUserId();
    if (!this._apiKeyRepository || !userId) return;

    try {
      // Filter key HANYA untuk pengguna yang sedang aktif
      const remoteKeys = await this._apiKeyRepository.getAll(userId);
      if (remoteKeys) {
        this._keys = remoteKeys;
        this._persist();
      }
    } catch (err) {
      console.warn('[ApiKeyService] Remote sync fallback to cache:', err.message);
    }
  }

  _persist() {
    const userId = this._getUserId();
    if (userId) {
      this._storage.set(`api_keys_${userId}`, this._keys.map(k => k.toJSON()));
    }
    this._storage.set('api_keys', this._keys.map(k => k.toJSON()));
  }

  /**
   * Mengambil semua daftar API key yang disetor
   * @returns {ApiKey[]}
   */
  getAllKeys() {
    return [...this._keys].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Hitung jumlah key valid yang disetor hari ini
   * @returns {number}
   */
  getTodayValidCount() {
    const today = new Date().toDateString();
    return this._keys.filter(k => k.status === 'valid' && new Date(k.createdAt).toDateString() === today).length;
  }

  /**
   * Proses setoran API Key
   * @param {string} rawKey
   * @param {string} userId
   * @returns {Promise<{ success: boolean, apiKey?: ApiKey, message: string, reward?: number }>}
   */
  async submitKey(rawKey, userId = 'usr_current') {
    const trimmed = (rawKey || '').trim();

    // 1. Validasi format/sintaks (SRP via ApiKeyValidator)
    const validation = this._validator.validate(trimmed);
    if (!validation.isValid) {
      return {
        success: false,
        message: validation.errors[0] || 'Format API Key tidak valid.'
      };
    }

    // 2. Pencegahan Duplikasi Lokal & Remote
    const isDuplicateLocal = this._keys.some(k => k.keyString.toLowerCase() === trimmed.toLowerCase());
    let isDuplicateRemote = false;

    if (!isDuplicateLocal && this._apiKeyRepository) {
      try {
        const found = await this._apiKeyRepository.getByKeyString(trimmed);
        if (found) isDuplicateRemote = true;
      } catch (err) {
        console.warn('[ApiKeyService] Remote check error:', err.message);
      }
    }

    if (isDuplicateLocal || isDuplicateRemote) {
      const invalidEntry = new ApiKey({
        id: 'key_' + Math.random().toString(36).substring(2, 9),
        keyString: trimmed,
        userId,
        status: 'invalid',
        rewardAmount: 0,
        credits: 0,
        errorMessage: 'API Key sudah pernah disetorkan sebelumnya (Duplikat ditolak).',
        createdAt: new Date().toISOString()
      });
      this._keys.unshift(invalidEntry);
      this._persist();

      return {
        success: false,
        message: 'API Key ini sudah pernah disetorkan ke sistem dan tidak dapat digunakan kembali.'
      };
    }

    // 3. Simulasi Verifikasi Ping ke Server Kie.ai (kuota kredit & keaktifan key)
    await new Promise(res => setTimeout(res, 1200));

    // Simulasi penolakan jika key mengandung keyword test penolakan
    if (trimmed.toLowerCase().includes('invalid') || trimmed.toLowerCase().includes('expired')) {
      const invalidEntry = new ApiKey({
        id: 'key_' + Math.random().toString(36).substring(2, 9),
        keyString: trimmed,
        userId,
        status: 'invalid',
        rewardAmount: 0,
        credits: 0,
        errorMessage: 'Verifikasi server Kie.ai gagal: Secret key tidak aktif atau kuota 80 kredit tidak terpenuhi.',
        createdAt: new Date().toISOString()
      });
      this._keys.unshift(invalidEntry);
      this._persist();

      if (this._apiKeyRepository) {
        this._apiKeyRepository.create(invalidEntry).catch(e => console.warn(e.message));
      }

      return {
        success: false,
        message: 'Verifikasi server Kie.ai gagal: Secret key tidak aktif atau kuota 80 kredit tidak terpenuhi.'
      };
    }

    // 4. Sukses: Kuota 80 kredit terverifikasi
    const config = this._storage.get('admin_config');
    const rewardAmount = (config && config.rewardPerKey && !isNaN(Number(config.rewardPerKey)))
      ? Number(config.rewardPerKey)
      : 3000;

    const newApiKey = new ApiKey({
      id: 'key_' + Math.random().toString(36).substring(2, 9),
      keyString: trimmed,
      userId,
      status: 'pending',
      rewardAmount,
      credits: 80,
      createdAt: new Date().toISOString()
    });

    this._keys.unshift(newApiKey);
    this._persist();

    // Simpan ke Supabase jika repositori aktif
    if (this._apiKeyRepository) {
      this._apiKeyRepository.create(newApiKey)
        .then(saved => {
          if (saved && saved.id) newApiKey.id = saved.id;
        })
        .catch(err => console.warn('[ApiKeyService] Supabase create key fallback:', err.message));
    }

    // 5. Kreditkan saldo ke dompet pengguna sebagai Saldo Pasif
    this._walletService.addPassiveDeposit(rewardAmount, newApiKey);

    // 6. Emit event
    this._eventBus.emit(AppEvents.API_KEY_SUBMITTED, { apiKey: newApiKey, reward: rewardAmount });

    return {
      success: true,
      apiKey: newApiKey,
      reward: rewardAmount,
      message: `API Key valid dan telah disetorkan ke Saldo Pasif! Menunggu verifikasi dari Admin untuk dicairkan ke Saldo Aktif.`
    };
  }
}
