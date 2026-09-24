import { IComponent } from '../../core/interfaces/IComponent.js';
import { AppEvents } from '../../core/events/EventBus.js';
import { renderPaymentMethodIcon } from '../utils/PaymentMethodHelper.js';
import { ReceiptHelper } from '../utils/ReceiptHelper.js';

/**
 * HistoryView
 * Prinsip: Single Responsibility Principle (SRP) & Liskov Substitution Principle (LSP)
 * Halaman riwayat transaksi dengan dua tab interaktif: Riwayat Setoran Key & Riwayat Penarikan Saldo.
 */
export class HistoryView extends IComponent {
  /**
   * @param {import('../../core/container/ServiceContainer.js').ServiceContainer} container
   */
  constructor(container) {
    super();
    this._container = container;
    this._apiKeyService = container.resolve('ApiKeyService');
    this._walletService = container.resolve('WalletService');
    this._authService = container.resolve('AuthService');
    this._notification = container.resolve('NotificationService');
    this._eventBus = container.resolve('EventBus');
    this._activeTab = 'setoran'; // 'setoran', 'penarikan', or 'referral'
  }

  render() {
    // Deteksi tab aktif dari query string hash (#/riwayat?tab=referral) atau sessionStorage
    const currentHash = window.location.hash || '';
    if (
      currentHash.includes('tab=penarikan') ||
      currentHash.includes('type=penarikan') ||
      sessionStorage.getItem('panenkunci:history_tab') === 'penarikan'
    ) {
      this._activeTab = 'penarikan';
      sessionStorage.removeItem('panenkunci:history_tab');
    } else if (
      currentHash.includes('tab=referral') ||
      currentHash.includes('tab=kode_referral') ||
      currentHash.includes('type=referral') ||
      sessionStorage.getItem('panenkunci:history_tab') === 'referral'
    ) {
      this._activeTab = 'referral';
      sessionStorage.removeItem('panenkunci:history_tab');
    } else if (currentHash.includes('tab=setoran')) {
      this._activeTab = 'setoran';
    }

    const keys = this._apiKeyService.getAllKeys();
    const withdrawals = this._walletService.getWithdrawals();
    const referrals = this._walletService.getReferralHistory();
    const currentUser = this._authService.getCurrentUser();

    return `
      <div class="flex flex-col w-full min-h-screen bg-background pb-28 pt-20">
        <div class="px-margin-mobile max-w-md mx-auto w-full flex flex-col gap-4">
          
          <!-- Segmented Tab Controls (3 Tabs) -->
          <div class="flex bg-surface-container-low rounded-2xl p-1 gap-1 border border-surface-container shadow-inner">
            <button
              type="button"
              id="tabBtnSetoran"
              class="flex-1 py-2 px-1.5 rounded-xl font-label-md text-[11px] sm:text-xs font-bold transition-all duration-200 text-center truncate ${this._activeTab === 'setoran' ? 'bg-surface-card text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}"
            >
              Setoran Key (<span id="countSetoran">${keys.length}</span>)
            </button>
            <button
              type="button"
              id="tabBtnPenarikan"
              class="flex-1 py-2 px-1.5 rounded-xl font-label-md text-[11px] sm:text-xs font-bold transition-all duration-200 text-center truncate ${this._activeTab === 'penarikan' ? 'bg-surface-card text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}"
            >
              Penarikan (<span id="countPenarikan">${withdrawals.length}</span>)
            </button>
            <button
              type="button"
              id="tabBtnReferral"
              class="flex-1 py-2 px-1.5 rounded-xl font-label-md text-[11px] sm:text-xs font-bold transition-all duration-200 text-center truncate ${this._activeTab === 'referral' ? 'bg-surface-card text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}"
            >
              Referral (<span id="countReferral">${referrals.length}</span>)
            </button>
          </div>

          <!-- Tab Content: Setoran API Key -->
          <div id="tabContentSetoran" class="flex flex-col gap-2.5 ${this._activeTab === 'setoran' ? '' : 'hidden'}">
            ${this._renderSetoranTabHtml(keys)}
          </div>

          <!-- Tab Content: Penarikan Dana -->
          <div id="tabContentPenarikan" class="flex flex-col gap-2.5 ${this._activeTab === 'penarikan' ? '' : 'hidden'}">
            ${this._renderPenarikanTabHtml(withdrawals, currentUser)}
          </div>

          <!-- Tab Content: Riwayat Potongan Kode Referral -->
          <div id="tabContentReferral" class="flex flex-col gap-2.5 ${this._activeTab === 'referral' ? '' : 'hidden'}">
            ${this._renderReferralTabHtml(referrals, currentUser)}
          </div>

        </div>
      </div>
    `;
  }

  _renderSetoranTabHtml(keys) {
    if (!keys || keys.length === 0) {
      return `
        <div class="bg-surface-card rounded-3xl p-10 text-center flex flex-col items-center border border-surface-container">
          <span class="material-symbols-outlined text-4xl text-outline mb-2">vpn_key_off</span>
          <p class="text-sm font-bold text-text-heading">Belum Ada Setoran Key</p>
          <p class="text-xs text-text-body mt-1">Mulai setorkan API Key valid dari Kie.ai untuk mendapatkan saldo.</p>
          <a href="#/setor" class="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-sm">
            Setor Key Sekarang
          </a>
        </div>
      `;
    }

    return keys.map(k => {
      const isPending = k.status === 'pending';
      const isValid = k.status === 'valid';
      const stripeColor = isPending ? 'bg-amber-500' : (isValid ? 'bg-secondary' : 'bg-error-ruby');
      const dateStr = new Date(k.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const creditBgClass = isPending 
        ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' 
        : isValid 
        ? 'bg-secondary/10 text-secondary border border-secondary/20' 
        : 'bg-surface-container text-outline border border-surface-container-high';

      const amountFormatted = (isPending || isValid) 
        ? `+Rp ${(k.rewardAmount || 3000).toLocaleString('id-ID')}` 
        : '+Rp 0';

      const amountColorClass = isPending 
        ? 'text-amber-500' 
        : (isValid ? 'text-secondary' : 'text-outline line-through');

      let statusBadgeHtml = '';
      if (isPending) {
        statusBadgeHtml = `
          <div class="bg-amber-500/15 text-amber-600 px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 border border-amber-500/30 whitespace-nowrap shadow-2xs shrink-0">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Menunggu Verifikasi</span>
          </div>
        `;
      } else if (isValid) {
        statusBadgeHtml = `
          <div class="bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 whitespace-nowrap shadow-2xs shrink-0">
            <span class="material-symbols-outlined text-[13px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
            <span>Valid</span>
          </div>
        `;
      } else {
        statusBadgeHtml = `
          <div class="bg-error-container text-on-error-container px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 whitespace-nowrap shadow-2xs shrink-0">
            <span class="material-symbols-outlined text-[13px]">cancel</span>
            <span>Invalid</span>
          </div>
        `;
      }

      return `
        <div class="bg-surface-card border border-surface-container rounded-2xl p-3.5 sm:p-4 shadow-2xs relative overflow-hidden flex flex-col gap-2 transition-all">
          <div class="absolute left-0 top-0 bottom-0 w-1.5 ${stripeColor}"></div>

          <!-- Baris 1: Identitas Key & Nominal Saldo Reward -->
          <div class="flex items-center justify-between gap-2 pl-2">
            <div class="flex items-center gap-1.5 bg-surface-container-low px-2 py-0.5 rounded-lg border border-surface-container/80 min-w-0">
              <span class="material-symbols-outlined text-outline text-[13px] shrink-0">vpn_key</span>
              <span class="font-mono text-xs font-bold text-text-heading tracking-tight truncate">
                ${k.getMaskedKey()}
              </span>
            </div>

            <!-- Nominal Saldo & Status Saldo (Aktif/Pasif) -->
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="font-mono text-xs sm:text-sm font-extrabold whitespace-nowrap ${amountColorClass}">
                ${amountFormatted}
              </span>
              ${isPending ? '<span class="text-[9px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded whitespace-nowrap">Pasif</span>' : (isValid ? '<span class="text-[9px] font-bold text-secondary bg-secondary/10 border border-secondary/20 px-1.5 py-0.5 rounded whitespace-nowrap">Aktif</span>' : '')}
            </div>
          </div>

          <!-- Baris 2: Kredit, Waktu Penyerahan & Status Validasi -->
          <div class="flex items-center justify-between gap-2 pl-2 pt-0.5">
            <div class="flex items-center gap-2 text-[11px] text-text-body whitespace-nowrap min-w-0">
              <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${creditBgClass} shrink-0 whitespace-nowrap">
                ${k.credits !== undefined ? k.credits : 80} cr
              </span>
              <div class="flex items-center gap-1 text-[11px] text-text-body truncate">
                <span class="material-symbols-outlined text-[13px] text-outline shrink-0">schedule</span>
                <span class="truncate">${dateStr}</span>
              </div>
            </div>

            <!-- Status Badge: 1 baris utuh di kanan bawah -->
            <div class="shrink-0">
              ${statusBadgeHtml}
            </div>
          </div>

          <!-- Baris 3 (Opsional): Kotak Alasan Penolakan / Invalid -->
          ${k.errorMessage ? `
            <div class="ml-2 mt-0.5 bg-rose-500/8 border border-rose-500/20 rounded-xl px-2.5 py-1.5 flex items-start gap-1.5 text-[11px] text-rose-500 font-medium">
              <span class="material-symbols-outlined text-[15px] shrink-0 text-rose-500 mt-0.5">error</span>
              <span class="leading-tight">${k.errorMessage}</span>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  _renderPenarikanTabHtml(withdrawals, currentUser = null) {
    if (!withdrawals || withdrawals.length === 0) {
      return `
        <div class="bg-surface-card rounded-3xl p-10 text-center flex flex-col items-center border border-surface-container">
          <span class="material-symbols-outlined text-4xl text-outline mb-2">receipt_long</span>
          <p class="text-sm font-bold text-text-heading">Belum Ada Riwayat Penarikan</p>
          <p class="text-xs text-text-body mt-1">Kumpulkan saldo dari setoran API key untuk melakukan penarikan pertama Anda.</p>
          <a href="#/tarik" class="mt-4 px-4 py-2 bg-secondary text-white rounded-xl text-xs font-bold shadow-sm">
            Tarik Saldo
          </a>
        </div>
      `;
    }

    return withdrawals.map(w => {
      const dateStr = new Date(w.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const rawStatus = String(w.status || '').trim().toLowerCase();
      const isSuccess = rawStatus === 'success' || rawStatus === 'valid' || rawStatus === 'approved' || rawStatus === 'completed' || rawStatus === 'berhasil';
      const isFailed = rawStatus === 'failed' || rawStatus === 'rejected' || rawStatus === 'ditolak' || rawStatus === 'invalid';
      const isPending = !isSuccess && !isFailed;

      let stripeColor = 'bg-warning-amber';
      let badgeHtml = '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 inline-flex items-center gap-1 whitespace-nowrap shadow-2xs"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span><span>Menunggu Verifikasi</span></span>';

      if (isSuccess) {
        stripeColor = 'bg-secondary';
        badgeHtml = '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/20 inline-flex items-center gap-1 whitespace-nowrap shadow-2xs"><span class="material-symbols-outlined text-[13px]" style="font-variation-settings: \'FILL\' 1;">check_circle</span><span>Ditransfer</span></span>';
      } else if (isFailed) {
        stripeColor = 'bg-error-ruby';
        badgeHtml = '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-error-container text-on-error-container border border-error/20 inline-flex items-center gap-1 whitespace-nowrap shadow-2xs"><span class="material-symbols-outlined text-[13px]">cancel</span><span>Ditolak</span></span>';
      }

      // Ekstraksi data target rekening / e-wallet
      let targetAccount = w.recipient || '';
      if (!targetAccount && w.description) {
        const m = w.description.match(/Penarikan ke\s+([^\s•]+)/i) || w.description.match(/(08\d{8,12}|\d{9,16})/);
        if (m) targetAccount = m[1];
      }

      // Ekstraksi biaya admin
      let fee = Number(w.fee || 0);
      if (fee === 0 && w.description) {
        const m = w.description.match(/Biaya Admin:\s*Rp\s*([\d\.]+)/i);
        if (m) fee = Number(m[1].replace(/\./g, '')) || 0;
      }

      // Ekstraksi potongan referral
      let referralCut = Number(w.referralDeduction || 0);
      if (referralCut === 0 && w.description) {
        const m = w.description.match(/Potongan Referral[^:]*:\s*Rp\s*([\d\.]+)/i);
        if (m) referralCut = Number(m[1].replace(/\./g, '')) || 0;
      }
      const refCode = w.referralCode || (w.description?.match(/Potongan Referral \(([^)]+)\)/i)?.[1] || '');

      return `
        <div class="bg-surface-card border border-surface-container rounded-2xl p-3.5 sm:p-4 shadow-2xs relative overflow-hidden flex flex-col gap-2.5 transition-all">
          <div class="absolute left-0 top-0 bottom-0 w-1.5 ${stripeColor}"></div>

          <!-- Baris 1: Metode Penarikan & Status Badge -->
          <div class="flex items-center justify-between gap-2 pl-2">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-8 h-8 shrink-0 rounded-xl overflow-hidden shadow-2xs flex items-center justify-center bg-surface-container">
                ${renderPaymentMethodIcon(w, 'w-8 h-8', currentUser?.bankName)}
              </div>
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="font-label-md text-xs font-bold text-text-heading truncate">${w.title}</span>
                ${targetAccount ? `
                  <span class="font-mono text-[11px] font-semibold text-text-body bg-surface-container-low px-1.5 py-0.5 rounded border border-surface-container shrink-0">
                    ${targetAccount}
                  </span>
                ` : ''}
              </div>
            </div>
            <div class="shrink-0">
              ${badgeHtml}
            </div>
          </div>

          <!-- Baris 2: Waktu Penarikan, Rincian Biaya, & Nominal Penarikan -->
          <div class="flex items-end justify-between gap-2 pl-2 pt-0.5">
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-1 text-[11px] text-text-body">
                <span class="material-symbols-outlined text-[13px] text-outline">schedule</span>
                <span>${dateStr}</span>
              </div>
              <div class="flex items-center gap-1.5 mt-1 flex-wrap text-[10px]">
                ${fee > 0 ? `
                  <span class="bg-surface-container-low px-1.5 py-0.5 rounded border border-surface-container text-text-body font-mono">
                    Admin: Rp ${fee.toLocaleString('id-ID')}
                  </span>
                ` : ''}
                ${referralCut > 0 ? `
                  <span class="bg-primary/8 text-primary px-1.5 py-0.5 rounded border border-primary/20 font-mono font-medium">
                    Ref${refCode ? ` (${refCode})` : ''}: -Rp ${referralCut.toLocaleString('id-ID')}
                  </span>
                ` : ''}
              </div>
            </div>

            <div class="flex flex-col items-end shrink-0">
              <span class="font-mono text-sm font-extrabold whitespace-nowrap ${isFailed ? 'text-text-body line-through' : 'text-error-ruby'}">
                -Rp ${w.amount.toLocaleString('id-ID')}
              </span>
              <span class="text-[10px] ${isSuccess ? 'text-secondary font-bold' : isPending ? 'text-amber-600 font-semibold' : 'text-text-body font-semibold'} whitespace-nowrap">
                ${isSuccess ? 'Berhasil Masuk' : isPending ? 'Dalam Antrean' : 'Dana Di-refund'}
              </span>
            </div>
          </div>

          <!-- Baris 3: Tombol Aksi Detail / Bukti Transfer -->
          ${isSuccess ? `
            <div class="pl-2 pt-1 border-t border-surface-container/60">
              <button
                type="button"
                data-proof-history="${w.id}"
                class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span class="material-symbols-outlined text-[15px]">receipt_long</span>
                <span>Lihat Bukti Transfer & Rincian</span>
              </button>
            </div>
          ` : isFailed ? `
            <div class="pl-2 pt-1 border-t border-surface-container/60">
              <button
                type="button"
                data-reject-history="${w.id}"
                class="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span class="material-symbols-outlined text-[15px]">info</span>
                <span>Lihat Rincian Penolakan</span>
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  _renderReferralTabHtml(referrals, currentUser) {
    if (!referrals || referrals.length === 0) {
      return `
        <div class="bg-surface-card rounded-3xl p-8 text-center flex flex-col items-center border border-surface-container shadow-xs">
          <div class="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
            <span class="material-symbols-outlined text-3xl">loyalty</span>
          </div>
          <p class="text-sm font-bold text-text-heading">Belum Ada Riwayat Potongan Kode Referral</p>
          <p class="text-xs text-text-body mt-1.5 max-w-xs leading-relaxed">
            Riwayat potongan kode referral akan otomatis tercatat di sini saat akun yang terikat oleh akun lain melalui kode referral melakukan penarikan dana.
          </p>
          ${currentUser?.referredBy ? `
            <div class="mt-4 px-3.5 py-2 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">link</span>
              <span>Akun Terikat ke Kode: <strong class="font-mono">${currentUser.referredBy}</strong></span>
            </div>
            <p class="text-[11px] text-text-body mt-2">Setiap penarikan dana Anda akan menerapkan potongan referral dan tercatat di sini secara transparan.</p>
          ` : `
            <div class="mt-4 flex items-center gap-2">
              <a href="#/profil" class="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-sm hover:bg-primary-container transition-all inline-flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[15px]">link</span>
                <span>Tautkan Kode di Profil</span>
              </a>
              <a href="#/profil" class="px-3.5 py-2 bg-surface-container hover:bg-surface-container-high text-text-heading rounded-xl text-xs font-bold border border-surface-container transition-all inline-flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[15px]">share</span>
                <span>Kode Saya</span>
              </a>
            </div>
          `}
        </div>
      `;
    }

    const boundCode = currentUser?.referredBy || referrals[0]?.referralCode || 'Terikat';

    const headerBadgeHtml = `
      <div class="bg-gradient-to-r from-primary/10 via-surface-card to-secondary/10 border border-primary/20 rounded-2xl p-3 px-3.5 flex items-center justify-between shadow-xs mb-1">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <span class="material-symbols-outlined text-[16px]">link</span>
          </div>
          <div class="flex flex-col">
            <span class="text-[10px] uppercase tracking-wider text-text-body font-semibold">Akun Terikat Kode Referral</span>
            <span class="text-xs font-mono font-extrabold text-primary">${boundCode}</span>
          </div>
        </div>
        <span class="text-[10px] font-bold text-secondary bg-secondary/15 border border-secondary/30 px-2 py-0.5 rounded-full flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
          <span>Potongan Aktif (${this._walletService.referralCutPercent}%)</span>
        </span>
      </div>
    `;

    const itemsHtml = referrals.map(ref => {
      const dateStr = new Date(ref.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const rawStatus = String(ref.status || '').trim().toLowerCase();
      const isSuccess = rawStatus === 'success' || rawStatus === 'valid' || rawStatus === 'approved' || rawStatus === 'completed' || rawStatus === 'berhasil';
      const isFailed = rawStatus === 'failed' || rawStatus === 'rejected' || rawStatus === 'ditolak' || rawStatus === 'invalid';
      const isPending = !isSuccess && !isFailed;

      let stripeColor = 'bg-primary';
      let statusBadge = `
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/30 inline-flex items-center gap-1 whitespace-nowrap">
          <span>Potongan ${ref.deductionPercent ?? this._walletService.referralCutPercent}%</span>
        </span>
      `;

      if (isSuccess) {
        stripeColor = 'bg-secondary';
        statusBadge = `
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary/15 text-secondary inline-flex items-center gap-1 whitespace-nowrap">
            <span class="material-symbols-outlined text-[13px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
            <span>Tercairkan</span>
          </span>
        `;
      } else if (isPending) {
        stripeColor = 'bg-warning-amber';
        statusBadge = `
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-warning-amber/15 text-warning-amber border border-warning-amber/30 inline-flex items-center gap-1 whitespace-nowrap">
            <span class="w-1.5 h-1.5 rounded-full bg-warning-amber animate-pulse"></span>
            <span>Menunggu</span>
          </span>
        `;
      } else if (isFailed) {
        stripeColor = 'bg-error-ruby';
        statusBadge = `
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-error-container text-on-error-container inline-flex items-center gap-1 whitespace-nowrap">
            <span class="material-symbols-outlined text-[13px]">cancel</span>
            <span>Batal</span>
          </span>
        `;
      }

      return `
        <div class="bg-surface-card border border-surface-container rounded-2xl p-3.5 sm:p-4 shadow-2xs relative overflow-hidden flex flex-col gap-2.5">
          <div class="absolute left-0 top-0 bottom-0 w-1.5 ${stripeColor}"></div>

          <!-- Baris 1: Info Kode & Status Badge -->
          <div class="flex items-center justify-between gap-2 pl-2">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-7 h-7 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <span class="material-symbols-outlined text-[16px]">loyalty</span>
              </div>
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20 shrink-0">
                  ${ref.referralCode}
                </span>
                <span class="text-[11px] font-bold text-text-heading truncate">Potongan Referral</span>
              </div>
            </div>
            <div class="shrink-0">
              ${statusBadge}
            </div>
          </div>

          <!-- Baris 2: Waktu Penarikan & Nominal Potongan -->
          <div class="flex items-end justify-between gap-2 pl-2 pt-0.5">
            <div class="flex flex-col min-w-0">
              <span class="text-[11px] text-text-body flex items-center gap-1">
                <span class="material-symbols-outlined text-[13px] text-outline">schedule</span>
                <span>${dateStr}</span>
              </span>
              <span class="text-[10px] text-outline mt-0.5 truncate">
                Penarikan Rp ${(ref.withdrawalAmount || 0).toLocaleString('id-ID')} (${ref.deductionPercent || 5}%)
              </span>
            </div>

            <div class="flex flex-col items-end shrink-0">
              <span class="font-mono text-sm font-extrabold whitespace-nowrap ${isFailed ? 'text-text-body line-through' : 'text-primary'}">
                -Rp ${(ref.deductionAmount || 0).toLocaleString('id-ID')}
              </span>
              <span class="text-[10px] text-outline font-semibold whitespace-nowrap">
                Potongan ${ref.deductionPercent || 5}%
              </span>
            </div>
          </div>

          <!-- Baris 3: Tombol Rincian -->
          <div class="pl-2 pt-1 border-t border-surface-container/60">
            <button
              type="button"
              data-referral-detail="${ref.id}"
              class="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span class="material-symbols-outlined text-[15px]">info</span>
              <span>Lihat Rincian Potongan</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    return headerBadgeHtml + itemsHtml;
  }

  _updateContentUI(container) {
    if (!container) return;

    const keys = this._apiKeyService.getAllKeys();
    const withdrawals = this._walletService.getWithdrawals();
    const referrals = this._walletService.getReferralHistory();
    const currentUser = this._authService.getCurrentUser();

    const countSetoranEl = container.querySelector('#countSetoran');
    const countPenarikanEl = container.querySelector('#countPenarikan');
    const countReferralEl = container.querySelector('#countReferral');
    const contentSetoran = container.querySelector('#tabContentSetoran');
    const contentPenarikan = container.querySelector('#tabContentPenarikan');
    const contentReferral = container.querySelector('#tabContentReferral');

    if (countSetoranEl && countSetoranEl.textContent !== `${keys.length}`) countSetoranEl.textContent = `${keys.length}`;
    if (countPenarikanEl && countPenarikanEl.textContent !== `${withdrawals.length}`) countPenarikanEl.textContent = `${withdrawals.length}`;
    if (countReferralEl && countReferralEl.textContent !== `${referrals.length}`) countReferralEl.textContent = `${referrals.length}`;

    if (contentSetoran) {
      const newSetoranHtml = this._renderSetoranTabHtml(keys);
      if (contentSetoran.innerHTML !== newSetoranHtml) {
        contentSetoran.innerHTML = newSetoranHtml;
      }
    }
    if (contentPenarikan) {
      const newPenarikanHtml = this._renderPenarikanTabHtml(withdrawals, currentUser);
      if (contentPenarikan.innerHTML !== newPenarikanHtml) {
        contentPenarikan.innerHTML = newPenarikanHtml;
        this._bindProofLightbox(container);
      }
    }
    if (contentReferral) {
      const newReferralHtml = this._renderReferralTabHtml(referrals, currentUser);
      if (contentReferral.innerHTML !== newReferralHtml) {
        contentReferral.innerHTML = newReferralHtml;
        this._bindReferralDetailModal(container);
      }
    }
  }

  _bindReferralDetailModal(container) {
    container.querySelectorAll('[data-referral-detail]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-referral-detail');
        const referrals = this._walletService.getReferralHistory();
        const item = referrals.find(r => r.id === id);
        if (!item) return;

        const dateStr = new Date(item.createdAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        this._notification.showModal({
          title: 'Rincian Potongan Kode Referral',
          message: 'Detail pemotongan kode referral pada penarikan dana:',
          html: `
            <div class="flex flex-col gap-2.5 text-left w-full my-1">
              <div class="bg-surface-container-low rounded-2xl p-3.5 space-y-2.5 border border-surface-container text-xs">
                <div class="flex justify-between items-center">
                  <span class="text-text-body">ID Transaksi Penarikan</span>
                  <strong class="font-mono text-primary font-bold">#${item.withdrawalId || item.id}</strong>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-text-body">Akun Terikat Kode Referral</span>
                  <span class="font-mono font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">${item.referralCode}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-text-body">Waktu Penarikan</span>
                  <span class="font-medium text-text-heading">${dateStr}</span>
                </div>
                <div class="h-[1px] w-full bg-outline-variant/30 my-1"></div>
                <div class="flex justify-between items-center">
                  <span class="text-text-body">Nominal Penarikan Dana</span>
                  <strong class="font-mono font-bold text-text-heading">Rp ${(item.withdrawalAmount || 0).toLocaleString('id-ID')}</strong>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-text-body">Persentase Potongan</span>
                  <strong class="font-mono font-bold text-primary">${item.deductionPercent || 5}%</strong>
                </div>
                <div class="flex justify-between items-center bg-primary/10 p-2.5 rounded-xl border border-primary/20">
                  <span class="text-xs text-primary font-bold">Potongan Kode Referral</span>
                  <span class="font-headline-md text-base font-extrabold text-primary font-mono">-Rp ${(item.deductionAmount || 0).toLocaleString('id-ID')}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-text-body">Status</span>
                  <span class="font-bold ${
                    (String(item.status || '').toLowerCase() === 'success' || String(item.status || '').toLowerCase() === 'valid' || String(item.status || '').toLowerCase() === 'approved') 
                      ? 'text-secondary' 
                      : (String(item.status || '').toLowerCase() === 'pending' || !item.status) 
                      ? 'text-warning-amber' 
                      : 'text-error-ruby'
                  }">
                    ${
                      (String(item.status || '').toLowerCase() === 'success' || String(item.status || '').toLowerCase() === 'valid' || String(item.status || '').toLowerCase() === 'approved') 
                        ? 'Tercairkan & Selesai' 
                        : (String(item.status || '').toLowerCase() === 'pending' || !item.status) 
                        ? 'Dalam Antrean Verifikasi' 
                        : 'Dibatalkan'
                    }
                  </span>
                </div>
              </div>

              <div class="bg-primary/5 border border-primary/20 text-primary p-3 rounded-2xl flex items-start gap-2 text-left">
                <span class="material-symbols-outlined text-[18px] shrink-0 mt-0.5">info</span>
                <span class="text-[11px] leading-relaxed text-text-body">
                  Potongan ini berfungsi secara otomatis karena akun Anda terikat oleh akun lain melalui kode referral pada saat pendaftaran akun.
                </span>
              </div>
            </div>
          `,
          type: 'info',
          confirmText: 'Tutup'
        });
      });
    });
  }

  _bindProofLightbox(container) {
    // Tombol Lihat Bukti Transfer & Rincian
    container.querySelectorAll('[data-proof-history]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-proof-history');
        const w = this._walletService.getWithdrawals().find(item => item.id === id);
        if (w) {
          ReceiptHelper.openProofLightbox(w);
        }
      });
    });

    // Tombol Lihat Rincian Penolakan
    container.querySelectorAll('[data-reject-history]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-reject-history');
        const w = this._walletService.getWithdrawals().find(item => item.id === id);
        if (w) {
          ReceiptHelper.openRejectLightbox(w);
        }
      });
    });
  }

  mount(container) {
    const tabBtnSetoran = container.querySelector('#tabBtnSetoran');
    const tabBtnPenarikan = container.querySelector('#tabBtnPenarikan');
    const tabBtnReferral = container.querySelector('#tabBtnReferral');
    const contentSetoran = container.querySelector('#tabContentSetoran');
    const contentPenarikan = container.querySelector('#tabContentPenarikan');
    const contentReferral = container.querySelector('#tabContentReferral');

    const activeClass = 'flex-1 py-2.5 px-2 rounded-xl font-label-md text-xs font-bold transition-all duration-200 text-center bg-surface-card text-primary shadow-sm';
    const inactiveClass = 'flex-1 py-2.5 px-2 rounded-xl font-label-md text-xs font-bold transition-all duration-200 text-center text-on-surface-variant hover:text-on-surface';

    const switchTab = (target) => {
      this._activeTab = target;
      try {
        history.replaceState(null, '', `#/riwayat?tab=${target}`);
      } catch (e) {}

      if (tabBtnSetoran) tabBtnSetoran.className = target === 'setoran' ? activeClass : inactiveClass;
      if (tabBtnPenarikan) tabBtnPenarikan.className = target === 'penarikan' ? activeClass : inactiveClass;
      if (tabBtnReferral) tabBtnReferral.className = target === 'referral' ? activeClass : inactiveClass;

      if (contentSetoran) contentSetoran.classList.toggle('hidden', target !== 'setoran');
      if (contentPenarikan) contentPenarikan.classList.toggle('hidden', target !== 'penarikan');
      if (contentReferral) contentReferral.classList.toggle('hidden', target !== 'referral');
    };

    tabBtnSetoran?.addEventListener('click', () => switchTab('setoran'));
    tabBtnPenarikan?.addEventListener('click', () => switchTab('penarikan'));
    tabBtnReferral?.addEventListener('click', () => switchTab('referral'));

    this._bindProofLightbox(container);
    this._bindReferralDetailModal(container);

    // Auto-update daftar riwayat secara real-time saat ada setoran baru, penarikan, atau verifikasi dari admin
    this._unsubBalance = this._eventBus.on(AppEvents.BALANCE_UPDATED, () => {
      this._updateContentUI(container);
    });

    this._unsubTxLoaded = this._eventBus.on(AppEvents.TRANSACTIONS_LOADED, () => {
      this._updateContentUI(container);
    });

    this._unsubKey = this._eventBus.on(AppEvents.API_KEY_SUBMITTED, () => {
      this._updateContentUI(container);
    });

    this._unsubPayout = this._eventBus.on('PAYOUT_PROCESSED', () => {
      this._updateContentUI(container);
    });

    // Pemicu sinkronisasi data dari Supabase saat halaman riwayat dibuka
    if (this._walletService && typeof this._walletService.syncFromRemote === 'function') {
      this._walletService.syncFromRemote().then(() => {
        this._updateContentUI(container);
      }).catch(() => {});
    }

    this._storageHandler = (e) => {
      const user = this._authService.getCurrentUser();
      const userId = user ? user.id : null;
      if (!userId || !e.key) return;
      if (e.key === `transactions_${userId}` || e.key === `wallet_balance_${userId}` || e.key === `api_keys_${userId}`) {
        this._updateContentUI(container);
      }
    };
    window.addEventListener('storage', this._storageHandler);
  }

  destroy() {
    if (this._unsubBalance) {
      this._unsubBalance();
      this._unsubBalance = null;
    }
    if (this._unsubTxLoaded) {
      this._unsubTxLoaded();
      this._unsubTxLoaded = null;
    }
    if (this._unsubKey) {
      this._unsubKey();
      this._unsubKey = null;
    }
    if (this._unsubPayout) {
      this._unsubPayout();
      this._unsubPayout = null;
    }
    if (this._storageHandler) {
      window.removeEventListener('storage', this._storageHandler);
      this._storageHandler = null;
    }
  }
}
