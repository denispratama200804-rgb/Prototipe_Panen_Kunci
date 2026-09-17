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
    this._notificationService = container.resolve('NotificationService');
    this._eventBus = container.resolve('EventBus');
  }

  render() {
    const user = this._authService.getCurrentUser();
    const isVerified = Boolean(user?.isVerified);
    const balance = this._walletService.getBalance();
    const passiveBalance = this._walletService.getPassiveBalance();
    const todayKeysCount = this._apiKeyService.getTodayValidCount();
    const recentTx = this._getCombinedRecentActivities().slice(0, 5);

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
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-semibold text-primary-fixed-dim uppercase tracking-wider">Total Saldo Aktif</span>
                  <button
                    type="button"
                    class="btn-dashboard-tooltip inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/10 hover:bg-white/25 active:scale-95 text-white/80 hover:text-white transition-all cursor-pointer"
                    data-tooltip="saldo-aktif"
                    title="Klik untuk melihat penjelasan Saldo Aktif"
                    aria-label="Penjelasan Saldo Aktif"
                  >
                    <span class="material-symbols-outlined text-[13px]">info</span>
                  </button>
                </div>
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
                <div class="flex items-center gap-1.5">
                  <span class="text-white/70">Saldo Pasif</span>
                  <button
                    type="button"
                    class="btn-dashboard-tooltip inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white/10 hover:bg-white/25 active:scale-95 text-white/80 hover:text-white transition-all cursor-pointer"
                    data-tooltip="saldo-pasif"
                    title="Klik untuk melihat penjelasan Saldo Pasif"
                    aria-label="Penjelasan Saldo Pasif"
                  >
                    <span class="material-symbols-outlined text-[12px]">info</span>
                  </button>
                </div>
                <span id="dashboard-passive" class="font-bold text-secondary-fixed text-sm mt-0.5">
                  Rp ${passiveBalance.toLocaleString('id-ID')}
                </span>
              </div>
              <div class="flex flex-col items-end">
                <div class="flex items-center gap-1">
                  <span class="text-white/70">Status Akun</span>
                  ${!isVerified ? `
                    <button
                      type="button"
                      class="btn-dashboard-tooltip inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-warning-amber/25 text-amber-300 hover:bg-warning-amber/40 transition-all cursor-pointer animate-pulse"
                      data-tooltip="status-akun"
                      title="Klik untuk melihat cara verifikasi akun"
                      aria-label="Cara Verifikasi Akun"
                    >
                      <span class="material-symbols-outlined text-[12px]">help</span>
                    </button>
                  ` : ''}
                </div>
                <div class="mt-0.5">
                  ${!isVerified ? `
                    <button
                      type="button"
                      class="btn-dashboard-tooltip font-bold text-white flex items-center gap-1.5 cursor-pointer hover:text-amber-200 transition-colors text-right"
                      data-tooltip="status-akun"
                      title="Klik untuk melihat cara verifikasi akun"
                    >
                      <span class="w-2 h-2 rounded-full bg-warning-amber animate-pulse"></span>
                      <span>Belum Terverifikasi</span>
                      <span class="material-symbols-outlined text-[14px] text-amber-300">help</span>
                    </button>
                  ` : `
                    <span class="font-bold text-white flex items-center gap-1.5" title="Akun telah terverifikasi resmi">
                      <span class="w-2 h-2 rounded-full bg-secondary-fixed"></span>
                      <span>Terverifikasi</span>
                      <span class="material-symbols-outlined text-[15px] text-secondary-fixed" style="font-variation-settings: 'FILL' 1;">verified</span>
                    </span>
                  `}
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div class="grid grid-cols-2 gap-3">
            ${!isVerified ? `
              <button
                type="button"
                id="btnDashboardSetorLocked"
                class="bg-primary/80 text-on-primary rounded-2xl p-4 flex items-center justify-center gap-2.5 shadow-md shadow-primary/10 transition-all active:scale-95 group relative cursor-pointer"
                title="Fitur Setor Key Terkunci - Akun Belum Terverifikasi"
              >
                <div class="absolute -top-2 -right-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[10px] flex items-center gap-0.5 shadow border border-amber-300">
                  <span class="material-symbols-outlined text-[12px]">lock</span>
                  <span>Terkunci</span>
                </div>
                <span class="material-symbols-outlined text-[22px] text-amber-300" style="font-variation-settings: 'FILL' 1;">lock</span>
                <span class="font-label-md text-sm font-bold">Setor Key</span>
              </button>
            ` : `
              <a href="#/setor" class="bg-primary text-on-primary rounded-2xl p-4 flex items-center justify-center gap-2.5 shadow-md shadow-primary/20 hover:bg-primary-container transition-all active:scale-95 group">
                <span class="material-symbols-outlined text-[22px] group-hover:rotate-12 transition-transform" style="font-variation-settings: 'FILL' 1;">vpn_key</span>
                <span class="font-label-md text-sm font-bold">Setor Key</span>
              </a>
            `}
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
              <button type="button" id="btn-dashboard-download" class="w-full bg-primary text-on-primary rounded-2xl py-3.5 px-5 flex items-center justify-center gap-2.5 shadow-md shadow-primary/20 hover:bg-primary-container transition-all active:scale-95 font-label-md text-sm font-bold group cursor-pointer">
                <span class="material-symbols-outlined text-[20px] group-hover:translate-y-0.5 transition-transform">download</span>
                <span>Download Aplikasi Panen Kunci</span>
              </button>
            </div>
          ` : ''}

        </div>
      </div>
    `;
  }

  /**
   * Menggabungkan seluruh data riwayat (Setoran API Key valid/pending/invalid & Penarikan Saldo)
   * secara kronologis agar semua aktivitas riwayat tampil di Aktivitas Terkini Dashboard.
   */
  _getCombinedRecentActivities() {
    const keys = this._apiKeyService?.getAllKeys() || [];
    const withdrawals = this._walletService?.getWithdrawals() || [];

    const keyActivities = keys.map(k => {
      const isPending = k.status === 'pending';
      const isValid = k.status === 'valid';
      const isInvalid = !isPending && !isValid;
      const masked = typeof k.getMaskedKey === 'function' ? k.getMaskedKey() : (k.keyString || 'API Key');

      return {
        id: k.id || `key_${k.keyString}`,
        type: 'deposit',
        status: isPending ? 'pending' : (isValid ? 'valid' : 'invalid'),
        title: isValid ? 'Setoran API Key (Terverifikasi)' : (isPending ? 'Setoran API Key' : 'Setoran API Key'),
        maskedKey: masked,
        amount: (isValid || isPending) ? (Number(k.rewardAmount) || 3000) : 0,
        createdAt: k.createdAt || new Date().toISOString(),
        errorMessage: k.errorMessage || ''
      };
    });

    const withdrawalActivities = withdrawals.map(w => {
      const isPending = w.status === 'pending';
      const isFailed = w.status === 'failed';
      const isSuccess = !isPending && !isFailed;

      return {
        id: w.id,
        type: 'withdrawal',
        status: isPending ? 'pending' : (isFailed ? 'failed' : 'success'),
        title: w.title || 'Penarikan Saldo',
        maskedKey: w.description || '',
        amount: Number(w.amount) || 0,
        createdAt: w.createdAt || new Date().toISOString(),
        errorMessage: ''
      };
    });

    const combined = [...keyActivities, ...withdrawalActivities];
    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return combined;
  }

  /**
   * Helper HTML untuk daftar transaksi terkini di Dashboard
   */
  _renderRecentTxHtml(recentActivities) {
    if (!recentActivities || recentActivities.length === 0) {
      return `
        <div class="bg-surface-card rounded-2xl p-8 text-center text-outline">
          <span class="material-symbols-outlined text-4xl mb-2 text-outline/50">inbox</span>
          <p class="text-xs">Belum ada aktivitas transaksi.</p>
        </div>
      `;
    }

    return recentActivities.map(tx => {
      const isDeposit = tx.type === 'deposit';
      const isPending = tx.status === 'pending';
      const isInvalid = tx.status === 'invalid';
      const isFailed = tx.status === 'failed';
      const isValidOrSuccess = tx.status === 'valid' || tx.status === 'success';

      const dateStr = new Date(tx.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      const isReferralCommission = tx.method === 'referral_commission' || tx.title?.includes('Referral') || tx.description?.includes('Referral');

      let statusBadge = '';
      if (isPending) {
        statusBadge = '<span class="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded font-bold border border-amber-500/20 inline-flex items-center gap-1"><span class="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>Pending</span>';
      } else if (isInvalid) {
        statusBadge = '<span class="text-[10px] px-1.5 py-0.5 bg-error-container text-on-error-container rounded font-bold inline-flex items-center gap-0.5">Invalid</span>';
      } else if (isFailed) {
        statusBadge = '<span class="text-[10px] px-1.5 py-0.5 bg-error-container text-on-error-container rounded font-bold inline-flex items-center gap-0.5">Ditolak</span>';
      } else if (isValidOrSuccess && isDeposit && isReferralCommission) {
        statusBadge = '<span class="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded font-bold border border-emerald-500/20 inline-flex items-center gap-0.5">Komisi Ref</span>';
      } else if (isValidOrSuccess && isDeposit) {
        statusBadge = '<span class="text-[10px] px-1.5 py-0.5 bg-secondary-container text-on-secondary-container rounded font-bold inline-flex items-center gap-0.5">Valid</span>';
      }

      const iconBg = isReferralCommission
        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
        : (isDeposit
          ? (isInvalid ? 'bg-error-container text-error-ruby' : (isPending ? 'bg-amber-500/10 text-amber-600' : 'bg-secondary/10 text-secondary'))
          : (isFailed ? 'bg-error-container text-error-ruby' : (isPending ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary')));

      const iconName = isReferralCommission
        ? 'group_add'
        : (isDeposit
          ? (isInvalid ? 'vpn_key_off' : 'vpn_key')
          : 'account_balance_wallet');

      const amountColor = isDeposit
        ? (isPending ? 'text-amber-500' : (isInvalid ? 'text-text-body/50 line-through' : 'text-secondary'))
        : (isFailed ? 'text-text-body/50 line-through' : (isPending ? 'text-amber-500' : 'text-error-ruby'));

      let amountText = '';
      if (isDeposit) {
        amountText = isInvalid ? '+Rp 0' : `+Rp ${Number(tx.amount || 0).toLocaleString('id-ID')}`;
      } else {
        amountText = `-Rp ${Number(tx.amount || 0).toLocaleString('id-ID')}`;
      }

      const subtitle = tx.maskedKey || (isReferralCommission ? (tx.description || 'Komisi Referral') : (isDeposit ? 'Setoran API Key' : 'Penarikan Saldo'));

      return `
        <div class="bg-surface-card border border-surface-container rounded-2xl p-3.5 flex items-center justify-between shadow-sm hover:bg-surface-container-low transition-colors">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">
                ${iconName}
              </span>
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-label-md text-xs font-bold text-text-heading truncate">${tx.title}</span>
                ${statusBadge}
              </div>
              <div class="flex items-center gap-1.5 text-[11px] text-text-body truncate">
                <span>${dateStr}</span>
                <span class="text-outline/40">•</span>
                <span class="font-mono text-[10px] text-text-body/80 truncate">${subtitle}</span>
              </div>
              ${tx.errorMessage ? `<span class="text-[10px] text-error-ruby truncate mt-0.5">${tx.errorMessage}</span>` : ''}
            </div>
          </div>
          <span class="font-headline-md text-xs font-bold ${amountColor} shrink-0 pl-2">
            ${amountText}
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
      const recentActivities = this._getCombinedRecentActivities().slice(0, 5);
      recentTxContainer.innerHTML = this._renderRecentTxHtml(recentActivities);
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

    // Cek apakah ada notifikasi payout (diterima / ditolak) yang belum dibaca
    this._checkUnreadPayoutNotifications();

    this._unsubNotifsUpdated = this._eventBus.on(AppEvents.NOTIFICATIONS_UPDATED, () => {
      this._checkUnreadPayoutNotifications();
    });

    // Listener Tooltip interaktif untuk Saldo Aktif, Saldo Pasif, dan Status Akun
    const tooltipBtns = container.querySelectorAll('.btn-dashboard-tooltip');
    tooltipBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const type = btn.getAttribute('data-tooltip');
        if (type) {
          this._showTooltipModal(type);
        }
      });
    });

    // Listener tombol Setor Key saat akun terkunci (belum terverifikasi)
    const lockedSetorBtn = container.querySelector('#btnDashboardSetorLocked');
    lockedSetorBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this._notificationService.showModal({
        title: 'Fitur Setor Key Terkunci',
        message: 'Akun Anda berstatus <strong>Belum Terverifikasi</strong>.<br><br>Untuk mencegah kendala pencairan dana, Anda diwajibkan melengkapi rekening bank atau e-wallet pencairan di profil Anda terlebih dahulu sebelum dapat menyetor API Key.',
        type: 'warning',
        confirmText: 'Verifikasi Akun Sekarang',
        cancelText: 'Nanti Saja',
        showCancel: true,
        onConfirm: () => {
          sessionStorage.setItem('panenkunci:auto_open_bank', 'true');
          window.location.hash = '/profil';
        }
      });
    });
  }

  /**
   * Menampilkan modal tooltip interaktif untuk Saldo Aktif, Saldo Pasif, dan Status Akun
   * @param {'saldo-aktif'|'saldo-pasif'|'status-akun'} type
   */
  _showTooltipModal(type) {
    const user = this._authService.getCurrentUser();
    const isVerified = Boolean(user?.isVerified);

    let config = null;

    if (type === 'saldo-aktif') {
      config = {
        icon: 'account_balance_wallet',
        iconBg: 'bg-primary/10 text-primary',
        title: 'Total Saldo Aktif',
        badge: 'Siap Ditarik Kapan Saja',
        badgeClass: 'bg-primary/10 text-primary border border-primary/20',
        description: 'Total saldo utama Anda dari hasil setoran API Key yang sah dan telah tervalidasi oleh sistem.',
        items: [
          {
            icon: 'payments',
            iconColor: 'text-secondary',
            title: 'Dapat Ditarik Kapan Saja',
            desc: 'Saldo ini sepenuhnya aktif dan dapat langsung dicairkan ke DANA, GoPay, OVO, ShopeePay, atau Bank Transfer melalui tombol Tarik Saldo.'
          },
          {
            icon: 'verified_user',
            iconColor: 'text-primary',
            title: 'Aman & Bebas Potongan Tersembunyi',
            desc: 'Saldo tersimpan aman di akun Anda dan tidak akan pernah hangus atau berkurang secara sepihak.'
          }
        ],
        btnText: 'Saya Mengerti',
        btnAction: null
      };
    } else if (type === 'saldo-pasif') {
      config = {
        icon: 'hourglass_top',
        iconBg: 'bg-secondary/10 text-secondary',
        title: 'Saldo Pasif',
        badge: 'Menunggu Kliring / Proses',
        badgeClass: 'bg-secondary/10 text-secondary border border-secondary/20',
        description: 'Saldo pendapatan pasif Anda yang bersumber dari bonus referral atau setoran yang masih dalam antrean validasi sistem.',
        items: [
          {
            icon: 'sync_alt',
            iconColor: 'text-secondary',
            title: 'Kliring Otomatis',
            desc: 'Begitu proses peninjauan sistem selesai, saldo pasif akan otomatis dipindahkan ke Total Saldo Aktif Anda.'
          },
          {
            icon: 'group_add',
            iconColor: 'text-primary',
            title: 'Tingkatkan Saldo Pasif',
            desc: 'Bagikan kode atau link referral Anda kepada teman untuk memperoleh komisi saldo pasif secara terus-menerus.'
          }
        ],
        btnText: 'Saya Mengerti',
        btnAction: null
      };
    } else if (type === 'status-akun') {
      if (isVerified) {
        config = {
          icon: 'verified',
          iconBg: 'bg-secondary/10 text-secondary',
          title: 'Akun Terverifikasi',
          badge: 'Terverifikasi Penuh',
          badgeClass: 'bg-secondary/10 text-secondary border border-secondary/20',
          description: 'Selamat! Akun Anda telah terverifikasi resmi dan seluruh fitur pencairan saldo telah aktif.',
          items: [
            {
              icon: 'task_alt',
              iconColor: 'text-secondary',
              title: 'Rekening Pencairan Siap',
              desc: 'Data rekening bank atau e-wallet Anda telah terdaftar dan siap menerima penarikan dana kapan saja.'
            }
          ],
          btnText: 'Tutup',
          btnAction: null
        };
      } else {
        config = {
          icon: 'shield_lock',
          iconBg: 'bg-amber-500/10 text-amber-600',
          title: 'Status: Belum Terverifikasi',
          badge: 'Perlu Verifikasi Rekening',
          badgeClass: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
          description: 'Akun Anda berstatus <strong>Belum Terverifikasi</strong> karena Anda belum melengkapi data rekening bank atau nomor HP e-wallet untuk pencairan dana.',
          stepsTitle: 'Cara Mudah Memverifikasi Akun:',
          steps: [
            'Klik tombol <strong>Verifikasi Sekarang</strong> di bawah (atau buka menu <strong>Profil</strong>).',
            'Pada kartu <strong>Rekening & E-Wallet Pencairan</strong>, klik tombol <strong>Ubah</strong>.',
            'Pilih metode pembayaran Anda (DANA, GoPay, OVO, ShopeePay, atau Bank Transfer).',
            'Masukkan nomor rekening atau nomor HP e-wallet dengan benar, lalu klik <strong>Simpan</strong>.',
            'Selesai! Akun Anda langsung <strong>Terverifikasi</strong> dan petunjuk ini akan otomatis hilang.'
          ],
          btnText: 'Verifikasi Sekarang',
          btnAction: () => {
            sessionStorage.setItem('panenkunci:auto_open_bank', 'true');
            window.location.hash = '/profil';
          },
          secondaryBtnText: 'Nanti Saja'
        };
      }
    }

    if (!config) return;

    // Bersihkan modal lama jika ada
    const existing = document.getElementById('dashboard-tooltip-modal-root');
    if (existing) existing.remove();

    const modalWrapper = document.createElement('div');
    modalWrapper.id = 'dashboard-tooltip-modal-root';
    modalWrapper.className = 'fixed inset-0 z-[120] flex items-center justify-center p-4 transition-all duration-300 opacity-0';

    let contentHtml = '';
    if (config.steps) {
      contentHtml = `
        <div class="w-full bg-surface-container-low rounded-2xl p-4 text-left border border-surface-container flex flex-col gap-2 mt-1">
          <span class="text-xs font-bold text-text-heading flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[17px] text-amber-500">assignment_turned_in</span>
            ${config.stepsTitle}
          </span>
          <ol class="flex flex-col gap-2 text-xs text-text-body mt-1">
            ${config.steps.map((step, idx) => `
              <li class="flex items-start gap-2">
                <span class="w-4 h-4 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">${idx + 1}</span>
                <span class="leading-relaxed">${step}</span>
              </li>
            `).join('')}
          </ol>
        </div>
      `;
    } else if (config.items) {
      contentHtml = `
        <div class="w-full bg-surface-container-low rounded-2xl p-3.5 text-left border border-surface-container flex flex-col gap-2.5 mt-1">
          ${config.items.map(item => `
            <div class="flex items-start gap-2.5">
              <span class="material-symbols-outlined text-[18px] ${item.iconColor} shrink-0 mt-0.5">${item.icon}</span>
              <div class="flex flex-col">
                <span class="text-xs font-bold text-text-heading">${item.title}</span>
                <span class="text-[11px] text-text-body leading-relaxed mt-0.5">${item.desc}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    modalWrapper.innerHTML = `
      <!-- Backdrop with blur -->
      <div class="tooltip-modal-backdrop absolute inset-0 bg-on-surface/50 backdrop-blur-sm transition-opacity duration-300"></div>

      <!-- Card Container -->
      <div class="tooltip-modal-card relative bg-surface-card w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-3.5 transform scale-95 transition-transform duration-300 z-10 border border-surface-container">
        <!-- Close Button -->
        <button type="button" class="tooltip-modal-close absolute right-4 top-4 text-outline hover:text-on-surface p-1.5 rounded-full hover:bg-surface-container transition-colors cursor-pointer" aria-label="Tutup">
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>

        <!-- Icon -->
        <div class="w-13 h-13 rounded-2xl ${config.iconBg} flex items-center justify-center shadow-inner mt-1">
          <span class="material-symbols-outlined text-[28px]">${config.icon}</span>
        </div>

        <!-- Title & Badge -->
        <div class="flex flex-col items-center gap-1.5 w-full">
          <h3 class="font-headline-md text-base text-text-heading font-bold">${config.title}</h3>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${config.badgeClass}">
            ${config.badge}
          </span>
          <p class="font-body-md text-xs text-text-body leading-relaxed mt-0.5 text-center">
            ${config.description}
          </p>
        </div>

        <!-- Custom Content -->
        ${contentHtml}

        <!-- Actions -->
        <div class="flex items-center gap-2.5 w-full mt-2">
          ${config.secondaryBtnText ? `
            <button type="button" class="tooltip-modal-cancel flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all active:scale-95 cursor-pointer">
              ${config.secondaryBtnText}
            </button>
          ` : ''}
          <button type="button" class="tooltip-modal-action flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-primary text-on-primary hover:bg-primary-container transition-all active:scale-95 cursor-pointer shadow-md shadow-primary/20">
            ${config.btnText}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modalWrapper);

    const card = modalWrapper.querySelector('.tooltip-modal-card');
    const closeBtn = modalWrapper.querySelector('.tooltip-modal-close');
    const cancelBtn = modalWrapper.querySelector('.tooltip-modal-cancel');
    const actionBtn = modalWrapper.querySelector('.tooltip-modal-action');
    const backdrop = modalWrapper.querySelector('.tooltip-modal-backdrop');

    requestAnimationFrame(() => {
      modalWrapper.classList.remove('opacity-0');
      modalWrapper.classList.add('opacity-100');
      card.classList.remove('scale-95');
      card.classList.add('scale-100');
    });

    const closeModal = () => {
      modalWrapper.classList.remove('opacity-100');
      modalWrapper.classList.add('opacity-0');
      card.classList.remove('scale-100');
      card.classList.add('scale-95');
      setTimeout(() => {
        modalWrapper.remove();
      }, 250);
    };

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', closeModal);

    actionBtn?.addEventListener('click', () => {
      closeModal();
      if (typeof config.btnAction === 'function') {
        config.btnAction();
      }
    });
  }

  /**
   * Cek notifikasi penarikan saldo (diterima / ditolak) yang belum dibaca
   * dan tampilkan modal notifikasi otomatis di dashboard
   */
  _checkUnreadPayoutNotifications() {
    if (!this._notificationService) return;
    const notifs = this._notificationService.getNotifications();
    const unreadPayout = notifs.find(n => 
      !n.isRead && 
      (n.type === 'withdrawal_success' || n.type === 'withdrawal_failed')
    );

    if (unreadPayout) {
      const sessionAlertKey = `alerted_payout_${unreadPayout.id}`;
      if (sessionStorage.getItem(sessionAlertKey)) return;
      sessionStorage.setItem(sessionAlertKey, 'true');

      const isSuccess = unreadPayout.type === 'withdrawal_success';
      setTimeout(() => {
        this._notificationService.showModal({
          title: unreadPayout.title || (isSuccess ? 'Penarikan Saldo Diterima!' : 'Permintaan Penarikan Ditolak'),
          message: unreadPayout.message,
          type: isSuccess ? 'success' : 'error',
          confirmText: 'Buka Notifikasi',
          cancelText: 'Tutup',
          onConfirm: () => {
            document.getElementById('header-notif-btn')?.click();
          }
        });
      }, 500);
    }
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
    if (this._unsubNotifsUpdated) {
      this._unsubNotifsUpdated();
      this._unsubNotifsUpdated = null;
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
