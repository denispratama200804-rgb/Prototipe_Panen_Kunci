/**
 * AiKreativService
 * Layanan integrasi API Panen Kunci ke ai.kreativ
 * Endpoint: https://aikreativ.app/api/keys/receive
 * Header x-api-key: 4511d6a00b4f76cd329fa1c011f0aa5f90ddc4b086e6b0d7ceb642a4e3969230
 */

export const AI_KREATIV_DEFAULTS = {
  endpoint: 'https://aikreativ.app/api/keys/receive',
  apiKey: '4511d6a00b4f76cd329fa1c011f0aa5f90ddc4b086e6b0d7ceb642a4e3969230',
  source: 'Panen Kunci',
  enabled: true,
  autoForwardOnValid: false
};

const STORAGE_KEYS = {
  CONFIG: 'panenkunci:aikreativ_config',
  SENT_MAP: 'panenkunci:aikreativ_sent_keys'
};

export class AiKreativService {
  constructor() {
    this._sentKeysMap = this._loadSentKeysMap();
  }

  /**
   * Mengambil konfigurasi ai.kreativ dari localStorage / fallback defaults
   */
  getConfig() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (stored) {
        return { ...AI_KREATIV_DEFAULTS, ...JSON.parse(stored) };
      }
    } catch (_) {}
    return { ...AI_KREATIV_DEFAULTS };
  }

  /**
   * Menyimpan konfigurasi ai.kreativ
   */
  async saveConfig(newConfig) {
    const merged = { ...this.getConfig(), ...newConfig };
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(merged));
    } catch (_) {}

    // Coba simpan ke server/Supabase system config jika ada proxy
    try {
      if (typeof fetch !== 'undefined') {
        await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_system_config',
            data: { aikreativ_config: merged }
          })
        });
      }
    } catch (_) {}

    return merged;
  }

  /**
   * Muat peta riwayat status kunci yang telah dikirim ke ai.kreativ
   * Format: { [keyStringOrId]: { sentAt, status, credits, message, isActive } }
   */
  _loadSentKeysMap() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SENT_MAP);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {};
  }

  /**
   * Simpan peta riwayat status kunci
   */
  _saveSentKeysMap() {
    try {
      localStorage.setItem(STORAGE_KEYS.SENT_MAP, JSON.stringify(this._sentKeysMap));
    } catch (_) {}
  }

  /**
   * Mengecek status pengiriman key ke ai.kreativ
   */
  getKeyStatus(keyId, keyString) {
    if (keyId && this._sentKeysMap[keyId]) {
      return this._sentKeysMap[keyId];
    }
    if (keyString && this._sentKeysMap[keyString]) {
      return this._sentKeysMap[keyString];
    }
    return null;
  }

  /**
   * Tandai satu atau beberapa kunci berhasil dikirim
   */
  recordResults(results, keyList = []) {
    if (!Array.isArray(results)) return;
    const now = new Date().toISOString();

    results.forEach((res, idx) => {
      const matchedKeyObj = keyList[idx] || null;
      const keyId = matchedKeyObj?.id || null;
      const keyStr = matchedKeyObj?.keyString || res.key;

      const record = {
        sentAt: now,
        status: res.status, // 'added', 'updated', 'invalid'
        credits: res.credits,
        isActive: res.isActive,
        message: res.message,
        keyMask: res.key
      };

      if (keyId) this._sentKeysMap[keyId] = record;
      if (keyStr) this._sentKeysMap[keyStr] = record;
    });

    this._saveSentKeysMap();
  }

  /**
   * Uji koneksi ke endpoint ai.kreativ
   */
  async testConnection(customEndpoint = null, customApiKey = null) {
    const config = this.getConfig();
    const endpoint = customEndpoint || config.endpoint;
    const apiKey = customApiKey || config.apiKey;

    try {
      const res = await fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_aikreativ_connection',
          endpoint,
          apiKey
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          success: false,
          error: errJson.error || `HTTP ${res.status} dari server proxy`,
          statusCode: res.status
        };
      }

      const json = await res.json();
      return json;
    } catch (netErr) {
      return {
        success: false,
        error: `Koneksi gagal: ${netErr.message}`
      };
    }
  }

  /**
   * Kirim 1 API Key tunggal ke ai.kreativ
   */
  async sendSingleKey(keyObj) {
    const keyString = typeof keyObj === 'string' ? keyObj : keyObj.keyString;
    const keyId = typeof keyObj === 'object' ? keyObj.id : null;

    return this.sendBatchKeys([{ id: keyId, keyString }]);
  }

  /**
   * Kirim sekumpulan API Key ke ai.kreativ (batch)
   * @param {Array<{ id?: string, keyString: string }>} keysList
   */
  async sendBatchKeys(keysList = []) {
    if (!Array.isArray(keysList) || keysList.length === 0) {
      return {
        success: false,
        error: 'Tidak ada API Key yang dipilih untuk dikirim.'
      };
    }

    const config = this.getConfig();
    const validKeyStrings = keysList
      .map(k => (typeof k === 'string' ? k.trim() : k.keyString?.trim()))
      .filter(Boolean);

    if (validKeyStrings.length === 0) {
      return {
        success: false,
        error: 'Daftar API Key kosong atau tidak valid.'
      };
    }

    const payload = {
      action: 'send_to_aikreativ',
      keys: validKeyStrings,
      source: config.source || 'Panen Kunci',
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      keyIds: keysList.map(k => (typeof k === 'object' ? k.id : null)).filter(Boolean)
    };

    try {
      const res = await fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json) {
        return {
          success: false,
          error: json?.error || json?.message || `Server merespon dengan status ${res.status}`,
          raw: json
        };
      }

      // Catat hasil pengiriman ke memori & localStorage
      if (json.results && Array.isArray(json.results)) {
        this.recordResults(json.results, keysList);
      }

      return json;
    } catch (err) {
      return {
        success: false,
        error: `Gagal mengirim ke ai.kreativ: ${err.message}`
      };
    }
  }
}

export const aiKreativService = new AiKreativService();
