import { IComponent } from '../../core/interfaces/IComponent.js';

/**
 * SetorApiKeyView
 * Prinsip: Single Responsibility Principle (SRP) & Liskov Substitution Principle (LSP)
 * Halaman penyetoran API Key dari Kie.ai lengkap dengan tutorial, validasi, dan feedback modal.
 */
export class SetorApiKeyView extends IComponent {
  /**
   * @param {import('../../core/container/ServiceContainer.js').ServiceContainer} container
   */
  constructor(container) {
    super();
    this._container = container;
    this._apiKeyService = container.resolve('ApiKeyService');
    this._notification = container.resolve('NotificationService');
    this._authService = container.resolve('AuthService');
  }

  render() {
    const keys = this._apiKeyService.getAllKeys().slice(0, 5);

    return `
      <div class="flex flex-col w-full min-h-screen bg-background pb-28 pt-20">
        <div class="px-margin-mobile max-w-md mx-auto w-full flex flex-col gap-5">
          
          <!-- Mini Tutorial Steps -->
          <section class="flex flex-col gap-2.5">
            <div class="flex items-center gap-1.5 px-1">
              <span class="material-symbols-outlined text-primary text-[20px]" style="font-variation-settings: 'FILL' 1;">info</span>
              <h2 class="font-headline-md text-sm font-bold text-text-heading">Panduan Mendapatkan API Key</h2>
            </div>

            <div class="grid grid-cols-1 gap-2.5 relative">
              <!-- Step 1 -->
              <div class="bg-surface-card border border-surface-container rounded-2xl p-3.5 flex gap-3 items-center shadow-sm">
                <div class="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <div class="flex flex-col">
                  <h3 class="font-label-md text-xs font-bold text-text-heading">Buka Situs Kie.ai</h3>
                  <p class="text-[11px] text-text-body">Masuk atau daftar ke developer portal di platform Kie.ai.</p>
                </div>
              </div>

              <!-- Step 2 -->
              <div class="bg-surface-card border border-surface-container rounded-2xl p-3.5 flex gap-3 items-center shadow-sm">
                <div class="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <div class="flex flex-col">
                  <h3 class="font-label-md text-xs font-bold text-text-heading">Salin Secret API Key</h3>
                  <p class="text-[11px] text-text-body">Buka menu API Keys dan klik salin key yang memiliki 80 kredit.</p>
                </div>
              </div>

              <!-- Step 3 -->
              <div class="bg-surface-card border border-surface-container rounded-2xl p-3.5 flex gap-3 items-center shadow-sm">
                <div class="w-8 h-8 rounded-xl bg-secondary text-white flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </div>
                <div class="flex flex-col">
                  <h3 class="font-label-md text-xs font-bold text-text-heading">Tempel & Klaim Saldo</h3>
                  <p class="text-[11px] text-text-body">Paste ke kolom di bawah ini dan dapatkan Rp 3.000 seketika.</p>
                </div>
              </div>
            </div>
          </section>

          <!-- Input Section -->
          <section class="bg-surface-card rounded-3xl p-5 shadow-sm border border-surface-container flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label for="inputApiKey" class="font-label-md text-xs font-bold text-text-heading">
                Masukkan API Key Kie.ai Anda
              </label>
              
              <div class="relative flex items-center">
                <input
                  id="inputApiKey"
                  type="text"
                  placeholder="sk-kie-..."
                  class="w-full bg-surface-container-low rounded-2xl py-3.5 pl-4 pr-12 text-sm text-text-heading font-mono border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  id="btnPasteKey"
                  class="absolute right-2.5 p-2 text-outline hover:text-primary transition-colors"
                  title="Tempel dari Clipboard"
                >
                  <span class="material-symbols-outlined text-[20px]">content_paste</span>
                </button>
              </div>

              <p class="text-[11px] text-outline flex items-center gap-1 mt-0.5">
                <span class="material-symbols-outlined text-[14px]">lock</span>
                <span>API Key disimpan secara aman dan dienkripsi.</span>
              </p>
            </div>

            <!-- Quick Key Generators for Testing/Demo -->
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[10px] text-outline font-semibold uppercase">Coba Contoh:</span>
              <button type="button" class="btn-mock-key px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-[11px] font-mono text-primary border border-surface-container transition-colors" data-key="sk-kie-8f92a1bc3d4e5f6g7h8i">
                Key Valid
              </button>
              <button type="button" class="btn-mock-key px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-[11px] font-mono text-primary border border-surface-container transition-colors" data-key="sk-kie-duplicate_test_12345">
                Key Duplikat
              </button>
              <button type="button" class="btn-mock-key px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-[11px] font-mono text-primary border border-surface-container transition-colors" data-key="sk-kie-invalid_quota_00000">
                Key Invalid
              </button>
            </div>

            <!-- Submit Button & Feedback -->
            <button
              type="button"
              id="btnSubmitKey"
              class="w-full bg-primary text-on-primary rounded-full py-3.5 font-label-md text-sm font-bold shadow-md shadow-primary/25 hover:bg-primary-container transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-1"
            >
              <span>Setor API Key</span>
              <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </section>

          <!-- Key Submissions History -->
          <section class="flex flex-col gap-3">
            <div class="flex items-center justify-between px-1">
              <h2 class="font-headline-md text-base font-bold text-text-heading">Riwayat API Key</h2>
              <a href="#/riwayat" class="text-xs font-semibold text-primary hover:underline">Semua</a>
            </div>

            <div class="flex flex-col gap-2" id="keysHistoryList">
              ${keys.length === 0 ? `
                <div class="bg-surface-card rounded-2xl p-6 text-center text-outline">
                  <p class="text-xs">Belum ada API key yang disetorkan.</p>
                </div>
              ` : keys.map(k => {
                const isValid = k.status === 'valid';
                const dateStr = new Date(k.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return `
                  <div class="bg-surface-card border border-surface-container rounded-2xl p-3.5 flex items-center justify-between shadow-sm relative overflow-hidden">
                    <div class="absolute left-0 top-0 bottom-0 w-1 ${isValid ? 'bg-secondary' : 'bg-error-ruby'}"></div>
                    <div class="flex flex-col gap-0.5 pl-2">
                      <div class="font-mono text-xs font-semibold text-text-heading">${k.getMaskedKey()}</div>
                      <div class="text-[11px] text-text-body">${dateStr}</div>
                    </div>
                    <div class="flex items-center gap-2">
                      ${isValid ? `
                        <span class="text-xs font-extrabold text-secondary">+Rp ${k.rewardAmount.toLocaleString('id-ID')}</span>
                        <div class="bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                          <span class="material-symbols-outlined text-[12px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
                          <span>Valid</span>
                        </div>
                      ` : `
                        <div class="bg-error-container text-on-error-container px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                          <span class="material-symbols-outlined text-[12px]">cancel</span>
                          <span>Invalid</span>
                        </div>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </section>

        </div>
      </div>
    `;
  }

  mount(container) {
    const input = container.querySelector('#inputApiKey');
    const pasteBtn = container.querySelector('#btnPasteKey');
    const submitBtn = container.querySelector('#btnSubmitKey');
    const mockKeyBtns = container.querySelectorAll('.btn-mock-key');

    // Paste button
    pasteBtn?.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text) {
            input.value = text;
            this._notification.info('API Key berhasil ditempel dari clipboard.');
          }
        } else {
          this._notification.info('Fitur clipboard otomatis tidak didukung browser ini. Silakan paste manual (Ctrl+V).');
        }
      } catch (err) {
        this._notification.info('Gunakan Ctrl+V untuk menempel API Key.');
      }
    });

    // Mock key shortcuts
    mockKeyBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        if (key) {
          // Generate unique suffix for valid demo
          if (key.includes('8f92a1')) {
            input.value = `sk-kie-${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
          } else {
            input.value = key;
          }
        }
      });
    });

    // Submit handler
    submitBtn?.addEventListener('click', async () => {
      const rawKey = input.value.trim();
      if (!rawKey) {
        this._notification.error('Silakan masukkan API Key terlebih dahulu.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span><span>Memverifikasi server Kie.ai...</span>';

      const user = this._authService.getCurrentUser();
      const res = await this._apiKeyService.submitKey(rawKey, user ? user.id : 'usr_guest');

      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Setor API Key</span><span class="material-symbols-outlined text-[20px]">arrow_forward</span>';

      if (res.success) {
        input.value = '';

        // Tampilkan Popup Setor Berhasil (sesuai setor_api_key_success_pop_up)
        this._notification.showModal({
          title: 'Setoran Berhasil!',
          message: `API Key valid dan saldo Anda telah bertambah <strong class="text-secondary font-bold">Rp ${(res.reward || 3000).toLocaleString('id-ID')}</strong>. Kuota 80 kredit berhasil diverifikasi secara instan!`,
          type: 'success',
          confirmText: 'Selesai',
          onConfirm: () => {
            // Re-render view untuk memperbarui riwayat
            window.location.hash = '/dashboard';
          }
        });
      } else {
        // Tampilkan Popup Setor Gagal (sesuai setor_api_key_gagal_pop_up)
        this._notification.showModal({
          title: 'Setoran Ditolak',
          message: res.message || 'Verifikasi API Key gagal. Pastikan secret key valid dan kuota kredit masih aktif.',
          type: 'error',
          confirmText: 'Coba Lagi'
        });
      }
    });
  }
}
