import { IComponent } from '../../core/interfaces/IComponent.js';
import { AppEvents } from '../../core/events/EventBus.js';

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
    this._walletService = container.resolve('WalletService');
    this._notification = container.resolve('NotificationService');
    this._authService = container.resolve('AuthService');
    this._eventBus = container.resolve('EventBus');
  }

  render() {
    const user = this._authService.getCurrentUser();
    const isVerified = Boolean(user?.isVerified);
    let userReferredBy = (user?.referredBy || '').trim().toUpperCase();
    if (!userReferredBy && user && typeof localStorage !== 'undefined') {
      try {
        const bound = localStorage.getItem(`panenkunci:bound_referral_${user.id}`) ||
                      localStorage.getItem(`pk_bound_ref_${user.id}`) ||
                      (user.email ? localStorage.getItem(`pk_bound_ref_${user.email.toLowerCase()}`) : null) ||
                      localStorage.getItem('panenkunci:bound_referral');
        if (bound) userReferredBy = bound.trim().toUpperCase();
      } catch (_) {}
    }
    const isReferredUser = Boolean(userReferredBy);
    const keys = this._apiKeyService.getAllKeys().slice(0, 5);

    return `
      <div class="flex flex-col w-full min-h-screen bg-background pb-28 pt-20">
        <div class="px-margin-mobile max-w-md mx-auto w-full flex flex-col gap-5">
          
          ${!isVerified ? `
            <!-- Locked Account Banner -->
            <div class="bg-surface-card border-2 border-amber-500/40 rounded-3xl p-5 shadow-lg flex flex-col items-center text-center gap-3.5 relative overflow-hidden">
              <div class="absolute -right-8 -top-8 w-28 h-28 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
              
              <div class="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center border border-amber-500/30 shadow-inner mt-1">
                <span class="material-symbols-outlined text-[30px]" style="font-variation-settings: 'FILL' 1;">shield_lock</span>
              </div>

              <div class="flex flex-col items-center gap-1.5 w-full">
                <span class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/20">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  Akun Belum Terverifikasi
                </span>
                <h2 class="font-headline-md text-base font-bold text-text-heading mt-0.5">
                  Fitur Setor Key Terkunci
                </h2>
                <p class="font-body-md text-xs text-text-body leading-relaxed max-w-xs mx-auto">
                  Anda belum dapat menyetor API Key. Harap lengkapi rekening atau e-wallet pencairan di profil Anda untuk memverifikasi akun.
                </p>
              </div>

              <button
                type="button"
                id="btnVerifyFromSetor"
                class="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold text-xs py-3.5 px-4 rounded-xl shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span class="material-symbols-outlined text-[18px]">verified_user</span>
                <span>Verifikasi Akun Sekarang</span>
              </button>
            </div>
          ` : ''}

          <!-- Referral Benefit Card: 2 Hari vs 3 Hari -->
          <div class="rounded-2xl p-3.5 border ${isReferredUser ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-surface-card border-surface-container text-text-body'} flex items-center justify-between gap-3 shadow-sm">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl ${isReferredUser ? 'bg-primary text-white' : 'bg-surface-container text-amber-500'} flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[18px]">${isReferredUser ? 'bolt' : 'schedule'}</span>
              </div>
              <div class="flex flex-col">
                <div class="text-xs font-bold ${isReferredUser ? 'text-primary' : 'text-text-heading'} flex items-center gap-1.5">
                  <span>Pencairan Saldo: ${isReferredUser ? 'Hanya 2 Hari (48 Jam)' : '3 Hari (72 Jam)'}</span>
                  ${isReferredUser ? '<span class="text-[9px] px-1.5 py-0.5 bg-primary text-white font-extrabold rounded-md">Referral Aktif</span>' : ''}
                </div>
                <span class="text-[11px] ${isReferredUser ? 'text-primary/80' : 'text-text-body'}">
                  ${isReferredUser 
                    ? `Akun terhubung ke kode <strong>${userReferredBy}</strong>. Saldo pasif cair 1 hari lebih cepat!` 
                    : 'Tautkan kode referral teman di Profil untuk mempercepat pencairan menjadi 2 hari.'}
                </span>
              </div>
            </div>
            ${!isReferredUser ? `
              <a href="#/profil" class="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0 text-decoration-none">
                Tautkan
              </a>
            ` : ''}
          </div>

          <!-- Mini Tutorial Steps Dropdown -->
          <section class="flex flex-col">
            <!-- Dropdown Toggle Button -->
            <button
              type="button"
              id="btnToggleTutorial"
              class="w-full bg-surface-card border border-surface-container rounded-2xl p-3.5 flex items-center justify-between shadow-sm hover:bg-surface-container-low transition-all active:scale-[0.99] text-left group"
              aria-expanded="false"
              aria-controls="tutorialDropdownContent"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                  <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">menu_book</span>
                </div>
                <div class="flex flex-col">
                  <h2 class="font-headline-md text-xs font-bold text-text-heading group-hover:text-primary transition-colors">
                    Panduan Membuat API Key
                  </h2>
                  <p class="text-[11px] text-text-body">Ketuk untuk melihat 3 langkah mudah</p>
                </div>
              </div>
              <span id="tutorialChevron" class="material-symbols-outlined text-outline text-[22px] transition-transform duration-300 group-hover:text-primary">expand_more</span>
            </button>

            <!-- Dropdown Body (3 Cards) -->
            <div
              id="tutorialDropdownContent"
              class="hidden flex-col gap-2.5 pt-2.5"
            >
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
              <label for="inputApiKey" class="font-label-md text-xs font-bold text-text-heading flex items-center justify-between">
                <span>Masukkan API Key Kie.ai Anda</span>
                ${!isVerified ? '<span class="text-amber-500 text-[11px] font-semibold flex items-center gap-0.5"><span class="material-symbols-outlined text-[13px]">lock</span> Terkunci</span>' : ''}
              </label>
              
              <div class="relative flex items-center">
                <input
                  id="inputApiKey"
                  type="text"
                  placeholder="${!isVerified ? 'Terkunci - Harap verifikasi akun Anda terlebih dahulu' : 'Tempel API Key resmi Kie.ai di sini...'}"
                  ${!isVerified ? 'disabled' : ''}
                  class="w-full bg-surface-container-low rounded-2xl py-3.5 pl-4 pr-12 text-sm text-text-heading font-mono border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all ${!isVerified ? 'opacity-60 cursor-not-allowed' : ''}"
                />
                <button
                  type="button"
                  id="btnPasteKey"
                  ${!isVerified ? 'disabled' : ''}
                  class="absolute right-2.5 p-2 text-outline hover:text-primary transition-colors ${!isVerified ? 'opacity-40 cursor-not-allowed' : ''}"
                  title="Tempel dari Clipboard"
                >
                  <span class="material-symbols-outlined text-[20px]">content_paste</span>
                </button>
              </div>

              <p class="text-[11px] text-outline flex items-center gap-1 mt-0.5">
                <span class="material-symbols-outlined text-[14px]">lock</span>
                <span>${!isVerified ? 'Verifikasi akun di profil untuk membuka setoran API Key.' : 'API Key disimpan secara aman dan dienkripsi.'}</span>
              </p>
            </div>


            <!-- Submit Button & Feedback -->
            <button
              type="button"
              id="btnSubmitKey"
              class="w-full ${!isVerified ? 'bg-surface-container text-outline cursor-not-allowed border border-surface-container-high' : 'bg-primary text-on-primary shadow-md shadow-primary/25 hover:bg-primary-container active:scale-[0.98] cursor-pointer'} rounded-full py-3.5 font-label-md text-sm font-bold transition-all flex items-center justify-center gap-2 mt-1"
              ${!isVerified ? 'disabled' : ''}
            >
              <span class="material-symbols-outlined text-[20px]">${!isVerified ? 'lock' : 'arrow_forward'}</span>
              <span>${!isVerified ? 'Setor Key Terkunci (Perlu Verifikasi)' : 'Setor API Key'}</span>
            </button>
          </section>

          <!-- Key Submissions History -->
          <section class="flex flex-col gap-3">
            <div class="flex items-center justify-between px-1">
              <h2 class="font-headline-md text-base font-bold text-text-heading">Riwayat API Key</h2>
              <a href="#/riwayat" class="text-xs font-semibold text-primary hover:underline">Semua</a>
            </div>

            <div class="flex flex-col gap-2" id="keysHistoryList">
              ${this._renderKeysHistoryHtml(keys)}
            </div>
          </section>

        </div>
      </div>
    `;
  }

  /**
   * Helper HTML untuk daftar riwayat API key di halaman setor
   */
  _renderKeysHistoryHtml(keys) {
    if (!keys || keys.length === 0) {
      return `
        <div class="bg-surface-card rounded-2xl p-6 text-center text-outline">
          <p class="text-xs">Belum ada API key yang disetorkan.</p>
        </div>
      `;
    }

    return keys.map(k => {
      const isPending = k.status === 'pending';
      const isValid = k.status === 'valid';
      const borderClass = isPending ? 'bg-amber-500' : (isValid ? 'bg-secondary' : 'bg-error-ruby');
      const dateStr = new Date(k.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      let holdInfo = null;
      if (typeof k.getHoldRemaining === 'function') {
        holdInfo = k.getHoldRemaining();
      } else {
        const itemHoldDays = k.holdDurationDays || 3;
        const holdTime = new Date(k.holdUntil || (new Date(k.createdAt).getTime() + itemHoldDays * 24 * 60 * 60 * 1000)).getTime();
        const diffMs = holdTime - Date.now();
        if (diffMs <= 0) {
          holdInfo = { isReady: true, text: 'Siap validasi' };
        } else {
          const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
          const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
          const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
          let text = '';
          if (days > 0) text = `Sisa ${days}h ${hours}j`;
          else if (hours > 0) text = `Sisa ${hours}j ${minutes}m`;
          else text = `Sisa ${Math.max(1, minutes)}m`;
          holdInfo = { isReady: false, text };
        }
      }

      return `
        <div class="bg-surface-card border border-surface-container rounded-2xl p-3.5 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div class="absolute left-0 top-0 bottom-0 w-1 ${borderClass}"></div>
          <div class="flex flex-col gap-0.5 pl-2">
            <div class="flex items-center gap-1.5">
              <span class="font-mono text-xs font-semibold text-text-heading">${typeof k.getMaskedKey === 'function' ? k.getMaskedKey() : (k.keyString ? (k.keyString.length <= 12 ? k.keyString : `${k.keyString.slice(0, 9)}...${k.keyString.slice(-4)}`) : '')}</span>
              <span class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 border border-sky-500/20">${k.credits !== undefined ? k.credits : 80} cr</span>
            </div>
            <div class="text-[11px] text-text-body">${dateStr}</div>
          </div>
          <div class="flex items-center gap-2">
            ${isPending ? `
              <span class="text-xs font-extrabold text-amber-500">+Rp ${(k.rewardAmount || 3000).toLocaleString('id-ID')}</span>
              <div class="bg-amber-500/15 text-amber-600 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border border-amber-500/30">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span>${holdInfo.isReady ? '⚡ Siap Validasi' : `⏳ Pantau: ${holdInfo.text}`}</span>
              </div>
            ` : isValid ? `
              <span class="text-xs font-extrabold text-secondary">+Rp ${(k.rewardAmount || 3000).toLocaleString('id-ID')}</span>
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
    }).join('');
  }

  /**
   * Pembaruan DOM riwayat key seketika tanpa refresh manual
   */
  _updateKeysHistoryUI(container) {
    if (!container) return;
    const listEl = container.querySelector('#keysHistoryList');
    if (listEl) {
      const keys = this._apiKeyService.getAllKeys().slice(0, 5);
      listEl.innerHTML = this._renderKeysHistoryHtml(keys);
    }
  }

  mount(container) {
    // Dropdown Tutorial Toggle
    const toggleTutorialBtn = container.querySelector('#btnToggleTutorial');
    const tutorialContent = container.querySelector('#tutorialDropdownContent');
    const tutorialChevron = container.querySelector('#tutorialChevron');

    if (toggleTutorialBtn && tutorialContent && tutorialChevron) {
      toggleTutorialBtn.addEventListener('click', () => {
        const isHidden = tutorialContent.classList.contains('hidden');
        if (isHidden) {
          tutorialContent.classList.remove('hidden');
          tutorialContent.classList.add('flex');
          tutorialChevron.classList.add('rotate-180');
          toggleTutorialBtn.setAttribute('aria-expanded', 'true');
        } else {
          tutorialContent.classList.add('hidden');
          tutorialContent.classList.remove('flex');
          tutorialChevron.classList.remove('rotate-180');
          toggleTutorialBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    const input = container.querySelector('#inputApiKey');
    const pasteBtn = container.querySelector('#btnPasteKey');
    const submitBtn = container.querySelector('#btnSubmitKey');

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

    // Tombol Verifikasi Akun dari Banner Terkunci
    const verifyBtn = container.querySelector('#btnVerifyFromSetor');
    verifyBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.setItem('panenkunci:auto_open_bank', 'true');
      window.location.hash = '/profil';
    });

    // Proses eksekusi pengiriman key ke service
    const executeKeySubmission = async () => {
      const user = this._authService.getCurrentUser();
      const rawKey = input.value.trim();

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span><span>Memverifikasi API Key...</span>';

      const res = await this._apiKeyService.submitKey(rawKey, user ? user.id : 'usr_guest');

      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="material-symbols-outlined text-[20px]">arrow_forward</span><span>Setor API Key</span>';

      if (res.success) {
        input.value = '';

        // Segera perbarui daftar riwayat di bawah formulir secara reaktif seketika
        this._updateKeysHistoryUI(container);

        // Tentukan durasi masa pemantauan (2 hari jika ada referral, 3 hari standar)
        const holdDays = res.holdDays || 3;
        const holdHours = holdDays * 24;
        const refBonusBadge = res.isReferred
          ? '<br><span class="inline-flex items-center gap-1 mt-1 text-[11px] text-primary font-bold">⚡ Bonus Referral: Masa tunggu dipercepat menjadi hanya 2 hari!</span>'
          : '';

        // Tampilkan Popup Setor Berhasil Masuk ke Saldo Pasif & Masa Pemantauan
        this._notification.showModal({
          title: 'Setoran Masuk ke Saldo Pasif!',
          message: `API Key berhasil disetorkan! Reward sebesar <strong class="text-secondary font-bold">Rp ${(res.reward || 3000).toLocaleString('id-ID')}</strong> telah dimasukkan ke <strong>Saldo Pasif</strong> Anda.<br><br><div class="bg-surface-container-low p-2.5 rounded-xl text-xs text-text-body border border-surface-container">⏳ <strong>Masa Pemantauan:</strong> Key akan dipantau selama <strong>${holdDays} hari (${holdHours} jam)</strong> setiap jam 12 malam WIB dengan syarat kredit tetap 80 sebelum dicairkan ke Saldo Aktif.${refBonusBadge}</div>`,
          type: 'success',
          confirmText: 'Kembali ke Dashboard',
          onConfirm: () => {
            window.location.hash = '/dashboard';
          }
        });
      } else {
        // Tampilkan Popup Setor Gagal (sesuai setor_api_key_gagal_pop_up)
        this._notification.showModal({
          title: 'Setoran Ditolak',
          message: res.message || 'Verifikasi API Key gagal. Pastikan secret key valid dan kuota kredit masih 80.',
          type: 'error',
          confirmText: 'Coba Lagi'
        });
      }
    };

    // Submit handler
    submitBtn?.addEventListener('click', async () => {
      const user = this._authService.getCurrentUser();
      const isVerified = Boolean(user?.isVerified);

      if (!isVerified) {
        this._notification.showModal({
          title: 'Fitur Setor Key Terkunci',
          message: 'Akun Anda berstatus <strong>Belum Terverifikasi</strong>.<br><br>Untuk mencegah kendala pencairan saldo, Anda diwajibkan melengkapi rekening bank atau e-wallet pencairan di profil Anda terlebih dahulu sebelum dapat menyetor API Key.',
          type: 'warning',
          confirmText: 'Verifikasi Akun Sekarang',
          cancelText: 'Batal',
          showCancel: true,
          onConfirm: () => {
            sessionStorage.setItem('panenkunci:auto_open_bank', 'true');
            window.location.hash = '/profil';
          }
        });
        return;
      }

      const rawKey = input.value.trim();
      if (!rawKey) {
        this._notification.error('Silakan masukkan API Key terlebih dahulu.');
        return;
      }

      // Cek apakah user sudah memilih untuk tidak membaca pop up ini lagi
      const hide3DayNotice = localStorage.getItem('panenkunci:hide_3day_notice') === 'true';

      if (!hide3DayNotice) {
        const userRef = (user?.referredBy || '').trim().toUpperCase() ||
                        localStorage.getItem(`panenkunci:bound_referral_${user?.id}`) ||
                        localStorage.getItem(`pk_bound_ref_${user?.id}`) ||
                        localStorage.getItem('panenkunci:bound_referral');
        const isRef = Boolean(userRef);
        const noticeDays = isRef ? 2 : 3;
        const noticeHours = noticeDays * 24;

        // Tampilkan pop up pemberitahuan bahwa key tervalidasi dengan durasi adaptif (2 hari vs 3 hari)
        this._notification.showModal({
          title: 'Ketentuan Validasi API Key',
          message: `
            <div class="flex flex-col gap-2.5 text-left text-xs text-text-body">
              <p>Setiap API Key yang disetorkan akan melalui <strong>masa pemantauan selama ${noticeDays} hari (${noticeHours} jam)</strong> ${isRef ? '<span class="text-primary font-bold">(Keuntungan Referral Aktif ⚡)</span>' : ''} sebelum tervalidasi secara penuh.</p>
              <div class="bg-surface-container-low p-3 rounded-xl border border-surface-container flex flex-col gap-1 text-[11px]">
                <div class="flex items-center gap-1.5 font-bold text-text-heading">
                  <span class="material-symbols-outlined text-amber-500 text-[16px]">schedule</span>
                  <span>Pemeriksaan Rutin Jam 12 Malam WIB</span>
                </div>
                <p>Sistem otomatis mengecek seluruh key aktif dengan saldo <strong>80 kredit</strong> setiap jam 12 malam WIB. Jika kredit berkurang atau tidak aktif sebelum ${noticeDays} hari, key dinyatakan invalid.</p>
              </div>
              <p class="text-[11px] text-outline">Reward sebesar Rp 3.000 sementara tersimpan di <strong>Saldo Pasif</strong> dan otomatis cair ke Saldo Aktif setelah ${noticeDays} hari jika syarat terpenuhi.</p>
            </div>
          `,
          type: 'info',
          confirmText: 'Saya Mengerti & Lanjutkan',
          cancelText: 'Batal',
          showCancel: true,
          checkboxText: 'Jangan tampilkan pesan ini lagi',
          checkboxChecked: false,
          onConfirm: ({ checked }) => {
            if (checked) {
              localStorage.setItem('panenkunci:hide_3day_notice', 'true');
            }
            executeKeySubmission();
          }
        });
      } else {
        // User sudah mencentang untuk tidak membaca pop up lagi, langsung eksekusi setor
        executeKeySubmission();
      }
    });

    // Auto-update riwayat tampilan secara real-time saat diverifikasi admin atau ada key baru
    this._unsubBalance = this._eventBus.on(AppEvents.BALANCE_UPDATED, () => {
      this._updateKeysHistoryUI(container);
    });

    this._unsubKey = this._eventBus.on(AppEvents.API_KEY_SUBMITTED, () => {
      this._updateKeysHistoryUI(container);
    });
  }

  destroy() {
    if (this._unsubBalance) {
      this._unsubBalance();
      this._unsubBalance = null;
    }
    if (this._unsubKey) {
      this._unsubKey();
      this._unsubKey = null;
    }
  }
}
