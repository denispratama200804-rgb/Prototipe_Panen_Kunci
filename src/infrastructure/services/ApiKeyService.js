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
  }

  _loadKeys() {
    const saved = this._storage.get('api_keys');
    if (saved && Array.isArray(saved)) {
      this._keys = saved.map(k => new ApiKey(k));
    } else {
      // Mock data awal yang menarik dan sesuai prototipe
      this._keys = [
        new ApiKey({
          id: 'key_01',
          keyString: 'sk-kie-8f92a1bc3d4e5f6g7h8i',
          userId: 'usr_budi_01',
          status: 'valid',
          rewardAmount: 3000,
          credits: 80,
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
        }),
        new ApiKey({
          id: 'key_02',
          keyString: 'sk-kie-x7b9c2da1e4f5a6b7c8d',
          userId: 'usr_budi_01',
          status: 'invalid',
          rewardAmount: 0,
          credits: 0,
          errorMessage: 'Kuota kredit Kie.ai sudah habis / 0 kredit.',
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }),
        new ApiKey({
          id: 'key_03',
          keyString: 'sk-kie-3m5n8pq7r9s1t2u3v4w5',
          userId: 'usr_budi_01',
          status: 'valid',
          rewardAmount: 3000,
          credits: 80,
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
        })
      ];
      this._persist();
    }

    // Sync dari remote Supabase jika repositori tersedia
    this._syncFromRemote();
  }

  async _syncFromRemote() {
    if (!this._apiKeyRepository) return;
    try {
      const remoteKeys = await this._apiKeyRepository.getAll();
      if (remoteKeys && remoteKeys.length > 0) {
        // Merge unik
        const keyMap = new Map();
        remoteKeys.forEach(k => keyMap.set(k.keyString.toLowerCase(), k));
        this._keys.forEach(k => {
          if (!keyMap.has(k.keyString.toLowerCase())) {
            keyMap.set(k.keyString.toLowerCase(), k);
          }
        });
        this._keys = Array.from(keyMap.values());
        this._persist();
      }
    } catch (err) {
      console.warn('[ApiKeyService] Remote sync fallback to cache:', err.message);
    }
  }

  _persist() {
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
      status: 'valid',
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

    // 5. Kreditkan saldo ke dompet pengguna secara real-time
    this._walletService.addDeposit(rewardAmount, newApiKey);

    // 6. Emit event
    this._eventBus.emit(AppEvents.API_KEY_SUBMITTED, { apiKey: newApiKey, reward: rewardAmount });

    return {
      success: true,
      apiKey: newApiKey,
      reward: rewardAmount,
      message: `API Key valid dan saldo Anda telah bertambah Rp ${rewardAmount.toLocaleString('id-ID')}!`
    };
  }
}
