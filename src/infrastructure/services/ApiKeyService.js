import { ApiKey } from '../../domain/models/ApiKey.js';
import { AppEvents } from '../../core/events/EventBus.js';
import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient.js';

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
    this._realtimeChannel = null;

    this._loadKeys();

    // Listen auth state changed: saat user login/register/logout, reset dan muat ulang key milik user tersebut
    this._eventBus.on(AppEvents.AUTH_STATE_CHANGED, () => {
      this._loadKeys();
      this._syncFromRemote();
      this._setupRealtimeSubscription();
    });

    if (typeof window !== 'undefined') {
      // 1. Sinkronisasi Antar-Tab via BroadcastChannel instan (0ms latency)
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          this._broadcastChannel = new BroadcastChannel('panenkunci_sync');
          this._broadcastChannel.onmessage = async (event) => {
            const data = event.data;
            if (data && (data.type === 'KEY_APPROVED' || data.type === 'KEY_REJECTED' || data.type === 'KEY_STATUS_UPDATED' || data.type === 'KEY_DELETED')) {
              await this._syncFromRemote();
              if (data.type === 'KEY_APPROVED') {
                this._eventBus.emit(AppEvents.SHOW_TOAST, {
                  message: `🎉 Setoran API Key telah disetujui Admin! Saldo Rp ${(data.rewardAmount || 3000).toLocaleString('id-ID')} dicairkan ke Saldo Aktif.`,
                  type: 'success',
                  duration: 4500
                });
              } else if (data.type === 'KEY_REJECTED') {
                this._eventBus.emit(AppEvents.SHOW_TOAST, {
                  message: `⚠️ Setoran API Key ditolak: ${data.reason || 'Ditolak oleh Admin'}.`,
                  type: 'warning',
                  duration: 4500
                });
              }
            }
          };
        } catch (e) {
          console.warn('[ApiKeyService] BroadcastChannel not supported:', e.message);
        }
      }

      // 2. Cross-tab fallback via storage event
      window.addEventListener('storage', (e) => {
        if (e.key && (e.key.includes('api_keys') || e.key.includes('wallet_balance'))) {
          this._loadKeys();
          this._syncFromRemote();
          this._eventBus.emit(AppEvents.BALANCE_UPDATED, {});
        }
      });

      // 3. Tab Visibility & Focus listener: otomatis re-sync seketika user membuka/beralih kembali ke web
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this._syncFromRemote();
        }
      });
      window.addEventListener('focus', () => {
        this._syncFromRemote();
      });

      // 4. Background Polling berkala setiap 3,5 detik saat tab aktif (failover jika websocket terputus)
      this._pollTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          const userId = this._getUserId();
          if (userId) {
            this._syncFromRemote();
          }
        }
      }, 3500);

      // 5. Supabase Realtime Subscription (Sinkronisasi Lintas Perangkat: Laptop <-> HP)
      this._setupRealtimeSubscription();
    }
  }

  /**
   * Menghubungkan Supabase Realtime channel untuk memantau perubahan status api_keys secara langsung
   */
  _setupRealtimeSubscription() {
    if (!isSupabaseConfigured() || !supabase) return;

    try {
      if (this._realtimeChannel) {
        supabase.removeChannel(this._realtimeChannel);
        this._realtimeChannel = null;
      }

      const userId = this._getUserId();
      this._realtimeChannel = supabase
        .channel(`client_keys_${userId || 'public'}_${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'api_keys' },
          (payload) => {
            const currentUserId = this._getUserId();
            const isTargetUser = !payload.new?.user_id || payload.new?.user_id === currentUserId || payload.old?.user_id === currentUserId;
            if (isTargetUser) {
              const oldStatus = payload.old?.status;
              const newStatus = payload.new?.status;

              this._syncFromRemote();

              if (payload.eventType === 'UPDATE' && oldStatus === 'pending' && newStatus === 'valid') {
                this._eventBus.emit(AppEvents.SHOW_TOAST, {
                  message: '🎉 Setoran API Key telah disetujui Admin! Saldo aktif Anda telah bertambah Rp 3.000.',
                  type: 'success',
                  duration: 5000
                });
              } else if (payload.eventType === 'UPDATE' && oldStatus === 'pending' && newStatus === 'invalid') {
                this._eventBus.emit(AppEvents.SHOW_TOAST, {
                  message: `⚠️ Setoran API Key ditolak oleh Admin: ${payload.new?.error_message || 'Tidak valid'}`,
                  type: 'warning',
                  duration: 5000
                });
              }
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[ApiKeyService] Realtime subscription init warning:', e.message);
    }
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
    const globalKeys = (this._storage.get('api_keys') || []).filter(k => k.userId === userId);

    let baseList = [];
    if (saved && Array.isArray(saved) && saved.length > 0) {
      baseList = saved;
    } else if (globalKeys.length > 0) {
      baseList = globalKeys;
    }

    // Gabungkan dan perbarui status jika ada key yang sudah diverifikasi di global list
    const keyMap = new Map();
    baseList.forEach(k => {
      const id = k.id || k.keyString;
      keyMap.set(id, k);
    });

    globalKeys.forEach(gk => {
      const id = gk.id || gk.keyString;
      if (keyMap.has(id)) {
        const existing = keyMap.get(id);
        // Jika global list sudah valid, adopsi status valid
        if (gk.status === 'valid' && existing.status !== 'valid') {
          existing.status = 'valid';
          delete existing.errorMessage;
        }
      } else {
        keyMap.set(id, gk);
      }
    });

    this._keys = Array.from(keyMap.values()).map(k => new ApiKey(k));

    // Sync dari remote Supabase jika repositori tersedia
    this._syncFromRemote();
  }

  async _syncFromRemote() {
    const userId = this._getUserId();
    if (!this._apiKeyRepository || !userId) return;

    try {
      // Filter key HANYA untuk pengguna yang sedang aktif
      const remoteKeys = await this._apiKeyRepository.getAll(userId);
      if (remoteKeys && Array.isArray(remoteKeys)) {
        this._keys = remoteKeys;
        this._persist();
        if (remoteKeys.length === 0) {
          const globalKeys = (this._storage.get('api_keys') || []).filter(k => k.userId !== userId);
          this._storage.set('api_keys', globalKeys);
        }
        this._eventBus.emit(AppEvents.BALANCE_UPDATED, {});
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

    // Sinkronkan ke daftar global api_keys
    const currentGlobal = this._storage.get('api_keys') || [];
    const otherUsersKeys = currentGlobal.filter(k => k.userId !== userId);
    const updatedGlobal = [...otherUsersKeys, ...this._keys.map(k => k.toJSON())];
    this._storage.set('api_keys', updatedGlobal);
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

    // Simpan ke database Supabase terlebih dahulu sebelum kredit saldo
    if (this._apiKeyRepository) {
      try {
        const saved = await this._apiKeyRepository.create(newApiKey);
        if (saved && saved.id) {
          newApiKey.id = saved.id;
        }
      } catch (err) {
        console.error('[ApiKeyService] Gagal menyimpan API Key ke database:', err.message);
        const isDuplicate = err.message && (
          err.message.includes('duplicate') ||
          err.message.includes('unique') ||
          err.message.includes('api_keys_key_string_key')
        );

        return {
          success: false,
          message: isDuplicate
            ? 'API Key ini sudah pernah disetorkan ke sistem dan tidak dapat digunakan kembali.'
            : (err.message || 'Gagal menyimpan API Key ke server. Silakan coba beberapa saat lagi.')
        };
      }
    }

    this._keys.unshift(newApiKey);
    this._persist();

    // 5. Kreditkan saldo ke dompet pengguna sebagai Saldo Pasif HANYA setelah key terbukti valid dan tersimpan
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
