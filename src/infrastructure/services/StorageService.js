/**
 * StorageService
 * Prinsip: Single Responsibility Principle (SRP)
 * Bertanggung jawab mengunggah file media (foto profil pengguna, bukti transfer pembayaran admin)
 * ke Cloudflare R2 Storage melalui backend proxy.
 */
export class StorageService {
  /**
   * Unggah data gambar Base64 ke Cloudflare R2
   * @param {Object} params
   * @param {string} params.base64Data Data URL gambar (data:image/...;base64,...)
   * @param {'avatars'|'proofs'|'general'} [params.folder='uploads'] Subfolder target
   * @param {string} [params.fileName] Nama file spesifik opsional
   * @returns {Promise<string>} URL publik CDN resmi (https://media.panenkunci.com/...)
   */
  async uploadImage({ base64Data, folder = 'uploads', fileName = null }) {
    if (!base64Data) {
      throw new Error('Data gambar tidak boleh kosong');
    }

    // Jika sudah berupa URL publik, kembalikan langsung
    if (/^https?:\/\//i.test(base64Data.trim())) {
      return base64Data.trim();
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const response = await fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload_r2',
          base64Data,
          folder,
          fileName
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.url) {
          return result.url;
        }
      }
    } catch (err) {
      console.warn('[StorageService] R2 upload fallback to base64:', err.message);
    }

    return base64Data;
  }
}

export const storageService = new StorageService();
