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
            <span class="font-headline-md text-2xl font-extrabold text-secondary">${todayKeysCount}</span>
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

            <div class="flex flex-col gap-2">
              ${recentTx.length === 0 ? `
                <div class="bg-surface-card rounded-2xl p-8 text-center text-outline">
                  <span class="material-symbols-outlined text-4xl mb-2 text-outline/50">inbox</span>
                  <p class="text-xs">Belum ada aktivitas transaksi.</p>
                </div>
              ` : recentTx.map(tx => {
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
                          ${tx.status === 'pending' ? '<span class="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded font-medium border border-amber-500/20">Pending</span>' : ''}
                        </div>
                        <span class="text-[11px] text-text-body">${dateStr}</span>
                      </div>
                    </div>
                    <span class="font-headline-md text-xs font-bold ${isDeposit ? (tx.status === 'pending' ? 'text-amber-500' : 'text-secondary') : 'text-error-ruby'}">
                      ${tx.getFormattedAmount()}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Download App Button -->
          <div class="pt-1">
            <button type="button" id="btn-dashboard-download" class="w-full bg-primary text-on-primary rounded-2xl py-3.5 px-5 flex items-center justify-center gap-2.5 shadow-md shadow-primary/20 hover:bg-primary-container transition-all active:scale-95 font-label-md text-sm font-bold group">
              <span class="material-symbols-outlined text-[20px] group-hover:translate-y-0.5 transition-transform">download</span>
              <span>Download Aplikasi Panen Kunci</span>
            </button>
          </div>

        </div>
      </div>
    `;
  }

  mount(container) {
    const downloadBtn = container.querySelector('#btn-dashboard-download');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._handleInstall(downloadBtn);
      });
    }

    // Auto-update saldo tampilan secara real-time saat diverifikasi admin di tab lain
    this._unsubBalance = this._eventBus.on(AppEvents.BALANCE_UPDATED, () => {
      const balanceEl = container.querySelector('#dashboard-balance');
      const passiveEl = container.querySelector('#dashboard-passive');
      if (balanceEl) balanceEl.textContent = `Rp ${this._walletService.getBalance().toLocaleString('id-ID')}`;
      if (passiveEl) passiveEl.textContent = `Rp ${this._walletService.getPassiveBalance().toLocaleString('id-ID')}`;
    });
  }

  destroy() {
    if (this._unsubBalance) {
      this._unsubBalance();
      this._unsubBalance = null;
    }
  }

  /**
   * Langsung trigger PWA install prompt saat tombol diklik.
   * @param {HTMLButtonElement} btn
   */
  async _handleInstall(btn) {
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
      btn.disabled = false;
      btn.innerHTML = originalHTML;
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
            btn.disabled = false;
            btn.innerHTML = originalHTML;
          }, 3000);
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
        title: '📲 Install di iPhone / iPad',
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
        confirmText: 'Siap!',
        onConfirm: () => { }
      });
      return;
    }

    if (isAndroid) {
      this._eventBus.emit(AppEvents.SHOW_TOAST, {
        message: '💡 Ketuk ⋮ Menu Chrome → "Tambahkan ke layar utama" untuk install.',
        type: 'info',
        duration: 5000
      });
      return;
    }

    this._eventBus.emit(AppEvents.SHOW_TOAST, {
      message: '💡 Buka halaman ini di Chrome Android atau klik ikon install di address bar.',
      type: 'info',
      duration: 5000
    });
  }
}
