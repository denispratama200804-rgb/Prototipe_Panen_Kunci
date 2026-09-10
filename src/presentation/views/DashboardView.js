import { IComponent } from '../../core/interfaces/IComponent.js';
import { AppEvents } from '../../core/events/EventBus.js';

/**
 * DashboardView
 * Prinsip: Single Responsibility Principle (SRP) & Liskov Substitution Principle (LSP)
 * Halaman utama (Home Dashboard) Panen Kunci.
 */
export class DashboardView extends IComponent {
  /**
   * @param {import('../../core/container/ServiceContainer.js').ServiceContainer} container
   */
  constructor(container) {
    super();
    this._container = container;
    this._walletService = container.resolve('WalletService');
    this._apiKeyService = container.resolve('ApiKeyService');
    this._authService = container.resolve('AuthService');
    this._eventBus = container.resolve('EventBus');
  }

  render() {
    const user = this._authService.getCurrentUser();
    const isVerified = Boolean(user?.isVerified);
    const balance = this._walletService.getBalance();
    const passiveBalance = this._walletService.getPassiveBalance();
    const todayKeysCount = this._apiKeyService.getTodayValidCount();
    const recentTx = this._walletService.getTransactions().slice(0, 4);

    const isDownloaded = localStorage.getItem('panenkunci:app_downloaded') === 'true'
      || (typeof window !== 'undefined' && (
        window.matchMedia?.('(display-mode: standalone)')?.matches
        || window.navigator?.standalone === true
      ));

    return `
      <div class="flex flex-col w-full min-h-screen bg-background pb-28 pt-20">
        <div class="px-margin-mobile max-w-md mx-auto w-full flex flex-col gap-5">
          
          <!-- Balance Card with Liquid Gradient -->
          <div class="bg-gradient-to-br from-primary to-primary-container text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <!-- Decorative Elements -->
            <div class="absolute -right-8 -top-8 w-36 h-36 bg-secondary/20 rounded-full blur-2xl pointer-events-none"></div>
            <div class="absolute -left-8 -bottom-8 w-32 h-32 bg-primary-fixed-dim/20 rounded-full blur-xl pointer-events-none"></div>

            <div class="relative z-10 flex justify-between items-start">
              <div class="flex flex-col">
                <span class="text-xs font-semibold text-primary-fixed-dim uppercase tracking-wider">Total Saldo Aktif</span>
                <span id="dashboard-balance" class="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 text-white">
                  Rp ${balance.toLocaleString('id-ID')}
                </span>
              </div>
              <a href="#/saldo" class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" title="Rincian Saldo">
                <span class="material-symbols-outlined text-[20px] text-white">arrow_forward</span>
              </a>
            </div>

            <div class="relative z-10 flex items-center justify-between mt-5 pt-4 border-t border-white/10 text-xs">
              <div class="flex flex-col">
                <span class="text-white/70">Saldo Pasif</span>
                <span id="dashboard-passive" class="font-bold text-secondary-fixed text-sm mt-0.5">
                  Rp ${passiveBalance.toLocaleString('id-ID')}
                </span>
              </div>
              <div class="flex flex-col items-end">
                <span class="text-white/70">Status Akun</span>
                <span class="font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <span class="w-2 h-2 rounded-full ${isVerified ? 'bg-secondary-fixed' : 'bg-warning-amber'}"></span>
                  ${isVerified ? 'Terverifikasi' : 'Belum Diverifikasi'}
                </span>
              </div>
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div class="grid grid-cols-2 gap-3">
            <a href="#/setor" class="bg-primary text-on-primary rounded-2xl p-4 flex items-center justify-center gap-2.5 shadow-md shadow-primary/20 hover:bg-primary-container transition-all active:scale-95 group">
              <span class="material-symbols-outlined text-[22px] group-hover:rotate-12 transition-transform" style="font-variation-settings: 'FILL' 1;">vpn_key</span>
              <span class="font-label-md text-sm font-bold">Setor Key</span>
            </a>
            <a href="#/tarik" class="bg-secondary text-on-secondary rounded-2xl p-4 flex items-center justify-center gap-2.5 shadow-md shadow-secondary/20 hover:opacity-95 transition-all active:scale-95 group">
              <span class="material-symbols-outlined text-[22px] group-hover:-translate-y-0.5 transition-transform" style="font-variation-settings: 'FILL' 1;">account_balance_wallet</span>
              <span class="font-label-md text-sm font-bold">Tarik Saldo</span>
            </a>
          </div>

          <!-- Today's Keys Stat Card -->
          <div class="bg-surface-card border border-surface-container rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-secondary-container flex items-center justify-center text-on-secondary-container shadow-inner">
                <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1;">verified</span>
              </div>
              <div class="flex flex-col">
                <span class="font-label-md text-sm font-bold text-text-heading">API Key Valid</span>
                <span class="text-xs text-text-body">Disetorkan hari ini</span>
              </div>
            </div>
            <span id="dashboard-valid-count" class="font-headline-md text-2xl font-extrabold text-secondary">${todayKeysCount}</span>
          </div>

          <!-- Banner Lengkapi Rekening (Tampil jika akun belum diatur rekening pencairan) -->
          ${(!user?.bankName || !user?.accountNumber) ? `
            <div class="bg-surface-card border border-warning-amber/40 rounded-3xl p-4 flex items-center justify-between gap-3 shadow-sm bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-[22px]">account_balance_wallet</span>
                </div>
                <div class="flex flex-col">
                  <span class="font-label-md text-xs font-bold text-text-heading">Atur Rekening Pencairan</span>
                  <span class="text-[11px] text-text-body">Lengkapi DANA, GoPay, atau Bank Anda untuk payout</span>
                </div>
              </div>
              <a href="#/profil" class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shrink-0 transition-colors shadow-sm flex items-center gap-1">
                <span>Atur</span>
                <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
              </a>
            </div>
          ` : ''}

          <!-- Rate Info & Keunggulan Layanan -->
          <div class="grid grid-cols-2 gap-3">
            <!-- Rate per Key -->
            <div class="bg-surface-card border border-surface-container rounded-2xl p-3.5 flex flex-col gap-1 shadow-sm">
              <div class="flex items-center gap-1.5 text-xs text-text-body">
                <span class="material-symbols-outlined text-[17px] text-primary">sell</span>
                <span class="font-medium text-[11px]">Harga Beli Kunci</span>
              </div>
              <span class="font-headline-md text-base font-extrabold text-text-heading font-mono">Rp 3.000 <span class="text-[10px] font-normal text-text-body">/ key</span></span>
              <span class="text-[10px] text-secondary font-semibold flex items-center gap-0.5">
                <span class="material-symbols-outlined text-[12px]">bolt</span>
                <span>Proses Cepat</span>
              </span>
            </div>

            <!-- Min Payout -->
            <div class="bg-surface-card border border-surface-container rounded-2xl p-3.5 flex flex-col gap-1 shadow-sm">
              <div class="flex items-center gap-1.5 text-xs text-text-body">
                <span class="material-symbols-outlined text-[17px] text-emerald-500">payments</span>
                <span class="font-medium text-[11px]">Min. Penarikan</span>
              </div>
              <span class="font-headline-md text-base font-extrabold text-text-heading font-mono">Rp 50.000</span>
              <span class="text-[10px] text-text-body flex items-center gap-0.5">
                <span class="material-symbols-outlined text-[12px] text-emerald-500">verified</span>
                <span>DANA • GoPay • Bank</span>
              </span>
            </div>
          </div>

          <!-- Panduan Cepat: 3 Langkah Mulai Menghasilkan -->
          <div class="bg-surface-card border border-surface-container rounded-3xl p-5 shadow-sm space-y-3.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span class="material-symbols-outlined text-[20px]">rocket_launch</span>
                </div>
                <div>
                  <h3 class="font-headline-md text-sm font-bold text-text-heading">3 Langkah Menghasilkan</h3>
                  <p class="text-[11px] text-text-body">Cara ubah API Key Kie.ai jadi saldo rupiah</p>
                </div>
              </div>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">Panduan</span>
            </div>

            <div class="grid grid-cols-1 gap-2.5">
              <!-- Step 1 -->
              <div class="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-lowest border border-surface-container/60">
                <div class="w-7 h-7 rounded-lg bg-primary-fixed text-on-primary-fixed font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">1</div>
                <div class="flex flex-col">
                  <span class="font-label-md text-xs font-bold text-text-heading">Dapatkan API Key di Kie.ai</span>
                  <span class="text-[11px] text-text-body leading-relaxed">Buat akun gratis di situs Kie.ai untuk meng-generate API Key valid milik Anda.</span>
                </div>
              </div>

              <!-- Step 2 -->
              <div class="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-lowest border border-surface-container/60">
                <div class="w-7 h-7 rounded-lg bg-secondary-container text-on-secondary-container font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">2</div>
                <div class="flex flex-col">
                  <span class="font-label-md text-xs font-bold text-text-heading">Setor Kunci di Menu Setor Key</span>
                  <span class="text-[11px] text-text-body leading-relaxed">Tempel API Key ke dalam aplikasi Panen Kunci untuk diverifikasi otomatis instan.</span>
                </div>
              </div>

              <!-- Step 3 -->
              <div class="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-lowest border border-surface-container/60">
                <div class="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">3</div>
                <div class="flex flex-col">
                  <span class="font-label-md text-xs font-bold text-text-heading">Tarik Saldo ke E-Wallet Favorit</span>
                  <span class="text-[11px] text-text-body leading-relaxed">Setelah kunci valid, saldo langsung bertambah dan bisa dicairkan ke DANA, GoPay, OVO, atau Bank.</span>
                </div>
              </div>
            </div>

            <a href="#/setor" class="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-primary/20">
              <span class="material-symbols-outlined text-[18px]">vpn_key</span>
              <span>Setor API Key Sekarang</span>
            </a>
          </div>

          <!-- Recent Activity Section -->
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between px-1">
              <h2 class="font-headline-md text-base font-bold text-text-heading">Aktivitas Terkini</h2>
              <a href="#/riwayat" class="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                <span>Semua</span>
                <span class="material-symbols-outlined text-[16px]">chevron_right</span>
              </a>
            </div>

            <div id="dashboard-recent-tx" class="flex flex-col gap-2">
              ${this._renderRecentTxHtml(recentTx)}
            </div>
          </div>

          <!-- Download App Button (Hanya tampil di HP & belum didownload) -->
          ${!isDownloaded ? `
            <div id="dashboard-download-container" class="pt-1 transition-all duration-300 md:hidden">
              <button type="button" id="btn-dashboard-download" class="w-full bg-surface-card border border-surface-container hover:bg-surface-container-low text-primary rounded-2xl py-3.5 px-5 flex items-center justify-center gap-2.5 shadow-sm transition-all active:scale-95 font-label-md text-sm font-bold group cursor-pointer">
                <span class="material-symbols-outlined text-[20px] group-hover:translate-y-0.5 transition-transform text-secondary">download</span>
                <span>Pasang Aplikasi Panen Kunci (PWA)</span>
              </button>
            </div>
          ` : ''}

          <!-- Pusat Bantuan & FAQ Ringkas -->
          <div class="bg-surface-card border border-surface-container rounded-3xl p-4 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px] text-text-body">help_outline</span>
                <span class="font-label-md text-xs font-bold text-text-heading">Informasi & Bantuan</span>
              </div>
              <a href="#/profil" class="text-[11px] text-primary font-semibold hover:underline">Detail</a>
            </div>
            <div class="divide-y divide-surface-container text-xs text-text-body">
              <div class="py-2 flex items-center justify-between">
                <span>Waktu proses transfer pencairan</span>
                <span class="text-[11px] font-bold text-secondary">Maks. 1x24 Jam</span>
              </div>
              <div class="py-2 flex items-center justify-between">
                <span>Biaya transfer admin e-wallet</span>
                <span class="text-[11px] font-bold text-text-heading font-mono">Rp 1.000 / tx</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  /**
   * Helper HTML untuk daftar transaksi terkini di Dashboard
   */
  _renderRecentTxHtml(recentTx) {
    if (!recentTx || recentTx.length === 0) {
      return `
        <div class="bg-surface-card border border-surface-container rounded-3xl p-6 text-center flex flex-col items-center justify-center gap-2.5 shadow-sm">
          <div class="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-outline/60">
            <span class="material-symbols-outlined text-2xl">receipt_long</span>
          </div>
          <div class="space-y-0.5">
            <p class="font-bold text-xs text-text-heading">Belum Ada Riwayat Transaksi</p>
            <p class="text-[11px] text-text-body max-w-[240px]">Setorkan API Key pertama Anda hari ini untuk mulai menghasilkan saldo rupiah.</p>
          </div>
          <a href="#/setor" class="mt-1 text-xs font-bold text-primary hover:underline flex items-center gap-1">
            <span>Setor Kunci Sekarang</span>
            <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
          </a>
        </div>
      `;
    }

    return recentTx.map(tx => {
      const isDeposit = tx.type === 'deposit';
      const dateStr = new Date(tx.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div class="bg-surface-card border border-surface-container rounded-2xl p-3.5 flex items-center justify-between shadow-sm hover:bg-surface-container-low transition-colors">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl ${isDeposit ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error-ruby'} flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">
                ${isDeposit ? 'vpn_key' : 'account_balance_wallet'}
              </span>
            </div>
            <div class="flex flex-col">
              <div class="flex items-center gap-1.5">
                <span class="font-label-md text-xs font-bold text-text-heading">${tx.title}</span>
                ${tx.status === 'pending' ? '<span class="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded font-medium border border-amber-500/20 inline-flex items-center gap-1"><span class="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>Pending</span>' : ''}
              </div>
              <span class="text-[11px] text-text-body">${dateStr}</span>
            </div>
          </div>
          <span class="font-headline-md text-xs font-bold ${isDeposit ? (tx.status === 'pending' ? 'text-amber-500' : 'text-secondary') : 'text-error-ruby'}">
            ${tx.getFormattedAmount()}
          </span>
        </div>
      `;
    }).join('');
  }

  /**
   * Pembaruan DOM reaktif seketika tanpa refresh manual
   */
  _updateDashboardUI(container) {
    if (!container) return;

    const balanceEl = container.querySelector('#dashboard-balance');
    const passiveEl = container.querySelector('#dashboard-passive');
    const validCountEl = container.querySelector('#dashboard-valid-count');
    const recentTxContainer = container.querySelector('#dashboard-recent-tx');

    if (balanceEl) {
      balanceEl.textContent = `Rp ${this._walletService.getBalance().toLocaleString('id-ID')}`;
    }
    if (passiveEl) {
      passiveEl.textContent = `Rp ${this._walletService.getPassiveBalance().toLocaleString('id-ID')}`;
    }
    if (validCountEl) {
      validCountEl.textContent = `${this._apiKeyService.getTodayValidCount()}`;
    }
    if (recentTxContainer) {
      const recentTx = this._walletService.getTransactions().slice(0, 4);
      recentTxContainer.innerHTML = this._renderRecentTxHtml(recentTx);
    }
  }

  mount(container) {
    const downloadBtn = container.querySelector('#btn-dashboard-download');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._handleInstall(downloadBtn, container);
      });
    }

    // Listener jika PWA berhasil diinstall saat berada di halaman ini
    this._onAppInstalled = () => {
      try {
        localStorage.setItem('panenkunci:app_downloaded', 'true');
      } catch (e) {}
      this._hideDownloadButton(container);
    };
    window.addEventListener('appinstalled', this._onAppInstalled);

    // Auto-update saldo & aktivitas tampilan secara real-time saat setor key atau diverifikasi admin
    this._unsubBalance = this._eventBus.on(AppEvents.BALANCE_UPDATED, () => {
      this._updateDashboardUI(container);
    });

    this._unsubKeySubmitted = this._eventBus.on(AppEvents.API_KEY_SUBMITTED, () => {
      this._updateDashboardUI(container);
    });
  }

  destroy() {
    if (this._onAppInstalled) {
      window.removeEventListener('appinstalled', this._onAppInstalled);
      this._onAppInstalled = null;
    }
    if (this._unsubBalance) {
      this._unsubBalance();
      this._unsubBalance = null;
    }
    if (this._unsubKeySubmitted) {
      this._unsubKeySubmitted();
      this._unsubKeySubmitted = null;
    }
  }

  /**
   * Menghilangkan tombol download dengan animasi halus
   */
  _hideDownloadButton(container) {
    const el = container ? container.querySelector('#dashboard-download-container') : document.getElementById('dashboard-download-container');
    if (el) {
      el.style.transition = 'all 0.4s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px) scale(0.95)';
      el.style.height = '0';
      el.style.overflow = 'hidden';
      el.style.marginTop = '0';
      el.style.marginBottom = '0';
      el.style.paddingTop = '0';
      el.style.paddingBottom = '0';
      setTimeout(() => el.remove(), 400);
    }
  }

  /**
   * Langsung trigger PWA install prompt saat tombol diklik.
   * @param {HTMLButtonElement} btn
   * @param {HTMLElement} container
   */
  async _handleInstall(btn, container) {
    const originalHTML = btn.innerHTML;

    // Loading state
    btn.disabled = true;
    btn.innerHTML = `
      <span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
      <span>Menyiapkan Instalasi...</span>
    `;

    // Cek apakah sudah terinstall sebagai PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    if (isStandalone) {
      try {
        localStorage.setItem('panenkunci:app_downloaded', 'true');
      } catch (e) {}
      this._hideDownloadButton(container);
      this._eventBus.emit(AppEvents.SHOW_TOAST, {
        message: '✅ Panen Kunci sudah terinstal di perangkat Anda!',
        type: 'success',
        duration: 3000
      });
      return;
    }

    // Native install prompt (Chrome Android / Desktop)
    if (window.deferredInstallPrompt) {
      try {
        await window.deferredInstallPrompt.prompt();
        const { outcome } = await window.deferredInstallPrompt.userChoice;
        window.deferredInstallPrompt = null;

        if (outcome === 'accepted') {
          try {
            localStorage.setItem('panenkunci:app_downloaded', 'true');
          } catch (e) {}
          btn.innerHTML = `
            <span class="material-symbols-outlined text-[20px]">check_circle</span>
            <span>Berhasil Dipasang!</span>
          `;
          this._eventBus.emit(AppEvents.SHOW_TOAST, {
            message: '🎉 Panen Kunci berhasil dipasang di perangkat Anda!',
            type: 'success',
            duration: 4000
          });
          setTimeout(() => {
            this._hideDownloadButton(container);
          }, 1200);
        } else {
          btn.disabled = false;
          btn.innerHTML = originalHTML;
        }
      } catch (err) {
        console.warn('[PWA] Install prompt error:', err);
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }
      return;
    }

    // Fallback jika tidak ada prompt native
    btn.disabled = false;
    btn.innerHTML = originalHTML;

    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome/.test(ua);
    const isAndroid = /android/.test(ua);

    if (isIOS && isSafari) {
      this._eventBus.emit(AppEvents.SHOW_MODAL, {
        title: '📲 Pasang di iPhone / iPad',
        message: `
          <div class="flex flex-col gap-3 text-left mt-2">
            <div class="flex gap-3 items-start">
              <div class="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 text-xs font-bold">1</div>
              <p class="text-sm text-on-surface-variant pt-0.5">Ketuk ikon <strong class="text-on-surface">Bagikan □↑</strong> di bawah layar Safari.</p>
            </div>
            <div class="flex gap-3 items-start">
              <div class="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 text-xs font-bold">2</div>
              <p class="text-sm text-on-surface-variant pt-0.5">Pilih <strong class="text-on-surface">"Add to Home Screen"</strong>.</p>
            </div>
            <div class="flex gap-3 items-start">
              <div class="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 text-xs font-bold">3</div>
              <p class="text-sm text-on-surface-variant pt-0.5">Ketuk <strong class="text-on-surface">Add</strong> — selesai!</p>
            </div>
          </div>`,
        type: 'info',
        confirmText: 'Sudah Pasang / Mengerti',
        onConfirm: () => {
          try {
            localStorage.setItem('panenkunci:app_downloaded', 'true');
          } catch (e) {}
          this._hideDownloadButton(container);
        }
      });
      return;
    }

    // Modal panduan pasang untuk Android / Desktop Browser
    this._eventBus.emit(AppEvents.SHOW_MODAL, {
      title: '📲 Download & Pasang Aplikasi',
      message: `
        <div class="flex flex-col gap-3 text-left mt-2 text-xs text-text-body">
          <p>Aplikasi Panen Kunci dapat dipasang langsung sebagai <strong>Aplikasi PWA</strong>:</p>
          <div class="flex gap-2.5 items-start p-2.5 rounded-xl bg-bg-subtle border border-outline-variant/30">
            <span class="material-symbols-outlined text-primary text-lg shrink-0">install_mobile</span>
            <p>Pada browser Chrome: klik menu <strong>⋮ (titik tiga)</strong> di sudut atas lalu pilih <strong>"Instal Aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.</p>
          </div>
        </div>
      `,
      type: 'info',
      confirmText: 'Tandai Sudah Download',
      onConfirm: () => {
        try {
          localStorage.setItem('panenkunci:app_downloaded', 'true');
        } catch (e) {}
        this._hideDownloadButton(container);
        this._eventBus.emit(AppEvents.SHOW_TOAST, {
          message: '✅ Aplikasi telah ditandai terpasang. Tombol download disembunyikan.',
          type: 'success',
          duration: 3500
        });
      }
    });
  }
}
