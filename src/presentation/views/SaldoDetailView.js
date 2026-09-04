import { IComponent } from '../../core/interfaces/IComponent.js';

/**
 * SaldoDetailView
 * Prinsip: Single Responsibility Principle (SRP) & Liskov Substitution Principle (LSP)
 * Halaman rincian saldo dompet, target progress bar penarikan, dan histori penarikan terbaru.
 */
export class SaldoDetailView extends IComponent {
  /**
   * @param {import('../../core/container/ServiceContainer.js').ServiceContainer} container
   */
  constructor(container) {
    super();
    this._container = container;
    this._walletService = container.resolve('WalletService');
  }

  render() {
    const balance = this._walletService.getBalance();
    const lifetime = this._walletService.getLifetimeEarnings();
    const progress = this._walletService.getWithdrawalProgress();
    const minWithdrawal = this._walletService.minWithdrawal;
    const withdrawals = this._walletService.getWithdrawals().slice(0, 5);

    return `
      <div class="flex flex-col w-full min-h-screen bg-background pb-28 pt-20">
        <div class="px-margin-mobile max-w-md mx-auto w-full flex flex-col gap-5">
          
          <!-- Balance Summary Banner -->
          <section class="bg-primary text-on-primary rounded-3xl p-6 relative overflow-hidden shadow-xl">
            <div class="absolute -right-8 -top-8 w-32 h-32 bg-primary-fixed-dim/20 rounded-full blur-2xl"></div>
            <div class="absolute -left-12 -bottom-12 w-48 h-48 bg-tertiary-container/30 rounded-full blur-3xl"></div>

            <div class="relative z-10 flex flex-col gap-5">
              <div class="flex justify-between items-start">
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-semibold text-primary-fixed-dim uppercase tracking-wider">Saldo Tersedia</span>
                  <h2 class="text-3xl sm:text-4xl font-extrabold text-white">
                    Rp ${balance.toLocaleString('id-ID')}
                  </h2>
                </div>
                <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-primary-fixed">
                  <span class="material-symbols-outlined text-[22px]">account_balance_wallet</span>
                </div>
              </div>

              <div class="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 flex items-center gap-3 border border-white/10">
                <div class="w-8 h-8 rounded-full bg-secondary-fixed/20 flex items-center justify-center text-secondary-fixed shrink-0">
                  <span class="material-symbols-outlined text-[18px]">trending_up</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-[11px] text-white/70">Total Pendapatan (Lifetime)</span>
                  <span class="text-xs font-bold text-white">Rp ${lifetime.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Withdrawal Progress Bar Card -->
          <section class="bg-surface-card rounded-3xl p-5 shadow-sm border border-surface-container flex flex-col gap-3">
            <div class="flex justify-between items-end">
              <div class="flex flex-col">
                <span class="font-headline-md text-base font-bold text-text-heading">Target Penarikan</span>
                <span class="text-xs text-text-body">Batas Minimum: Rp ${minWithdrawal.toLocaleString('id-ID')}</span>
              </div>
              <span class="text-sm font-extrabold text-secondary">${progress.percentage}%</span>
            </div>

            <!-- Custom Progress Bar -->
            <div class="h-3.5 w-full bg-surface-container rounded-full overflow-hidden relative shadow-inner">
              <div
                class="absolute top-0 left-0 h-full bg-gradient-to-r from-secondary to-secondary-fixed rounded-full shadow-[0_0_10px_rgba(111,251,190,0.5)] transition-all duration-1000 ease-out"
                style="width: ${progress.percentage}%;"
              ></div>
            </div>

            <p class="text-xs text-text-body text-center font-medium mt-1">
              ${progress.isEligible 
                ? '🎉 Saldo Anda telah memenuhi batas minimal untuk ditarik!' 
                : `Rp ${progress.remaining.toLocaleString('id-ID')} lagi untuk dapat melakukan penarikan.`}
            </p>

            <a
              href="#/tarik"
              class="w-full mt-2 py-3.5 rounded-2xl font-label-md text-sm font-bold uppercase tracking-wider text-center transition-all ${progress.isEligible 
                ? 'bg-secondary text-white shadow-lg shadow-secondary/25 hover:opacity-95 active:scale-[0.98]' 
                : 'bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary-container'}"
            >
              ${progress.isEligible ? 'Tarik Saldo Sekarang' : 'Buka Menu Penarikan'}
            </a>
          </section>

          <!-- Recent Withdrawals List -->
          <section class="flex flex-col gap-3">
            <div class="flex justify-between items-center px-1">
              <h3 class="font-headline-md text-base font-bold text-text-heading">Riwayat Penarikan Terakhir</h3>
              <a href="#/riwayat" class="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                <span>Lihat Semua</span>
                <span class="material-symbols-outlined text-[16px]">chevron_right</span>
              </a>
            </div>

            <div class="flex flex-col gap-2">
              ${withdrawals.length === 0 ? `
                <div class="bg-surface-card rounded-2xl p-6 text-center text-outline">
                  <p class="text-xs">Belum ada riwayat penarikan dana.</p>
                </div>
              ` : withdrawals.map(w => {
                const dateStr = new Date(w.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                return `
                  <div class="bg-surface-card border border-surface-container rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary relative">
                        <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">account_balance</span>
                        <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-secondary rounded-full flex items-center justify-center text-white border-2 border-surface-card">
                          <span class="material-symbols-outlined text-[10px] font-bold">check</span>
                        </div>
                      </div>
                      <div class="flex flex-col">
                        <span class="font-label-md text-xs font-bold text-text-heading">${w.title}</span>
                        <span class="text-[11px] text-text-body">${dateStr}</span>
                      </div>
                    </div>
                    <div class="flex flex-col items-end">
                      <span class="font-headline-md text-xs font-bold text-text-heading">- Rp ${w.amount.toLocaleString('id-ID')}</span>
                      <span class="px-2 py-0.5 bg-secondary/10 text-secondary rounded-md text-[10px] font-bold mt-0.5">Berhasil</span>
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
    // Rendered reactively via router
  }
}
